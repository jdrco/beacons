import json
import uuid
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict
from jose import jwt
from app.models.user import User
from app.core.config import settings

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import SessionLocal
from app.models.occupancy import RoomOccupancy, RoomCount, ActivityEvent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_ids: Dict[WebSocket, str] = {}
        self.usernames: Dict[WebSocket, str] = {}
        # Keep in-memory activity feed for connectivity events that don't go to DB
        self.activity_feed = []
        
    def _get_db(self):
        db = SessionLocal()
        try:
            return db
        finally:
            db.close()
            
    def _clean_old_events(self):
        """Remove events older than 24 hours from memory (REQ-7)"""
        now = datetime.now()
        cutoff = now - timedelta(hours=24)
        self.activity_feed = [
            event for event in self.activity_feed 
            if datetime.fromisoformat(event["timestamp"]) > cutoff
        ]
        
        # Also clean up old events in database
        db = self._get_db()
        try:
            # Delete old events from the database
            db.query(ActivityEvent).filter(
                ActivityEvent.timestamp < cutoff
            ).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning old events: {e}")
        finally:
            db.close()
            
    def _get_activity_feed(self, db: Session, limit: int = 100):
        """Get combined activity feed from memory and database, sorted by newest first (REQ-8)"""
        now = datetime.now()
        cutoff = now - timedelta(hours=24)
        
        # Get events from database (check-ins and check-outs)
        db_events = db.query(ActivityEvent).filter(
            ActivityEvent.timestamp > cutoff
        ).order_by(desc(ActivityEvent.timestamp)).all()
        
        # Convert to dictionaries for JSON serialization
        db_events_dict = [
            {
                "type": event.type,
                "user_id": event.user_id,
                "username": event.username,
                "room_name": event.room_name,
                "study_topic": event.study_topic,
                "timestamp": event.timestamp.isoformat(),
                "expiry_time": event.expiry_time.isoformat() if event.expiry_time else None,
                "message": event.message
            }
            for event in db_events
        ]
        
        # Combine with in-memory events (connections and disconnections)
        combined_events = db_events_dict + self.activity_feed
        
        # Sort by timestamp with newest first
        combined_events.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Return limited number of events
        return combined_events[:limit]
        
    def _get_current_checkins(self, db: Session):
        """Get all active check-ins from database"""
        now = datetime.now()
        
        checkins = db.query(RoomOccupancy).filter(
            RoomOccupancy.is_active == True,
            RoomOccupancy.expiry_time > now
        ).all()
        
        # Convert to dictionaries for JSON serialization
        return [
            {
                "user_id": checkin.user_id,
                "username": checkin.username,
                "room_name": checkin.room_name,
                "study_topic": checkin.study_topic,
                "checkin_time": checkin.checkin_time.isoformat(),
                "expiry_time": checkin.expiry_time.isoformat()
            }
            for checkin in checkins
        ]
        
    def _increment_room_count(self, db: Session, room_name: str):
        """Increment the occupant count for a room"""
        room_count = db.query(RoomCount).filter(RoomCount.room_name == room_name).first()
        
        if room_count:
            room_count.occupant_count += 1
            room_count.last_updated = datetime.now()
        else:
            room_count = RoomCount(room_name=room_name, occupant_count=1, last_updated=datetime.now())
            db.add(room_count)
        
        return room_count.occupant_count
    
    def _decrement_room_count(self, db: Session, room_name: str):
        """Decrement the occupant count for a room"""
        room_count = db.query(RoomCount).filter(RoomCount.room_name == room_name).first()
        
        if room_count:
            # Prevent negative counts
            if room_count.occupant_count > 0:
                room_count.occupant_count -= 1
            room_count.last_updated = datetime.now()
            return room_count.occupant_count
        else:
            # Room not found, add it with count 0
            room_count = RoomCount(room_name=room_name, occupant_count=0, last_updated=datetime.now())
            db.add(room_count)
            return 0

    def _get_all_room_occupancy(self, db: Session):
        """Get all room occupancy counts from database"""
        room_counts = db.query(RoomCount).all()
        
        # Convert to dictionary for JSON serialization
        return {
            room_count.room_name: room_count.occupant_count
            for room_count in room_counts
        }

    async def connect(self, websocket: WebSocket, username: str = None, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Use provided user_id from authentication if available, otherwise generate a UUID
        if user_id:
            self.user_ids[websocket] = user_id
        else:
            # Generate a user ID for this connection (only for unauthenticated connections)
            self.user_ids[websocket] = str(uuid.uuid4())
        
        # Store username if provided
        if username:
            self.usernames[websocket] = username

        # Create connection event with user_id (only in memory, not in DB)
        connection_event = {
            "type": "connection",
            "user_id": self.user_ids[websocket],
            "username": username,
            "timestamp": datetime.now().isoformat(),
            "message": f"User {username or self.user_ids[websocket]} has joined the feed!"
        }
        
        # Clean old events before adding new ones
        self._clean_old_events()
        
        # Add to in-memory activity feed
        self.activity_feed.append(connection_event)
        
        # Send connection event to all clients
        await self.broadcast(connection_event)

        # Get full activity feed (DB + memory) and current check-ins
        db = self._get_db()
        try:
            activity_feed = self._get_activity_feed(db)
            current_checkins = self._get_current_checkins(db)
            
            # Get all room occupancy data
            occupancy_data = self._get_all_room_occupancy(db)
            
            # Send activity feed history to the new client, including their user_id
            await websocket.send_json({
                "type": "history",
                "feed": activity_feed,
                "user_id": self.user_ids[websocket],
                "username": username,
                "current_checkins": current_checkins,
                "occupancy_data": occupancy_data  # Include occupancy data in history message
            })
        except Exception as e:
            logger.error(f"Error retrieving activity feed: {e}")
        finally:
            db.close()

    def disconnect(self, websocket: WebSocket):
        user_id = self.user_ids.get(websocket, "Unknown")
        username = self.usernames.get(websocket, None)

        # Users will remain checked in even if they disconnect
        # No automatic checkout on disconnect

        # Create disconnection event (only in memory, not in DB)
        disconnection_event = {
            "type": "disconnection",
            "user_id": user_id,
            "username": username,
            "timestamp": datetime.now().isoformat(),
            "message": f"User {username or user_id} has left the feed."
        }

        # Clean old events
        self._clean_old_events()
        
        # Add to in-memory activity feed
        self.activity_feed.append(disconnection_event)

        # Remove from active connections
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            del self.user_ids[websocket]
            if websocket in self.usernames:
                del self.usernames[websocket]

        # Return the disconnection event
        return disconnection_event

    async def handle_checkin(self, websocket: WebSocket, data):
        """Handle a check-in event"""
        user_id = self.user_ids.get(websocket, None)
        username = self.usernames.get(websocket, None) or data.get("username")
        room_name = data.get("room_name")
        study_topic = data.get("study_topic")
        
        if not user_id or not room_name:
            await websocket.send_json({
                "type": "error",
                "message": "Missing user_id or room_name for check-in"
            })
            return
        
        db = self._get_db()
        try:
            # Convert user_id to string to ensure compatibility
            user_id_str = str(user_id)
            
            # Check if user is already checked in somewhere (REQ-4)
            existing_checkin = db.query(RoomOccupancy).filter(
                RoomOccupancy.user_id == user_id_str,
                RoomOccupancy.is_active == True
            ).first()
            
            already_checked_in = False
            if existing_checkin:
                already_checked_in = True
                old_room = existing_checkin.room_name
                
                # If checking into the same room, don't create duplicate events
                if existing_checkin.room_name == room_name:
                    await websocket.send_json({
                        "type": "info",
                        "message": f"You are already checked into {room_name}"
                    })
                    db.close()
                    return
                    
                # Auto check-out from previous room
                await self.handle_checkout(websocket, {
                    "room_name": existing_checkin.room_name,
                    "auto": True
                })
            
            # Record the check-in in the database
            checkin_time = datetime.now()
            expiry_time = checkin_time + timedelta(hours=4)  # 4-hour expiry (REQ-5)
            
            # Create new check-in record
            new_checkin = RoomOccupancy(
                user_id=user_id_str,
                room_name=room_name,
                study_topic=study_topic,
                checkin_time=checkin_time,
                expiry_time=expiry_time,
                is_active=True,
                username=username
            )
            db.add(new_checkin)
            
            # Increment room occupancy count
            new_count = self._increment_room_count(db, room_name)
            
            # Create and store check-in event
            message = f"@{username or user_id} started studying"
            if study_topic:
                message += f" {study_topic}"
            message += f" at {room_name}"
            
            new_event = ActivityEvent(
                type="checkin",
                user_id=user_id_str,
                username=username,
                room_name=room_name,
                study_topic=study_topic,
                timestamp=checkin_time,
                expiry_time=expiry_time,
                message=message
            )
            db.add(new_event)
            db.commit()
            
            # Create check-in event for broadcasting
            checkin_event = {
                "type": "checkin",
                "user_id": user_id_str,
                "username": username,
                "room_name": room_name,
                "study_topic": study_topic,
                "timestamp": checkin_time.isoformat(),
                "expiry_time": expiry_time.isoformat(),
                "message": message,
                "current_occupancy": new_count  # Include current occupancy count
            }
            
            # Broadcast to all clients
            await self.broadcast(checkin_event)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during check-in: {e}")
            await websocket.send_json({
                "type": "error",
                "message": f"Error processing check-in: {str(e)}"
            })
        finally:
            db.close()

    async def handle_checkout(self, websocket: WebSocket, data):
        """Handle a check-out event"""
        user_id = self.user_ids.get(websocket, None)
        username = self.usernames.get(websocket, None)
        room_name = data.get("room_name")
        auto_checkout = data.get("auto", False)
        
        if not user_id:
            if not auto_checkout:  # Only send error for manual checkouts
                await websocket.send_json({
                    "type": "error",
                    "message": "User ID not found"
                })
            return
            
        db = self._get_db()
        try:
            # Convert user_id to string to ensure compatibility
            user_id_str = str(user_id)
            
            # Find the active check-in for this user
            active_checkin = db.query(RoomOccupancy).filter(
                RoomOccupancy.user_id == user_id_str,
                RoomOccupancy.is_active == True
            ).first()
            
            if not active_checkin:
                if not auto_checkout:  # Only send error for manual checkouts
                    await websocket.send_json({
                        "type": "error",
                        "message": "You are not checked in to any room"
                    })
                db.close()
                return
            
            # Use the room from the database if room_name not specified
            if not room_name:
                room_name = active_checkin.room_name
            
            # Verify the room matches if provided
            if room_name and room_name != active_checkin.room_name:
                await websocket.send_json({
                    "type": "error",
                    "message": f"You are not checked into {room_name}, but into {active_checkin.room_name}"
                })
                db.close()
                return
                
            # Store room_name for use after DB update
            checkout_room_name = active_checkin.room_name
                
            # Set check-in as inactive
            active_checkin.is_active = False
            
            # Decrement room occupancy count
            new_count = self._decrement_room_count(db, checkout_room_name)
            
            # Create and store check-out event
            checkout_time = datetime.now()
            message = f"@{username or user_id} has checked out from {checkout_room_name}"
            
            new_event = ActivityEvent(
                type="checkout",
                user_id=user_id_str,
                username=username,
                room_name=checkout_room_name,
                timestamp=checkout_time,
                message=message
            )
            db.add(new_event)
            db.commit()
            
            # Create check-out event for broadcasting
            checkout_event = {
                "type": "checkout",
                "user_id": user_id_str,
                "username": username,
                "room_name": checkout_room_name,
                "timestamp": checkout_time.isoformat(),
                "message": message,
                "current_occupancy": new_count  # Include current occupancy count
            }
            
            # Broadcast to all clients
            await self.broadcast(checkout_event)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during check-out: {e}")
            if not auto_checkout:  # Only send error for manual checkouts
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing check-out: {str(e)}"
                })
        finally:
            db.close()

    async def expire_checkins(self):
        """Check for and expire check-ins older than 4 hours"""
        now = datetime.now()
        db = self._get_db()
        
        try:
            # Find expired check-ins
            expired_checkins = db.query(RoomOccupancy).filter(
                RoomOccupancy.is_active == True,
                RoomOccupancy.expiry_time < now
            ).all()
            
            # Process each expired check-in
            for checkin in expired_checkins:
                # Mark as inactive
                checkin.is_active = False
                
                # Decrement room occupancy count
                new_count = self._decrement_room_count(db, checkin.room_name)
                
                # Create expiry event
                message = f"@{checkin.username or checkin.user_id}'s check-in at {checkin.room_name} has expired"
                
                new_event = ActivityEvent(
                    type="checkout",
                    user_id=checkin.user_id,
                    username=checkin.username,
                    room_name=checkin.room_name,
                    timestamp=now,
                    message=message
                )
                db.add(new_event)
                
                # Create expiry event for broadcasting
                expiry_event = {
                    "type": "checkout",
                    "user_id": checkin.user_id,
                    "username": checkin.username,
                    "room_name": checkin.room_name,
                    "timestamp": now.isoformat(),
                    "message": message,
                    "current_occupancy": new_count  # Include current occupancy count
                }
                
                # Broadcast to all clients
                await self.broadcast(expiry_event)
                
            db.commit()
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during check-in expiration: {e}")
        finally:
            db.close()

    async def broadcast(self, message):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients after iteration
        for conn in disconnected:
            disconnect_event = self.disconnect(conn)
            await self.broadcast(disconnect_event)

# Create a singleton instance of the connection manager
manager = ConnectionManager()

async def run_expiry_checker():
    """Run once to expire check-ins (for scheduler)"""
    try:
        await manager.expire_checkins()
    except Exception as e:
        logger.error(f"Error in expiry checker: {e}")
        
        
# For direct use with websocket, creates long-running task
async def run_expiry_checker_task():
    """Run a periodic check for expired check-ins"""
    try:
        while True:
            # Check every minute for expired check-ins
            await asyncio.sleep(60)
            await manager.expire_checkins()
    except asyncio.CancelledError:
        # Task was cancelled, exit gracefully
        pass
    except Exception as e:
        logger.error(f"Error in expiry checker: {e}")

async def websocket_endpoint(websocket: WebSocket):
    # Extract the authentication token from the cookie header
    cookies_header = websocket.headers.get('cookie', '')
    token = None
    
    # Parse cookies to find access_token
    if cookies_header:
        for cookie in cookies_header.split('; '):
            if cookie.startswith('access_token='):
                token = cookie.split('=', 1)[1]
                break
    
    # Get the authenticated user
    db = SessionLocal()
    try:
        user = None
        if token:
            try:
                payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
                email = payload.get("sub")
                if email:
                    user = db.query(User).filter(User.email == email).first()
            except Exception as e:
                logger.error(f"Authentication error: {e}")
        
        # If user is not authenticated, reject the connection
        if not user:
            await websocket.close(code=1008, reason="Unauthorized")
            return
            
        # Connect with the authenticated user info
        await manager.connect(websocket, username=user.username, user_id=str(user.id))
        
        # Set up a task to expire check-ins
        expiry_task = asyncio.create_task(run_expiry_checker_task())
        
        try:
            while True:
                # Wait for messages from the client
                data_str = await websocket.receive_text()
                
                # Skip ping messages used to keep connection alive
                if data_str == "ping":
                    continue
                    
                try:
                    # Parse the message as JSON
                    data = json.loads(data_str)
                    message_type = data.get("type")
                    
                    if message_type == "checkin":
                        await manager.handle_checkin(websocket, data)
                    elif message_type == "checkout":
                        await manager.handle_checkout(websocket, data)
                    elif message_type == "setUsername":
                        # Update the username for this connection
                        user_id = manager.user_ids.get(websocket)
                        username = data.get("username")
                        manager.usernames[websocket] = username
                        
                        # Update any existing check-in in the database
                        db = manager._get_db()
                        try:
                            active_checkin = db.query(RoomOccupancy).filter(
                                RoomOccupancy.user_id == user_id,
                                RoomOccupancy.is_active == True
                            ).first()
                            
                            if active_checkin:
                                active_checkin.username = username
                                db.commit()
                        except Exception as e:
                            db.rollback()
                            logger.error(f"Error updating username: {e}")
                        finally:
                            db.close()
                except json.JSONDecodeError:
                    # Not JSON, treat as ping/keepalive
                    pass
                    
        except WebSocketDisconnect:
            # Clean up and notify other clients
            disconnect_event = manager.disconnect(websocket)
            await manager.broadcast(disconnect_event)
            # Cancel the expiry task
            expiry_task.cancel()
        except Exception as e:
            logger.error(f"Error in websocket endpoint: {e}")
            # Make sure to clean up the task
            try:
                expiry_task.cancel()
            except:
                pass
    finally:
        db.close()