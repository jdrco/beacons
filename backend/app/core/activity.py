import json
import uuid
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict

from fastapi import WebSocket, WebSocketDisconnect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_ids: Dict[WebSocket, str] = {}
        self.usernames: Dict[WebSocket, str] = {}
        self.activity_feed = []
        self.user_checkins: Dict[str, Dict] = {}  # Track user check-ins by user_id
        
        # Limit feed history to last 24 hours (REQ-7)
        self._clean_old_events()

    def _clean_old_events(self):
        """Remove events older than 24 hours"""
        now = datetime.now()
        cutoff = now - timedelta(hours=24)
        self.activity_feed = [
            event for event in self.activity_feed 
            if datetime.fromisoformat(event["timestamp"]) > cutoff
        ]

    async def connect(self, websocket: WebSocket, username: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Generate a user ID for this connection
        user_id = str(uuid.uuid4())[:8]
        self.user_ids[websocket] = user_id
        
        # Store username if provided
        if username:
            self.usernames[websocket] = username

        # Create connection event with user_id
        connection_event = {
            "type": "connection",
            "user_id": user_id,
            "username": username,
            "timestamp": datetime.now().isoformat(),
            "message": f"User {username or user_id} has joined the feed!"
        }

        # Clean old events before adding new ones
        self._clean_old_events()
        
        # Add to activity feed
        self.activity_feed.append(connection_event)

        # Send connection event to all clients, including the newly connected one
        await self.broadcast(connection_event)

        # Send activity feed history to the new client, including their user_id
        await websocket.send_json({
            "type": "history",
            "feed": self.activity_feed,
            "user_id": user_id,
            "username": username,
            "current_checkins": list(self.user_checkins.values())  # Send current check-ins
        })

    def disconnect(self, websocket: WebSocket):
        user_id = self.user_ids.get(websocket, "Unknown")
        username = self.usernames.get(websocket, None)

        # Users will remain checked in even if they disconnect
        # No automatic checkout on disconnect

        # Create disconnection event
        disconnection_event = {
            "type": "disconnection",
            "user_id": user_id,
            "username": username,
            "timestamp": datetime.now().isoformat(),
            "message": f"User {username or user_id} has left the feed."
        }

        # Clean old events
        self._clean_old_events()
        
        # Add to activity feed
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
        room_id = data.get("room_id")
        room_name = data.get("room_name")
        study_topic = data.get("study_topic")
        
        if not user_id or not room_id:
            await websocket.send_json({
                "type": "error",
                "message": "Missing user_id or room_id for check-in"
            })
            return
            
        # Check if user is already checked in somewhere (REQ-4)
        already_checked_in = False
        if user_id in self.user_checkins:
            already_checked_in = True
            old_room = self.user_checkins[user_id]["room_name"]
            # If checking into the same room, don't create duplicate events
            if self.user_checkins[user_id]["room_id"] == room_id:
                await websocket.send_json({
                    "type": "info",
                    "message": f"You are already checked into {room_name}"
                })
                return
                
            # Auto check-out from previous room
            await self.handle_checkout(websocket, {
                "room_id": self.user_checkins[user_id]["room_id"],
                "auto": True
            })
        
        # Record the check-in
        checkin_time = datetime.now()
        expiry_time = checkin_time + timedelta(hours=4)  # 4-hour expiry (REQ-5)
        
        self.user_checkins[user_id] = {
            "user_id": user_id,
            "username": username,
            "room_id": room_id,
            "room_name": room_name,
            "study_topic": study_topic,
            "checkin_time": checkin_time.isoformat(),
            "expiry_time": expiry_time.isoformat()
        }
        
        # Create and broadcast check-in event
        message = f"@{username or user_id} started studying"
        if study_topic:
            message += f" {study_topic}"
        message += f" at {room_name}"
        
        checkin_event = {
            "type": "checkin",
            "user_id": user_id,
            "username": username,
            "room_id": room_id,
            "room_name": room_name,
            "study_topic": study_topic,
            "timestamp": checkin_time.isoformat(),
            "expiry_time": expiry_time.isoformat(),
            "message": message
        }
        
        # Clean old events
        self._clean_old_events()
        
        # Add to activity feed
        self.activity_feed.append(checkin_event)
        
        # Broadcast to all clients
        await self.broadcast(checkin_event)

    async def handle_checkout(self, websocket: WebSocket, data):
        """Handle a check-out event"""
        user_id = self.user_ids.get(websocket, None)
        username = self.usernames.get(websocket, None)
        auto_checkout = data.get("auto", False)
        
        if not user_id or user_id not in self.user_checkins:
            if not auto_checkout:  # Only send error for manual checkouts
                await websocket.send_json({
                    "type": "error",
                    "message": "You are not checked in to any room"
                })
            return
        
        # Get room info before removing check-in
        room_data = self.user_checkins[user_id].copy()
        del self.user_checkins[user_id]
        
        # Create and broadcast check-out event
        checkout_event = {
            "type": "checkout",
            "user_id": user_id,
            "username": username,
            "room_id": room_data["room_id"],
            "room_name": room_data["room_name"],
            "timestamp": datetime.now().isoformat(),
            "message": f"@{username or user_id} has checked out from {room_data['room_name']}"
        }
        
        # Clean old events
        self._clean_old_events()
        
        # Add to activity feed
        self.activity_feed.append(checkout_event)
        
        # Broadcast to all clients
        await self.broadcast(checkout_event)

    async def expire_checkins(self):
        """Check for and expire check-ins older than 4 hours"""
        now = datetime.now()
        expired_users = []
        
        for user_id, checkin_data in self.user_checkins.items():
            expiry_time = datetime.fromisoformat(checkin_data["expiry_time"])
            if now > expiry_time:
                expired_users.append(user_id)
        
        # Process expirations
        for user_id in expired_users:
            room_data = self.user_checkins[user_id].copy()
            username = room_data.get("username")
            del self.user_checkins[user_id]
            
            # Create expiry event
            expiry_event = {
                "type": "checkout",
                "user_id": user_id,
                "username": username,
                "room_id": room_data["room_id"],
                "room_name": room_data["room_name"],
                "timestamp": now.isoformat(),
                "message": f"@{username or user_id}'s check-in at {room_data['room_name']} has expired"
            }
            
            # Add to activity feed
            self.activity_feed.append(expiry_event)
            
            # Broadcast to all clients
            await self.broadcast(expiry_event)

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

        # Sort activity feed by most recent timestamp (REQ-8)
        self.activity_feed.sort(key=lambda x: x["timestamp"], reverse=True)

# Create a singleton instance of the connection manager
manager = ConnectionManager()

async def run_expiry_checker(websocket: WebSocket):
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

# Create a websocket endpoint handler that can be imported in main.py
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Set up a task to expire check-ins
    expiry_task = asyncio.create_task(run_expiry_checker(websocket))
    
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
                    manager.usernames[websocket] = data.get("username")
                    # Update any existing check-in
                    if user_id in manager.user_checkins:
                        manager.user_checkins[user_id]["username"] = data.get("username")
            except json.JSONDecodeError:
                # Not JSON, treat as ping/keepalive
                pass
                
    except WebSocketDisconnect:
        # Clean up and notify other clients
        disconnect_event = manager.disconnect(websocket)
        await manager.broadcast(disconnect_event)
        # Cancel the expiry task
        expiry_task.cancel()