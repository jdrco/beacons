import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import FastMail, MessageSchema
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.core.auth import get_active_user, router as auth_router
from app.models.occupancy import ActivityEvent, RoomOccupancy, RoomCount
from app.core.activity import get_edmonton_time
from app.routes.user import router as user_router
from app.routes.occupancy import router as occupancy_router
from app.routes.demographics import router as demographics_router
from app.utils.response import success_response, error_response
from app.models.user import User
from app.core.database import get_db
from app.models.building import Room, RoomSchedule, SingleEventSchedule, UserFavoriteRoom
from app.core.auth import conf
from app.core.activity import websocket_endpoint, run_expiry_checker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the regular scheduler for room availability check
    scheduler.add_job(scheduled_task, 'interval', seconds=300)
    
    # Add the check-in expiry task to the scheduler
    scheduler.add_job(run_expiry_checker, 'interval', seconds=60)
    
    # REQ-7: Clean old activity data (run once per hour)
    scheduler.add_job(clean_old_activity_data, 'interval', seconds=3600)
    
    scheduler.start()
    logger.info("Scheduler started.")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="Beacons API",
    description="API for Beacons application",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, tags=["auth"])
app.include_router(user_router, tags=["user"])
app.include_router(demographics_router, prefix="/rooms", tags=["rooms"])
app.include_router(occupancy_router, prefix="/api", tags=["occupancy"])

# Add the WebSocket endpoint using the imported handler
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/public_health", tags=["health"])
async def public_health_check():
    return success_response(200, True, "Public health check.")

@app.get("/private_health", tags=["health"])
async def private_health_check(
    current_user: User = Depends(get_active_user)):
    if not current_user:
        return error_response(401, False, "Unauthorized. Please log in.")
    return success_response(200, True, "Private health check.")

async def send_email(subject: str, email_to: str, body: str):
    """
    4.6 Notifications
    REQ-1: The system shall send notifications to users when their favourite rooms become available, including the room name and building location in the notification content.
    """
    try:
        message = MessageSchema(
            subject=subject,
            recipients=[email_to],
            body=body,
            subtype="html"
        )
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        logger.error(f"Error sending email to {email_to}: {e}")

def check_available_rooms(db: Session):
    """
    4.6 Notifications
    REQ-3: The system shall verify and respect device-level notification permissions before attempting to send any notifications.
    """
    now = datetime.now()
    five_minutes_ago = now - timedelta(minutes=5)

    weekday_map = {
        0: 'M',  # Monday
        1: 'T',  # Tuesday
        2: 'W',  # Wednesday
        3: 'R',  # Thursday
        4: 'F',  # Friday
        5: 'S',  # Saturday
        6: 'U'   # Sunday
    }

    current_day_abbreviation = weekday_map[now.weekday()]

    try:
        available_rooms = db.query(Room).join(RoomSchedule).filter(
            RoomSchedule.occupied == False,
            RoomSchedule.day == current_day_abbreviation,
            RoomSchedule.start_time >= five_minutes_ago.time(),
            RoomSchedule.start_time <= now.time()
        ).all()

        available_rooms += db.query(Room).join(SingleEventSchedule).filter(
            SingleEventSchedule.start_time >= five_minutes_ago,
            SingleEventSchedule.start_time <= now
        ).all()

        filtered_rooms = []
        for room in available_rooms:

            favorites = db.query(UserFavoriteRoom).filter(
                UserFavoriteRoom.room_id == room.id,
                UserFavoriteRoom.notification_sent == True
            ).all()

            if favorites:
                filtered_rooms.append((room, favorites))

        return filtered_rooms

    except Exception as e:
        logger.error(f"Error checking available rooms: {e}")

async def scheduled_task():
    """
    4.6 Notifications
    REQ-1: The system shall send notifications to users when their favourite rooms become available, including the room name and building location in the notification content.
    """
    logger.info(f"Scheduled task triggered at {datetime.now()}")
    db = next(get_db())

    try:
        available_rooms = check_available_rooms(db)

        if available_rooms:
            logger.info(f"Found {len(available_rooms)} available rooms. Sending notifications...")

            user_notifications = defaultdict(list)
            for room, favorites in available_rooms:
                for favorite in favorites:
                    user_notifications[favorite.user.email].append(room.name)

            for user_email, room_names in user_notifications.items():
                room_list_html = "".join([f"<li>{room}</li>" for room in room_names])
                subject = "Available Room Notifications"
                body = f"""
                <html>
                <body>
                    <h1>Available Rooms Notification</h1>
                    <p>The following rooms are now available:</p>
                    <ul>
                        {room_list_html}
                    </ul>
                    <p>Please book them quickly!</p>
                </body>
                </html>
                """
                try:
                    await send_email(subject, user_email, body)
                    logger.info(f"Notification sent successfully to {user_email} for rooms: {', '.join(room_names)}")
                except Exception as e:
                    logger.error(f"Failed to send notification to {user_email}: {e}")
        else:
            logger.info("No available rooms found to notify users.")

    except Exception as e:
        logger.error(f"Error during scheduled task: {e}")

    finally:
        db.close()

    logger.info(f"Scheduled task completed at {datetime.now()}")

async def clean_old_activity_data():
    """
    REQ-7: Limit the social media feed history to last 24 hours
    """
    logger.info("Cleaning old activity data...")
    db = next(get_db())
    try:
        
        now = get_edmonton_time()
        cutoff = now - timedelta(hours=24)
        
        # Delete old events from the database
        deleted_events = db.query(ActivityEvent).filter(
            ActivityEvent.timestamp < cutoff.replace(tzinfo=None)
        ).delete(synchronize_session=False)
        
        # Mark all check-ins older than 24 hours as inactive
        expired_checkins = db.query(RoomOccupancy).filter(
            RoomOccupancy.checkin_time < cutoff.replace(tzinfo=None),
            RoomOccupancy.is_active == True
        ).all()
        
        for checkin in expired_checkins:
            checkin.is_active = False
            
        # Reset room counts for rooms with expired check-ins
        rooms_to_reset = set(checkin.room_name for checkin in expired_checkins)
        for room_name in rooms_to_reset:
            # Get current active check-ins count for this room
            active_count = db.query(RoomOccupancy).filter(
                RoomOccupancy.room_name == room_name,
                RoomOccupancy.is_active == True
            ).count()
            
            # Update room count to match actual active check-ins
            room_count = db.query(RoomCount).filter(RoomCount.room_name == room_name).first()
            if room_count:
                room_count.occupant_count = active_count
                room_count.last_updated = now.replace(tzinfo=None)
                logger.info(f"Updated count for room {room_name} to {active_count}")
        
        # Delete old inactive check-ins
        deleted_checkins = db.query(RoomOccupancy).filter(
            RoomOccupancy.checkin_time < cutoff.replace(tzinfo=None),
            RoomOccupancy.is_active == False
        ).delete(synchronize_session=False)
        
        db.commit()
        logger.info(f"Cleaned {deleted_events} old activity events, marked {len(expired_checkins)} check-ins as inactive, and deleted {deleted_checkins} old inactive check-ins")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error cleaning old activity data: {e}")
    finally:
        db.close()
