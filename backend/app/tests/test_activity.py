import asyncio
import json
from datetime import datetime, timedelta, timezone
import pytz
import uuid
import pytest

from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt

# Import the module under test and models
from app.core import activity
from app.models.occupancy import RoomOccupancy, RoomCount, ActivityEvent
from app.models.user import User
from app.core.config import settings


# -------------------------------------------------------------------
# Helpers / Fakes for Testing
# -------------------------------------------------------------------

class FakeWebSocket:
    def __init__(self, headers=None):
        self.sent_messages = []
        self.headers = headers or {}
        self._recv_messages = []
        self.closed = False

    async def accept(self):
        self.sent_messages.append("accepted")

    async def send_json(self, message):
        self.sent_messages.append(message)

    async def receive_text(self):
        if self._recv_messages:
            return self._recv_messages.pop(0)
        raise WebSocketDisconnect("No more messages")

    def queue_message(self, message):
        self._recv_messages.append(message)

    async def close(self, code=1000, reason=""):
        self.closed = True
        self.sent_messages.append({"close": (code, reason)})


class FakeQuery:
    def __init__(self, items):
        self.items = items

    def filter(self, *args, **kwargs):
        return self

    def delete(self, synchronize_session=False):
        return 1

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self.items

    def first(self):
        return self.items[0] if self.items else None


class FakeDB:
    def __init__(self):
        self.committed = False
        self.rolled_back = False
        self.added = []
        self.queries = {}

    def query(self, model):
        # Return a FakeQuery based on preset behavior for the model.
        return self.queries.get(model, FakeQuery([]))

    def add(self, item):
        self.added.append(item)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


# Create a fixture that returns a fresh ConnectionManager
@pytest.fixture
def manager():
    return activity.ConnectionManager()


# -------------------------------------------------------------------
# Tests for synchronous helper functions
# -------------------------------------------------------------------

def test_get_edmonton_time():
    etime = activity.get_edmonton_time()
    # Check that the returned datetime is timezone‐aware.
    assert etime.tzinfo is not None
    # Optionally, check that the timezone corresponds to Edmonton (its tzname in MST/MDT)
    assert "MST" in etime.tzname() or "MDT" in etime.tzname()


def test_clean_old_events_removes_old_events(monkeypatch, manager):
    from app.core.activity import EDMONTON_TZ  # use the same timezone used in the module

    # Fix "now" to a controlled datetime.
    fixed_now = datetime(2025, 4, 10, 0, 0, 0, tzinfo=EDMONTON_TZ)
    monkeypatch.setattr(activity, "get_edmonton_time", lambda: fixed_now)
    
    # Now create an "old" event (25 hours ago) and a "recent" event (1 hour ago).
    old_time = (fixed_now - timedelta(hours=25)).isoformat()
    recent_time = (fixed_now - timedelta(hours=1)).isoformat()
    
    manager.activity_feed = [
        {"timestamp": old_time, "type": "connection", "user_id": "1"},
        {"timestamp": recent_time, "type": "connection", "user_id": "2"},
    ]
    
    # Create a fake DB that commits properly.
    fake_db = FakeDB()
    fake_db.queries[ActivityEvent] = FakeQuery([])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)
    
    # When _clean_old_events() is invoked, the cutoff will be fixed.
    manager._clean_old_events()
    
    # The old event (older than 24 hours) should be removed.
    assert len(manager.activity_feed) == 1
    assert manager.activity_feed[0]["user_id"] == "2"


def test_clean_old_events_exception(monkeypatch, manager):
    manager.activity_feed = []
    fake_db = FakeDB()

    # Make fake_db.query raise an exception.
    def fake_query(model):
        raise Exception("Test exception")
    fake_db.query = fake_query
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    # _clean_old_events should handle the exception (and call rollback).
    manager._clean_old_events()
    assert fake_db.rolled_back is True


def test_get_activity_feed(monkeypatch, manager):
    now = activity.get_edmonton_time()
    event_time = now - timedelta(hours=1)
    fake_event = ActivityEvent(
        type="checkin",
        user_id="123",
        username="user",
        room_name="TestRoom",
        study_topic="Math",
        timestamp=event_time.replace(tzinfo=None),
        expiry_time=(event_time + timedelta(hours=4)).replace(tzinfo=None),
        message="Test Message",
    )
    fake_db = FakeDB()
    fake_db.queries[ActivityEvent] = FakeQuery([fake_event])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    # Also add an in‑memory event.
    in_memory_event = {
        "type": "connection",
        "user_id": "456",
        "username": "connUser",
        "timestamp": now.isoformat(),
        "message": "User connected",
    }
    manager.activity_feed.append(in_memory_event)
    feed = manager._get_activity_feed(fake_db, limit=10)
    # Expect both events (sorted with newest first)
    assert len(feed) == 2
    assert feed[0]["user_id"] == "456"


def test_get_current_checkins(monkeypatch, manager):
    now = activity.get_edmonton_time()
    fake_checkin = RoomOccupancy(
        user_id="789",
        username="checkUser",
        room_name="RoomA",
        study_topic="Physics",
        checkin_time=(now - timedelta(minutes=30)).replace(tzinfo=None),
        expiry_time=(now + timedelta(hours=1)).replace(tzinfo=None),
        is_active=True,
    )
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([fake_checkin])
    checkins = manager._get_current_checkins(fake_db)
    assert len(checkins) == 1
    assert checkins[0]["user_id"] == "789"


def test_increment_room_count(monkeypatch, manager):
    now = activity.get_edmonton_time()
    fake_db = FakeDB()
    # No existing record: count should become 1.
    fake_db.queries[RoomCount] = FakeQuery([])
    count = manager._increment_room_count(fake_db, "TestRoom")
    assert count == 1

    # Existing record with count=2: should update to 3.
    room_obj = RoomCount(room_name="TestRoom", occupant_count=2, last_updated=now)
    fake_db.queries[RoomCount] = FakeQuery([room_obj])
    count = manager._increment_room_count(fake_db, "TestRoom")
    assert count == 3


def test_decrement_room_count(monkeypatch, manager):
    now = activity.get_edmonton_time()
    fake_db = FakeDB()

    # Existing record with count=1 should decrement to 0.
    room_obj = RoomCount(room_name="TestRoom", occupant_count=1, last_updated=now)
    fake_db.queries[RoomCount] = FakeQuery([room_obj])
    count = manager._decrement_room_count(fake_db, "TestRoom")
    assert count == 0

    # Existing record with count already 0 remains 0.
    room_obj = RoomCount(room_name="TestRoom", occupant_count=0, last_updated=now)
    fake_db.queries[RoomCount] = FakeQuery([room_obj])
    count = manager._decrement_room_count(fake_db, "TestRoom")
    assert count == 0

    # When no record exists, should create one and return 0.
    fake_db.queries[RoomCount] = FakeQuery([])
    count = manager._decrement_room_count(fake_db, "AnotherRoom")
    assert count == 0


def test_get_all_room_occupancy(monkeypatch, manager):
    room1 = RoomCount(room_name="Room1", occupant_count=2, last_updated=datetime.now())
    room2 = RoomCount(room_name="Room2", occupant_count=3, last_updated=datetime.now())
    fake_db = FakeDB()
    fake_db.queries[RoomCount] = FakeQuery([room1, room2])
    occupancy = manager._get_all_room_occupancy(fake_db)
    assert occupancy == {"Room1": 2, "Room2": 3}


# -------------------------------------------------------------------
# Tests for asynchronous methods in ConnectionManager
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_connect(monkeypatch, manager):
    ws = FakeWebSocket()
    fake_db = FakeDB()
    fake_db.queries[ActivityEvent] = FakeQuery([])
    fake_db.queries[RoomOccupancy] = FakeQuery([])
    fake_db.queries[RoomCount] = FakeQuery([])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    # Capture broadcasted messages.
    broadcasted = []
    async def fake_broadcast(message):
        broadcasted.append(message)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    await manager.connect(ws, username="testuser", user_id="user123")
    # Check that WebSocket.accept() was called.
    assert ws.sent_messages[0] == "accepted"
    # One of the sent messages should be the history message.
    history_msgs = [msg for msg in ws.sent_messages if isinstance(msg, dict) and msg.get("type") == "history"]
    assert len(history_msgs) == 1
    # A connection event should have been broadcast.
    assert any(msg.get("type") == "connection" for msg in broadcasted)


def test_disconnect(manager):
    ws = FakeWebSocket()
    manager.active_connections.append(ws)
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"
    event = manager.disconnect(ws)
    assert event["type"] == "disconnection"
    assert event["user_id"] == "user123"
    assert ws not in manager.active_connections
    assert ws not in manager.user_ids


@pytest.mark.asyncio
async def test_handle_checkin_missing_fields(monkeypatch, manager):
    ws = FakeWebSocket()
    messages = []
    async def fake_send_json(msg):
        messages.append(msg)
    ws.send_json = fake_send_json

    # No user_id in manager.user_ids so expecting an error.
    await manager.handle_checkin(ws, {"room_name": "RoomA", "username": "test"})
    assert any("Missing user_id" in msg.get("message", "") for msg in messages)


@pytest.mark.asyncio
async def test_handle_checkin_success(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"

    fake_db = FakeDB()
    # Simulate no active check-in for this user.
    fake_db.queries[RoomOccupancy] = FakeQuery([])
    # Simulate no existing RoomCount record.
    fake_db.queries[RoomCount] = FakeQuery([])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    broadcasted = []
    async def fake_broadcast(msg):
        broadcasted.append(msg)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    await manager.handle_checkin(ws, {"room_name": "RoomA", "username": "testuser", "study_topic": "Math"})
    # A checkin event should be broadcast.
    assert any(msg.get("type") == "checkin" for msg in broadcasted)


@pytest.mark.asyncio
async def test_handle_checkin_already_checked_in_same_room(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"

    checkin = RoomOccupancy(
        user_id="user123",
        room_name="RoomA",
        is_active=True,
        checkin_time=datetime.now().replace(tzinfo=None),
        expiry_time=(datetime.now() + timedelta(hours=1)).replace(tzinfo=None),
        username="testuser"
    )
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([checkin])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    messages = []
    async def fake_send_json(msg):
        messages.append(msg)
    ws.send_json = fake_send_json

    await manager.handle_checkin(ws, {"room_name": "RoomA", "username": "testuser", "study_topic": "Math"})
    # Should send an info message indicating already checked in.
    assert any("already checked into RoomA" in msg.get("message", "") for msg in messages)


@pytest.mark.asyncio
async def test_handle_checkin_auto_checkout(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"

    # Existing checkin in a different room.
    checkin = RoomOccupancy(
        user_id="user123",
        room_name="RoomB",
        is_active=True,
        checkin_time=datetime.now().replace(tzinfo=None),
        expiry_time=(datetime.now() + timedelta(hours=1)).replace(tzinfo=None),
        username="testuser"
    )
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([checkin])
    fake_db.queries[RoomCount] = FakeQuery([])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    checkout_called = False
    async def fake_handle_checkout(ws, data):
        nonlocal checkout_called
        checkout_called = True
    monkeypatch.setattr(manager, "handle_checkout", fake_handle_checkout)

    broadcasted = []
    async def fake_broadcast(msg):
        broadcasted.append(msg)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    await manager.handle_checkin(ws, {"room_name": "RoomA", "username": "testuser", "study_topic": "Math"})
    assert checkout_called
    assert any(msg.get("type") == "checkin" for msg in broadcasted)


@pytest.mark.asyncio
async def test_handle_checkout_missing_user(monkeypatch, manager):
    ws = FakeWebSocket()
    messages = []
    async def fake_send_json(msg):
        messages.append(msg)
    ws.send_json = fake_send_json

    await manager.handle_checkout(ws, {"room_name": "RoomA"})
    # Expect an error about missing user_id.
    assert any("User ID not found" in msg.get("message", "") for msg in messages)


@pytest.mark.asyncio
async def test_handle_checkout_no_active_checkin(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([])  # No active checkin.
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    messages = []
    async def fake_send_json(msg):
        messages.append(msg)
    ws.send_json = fake_send_json

    await manager.handle_checkout(ws, {"room_name": "RoomA"})
    assert any("not checked in" in msg.get("message", "") for msg in messages)


@pytest.mark.asyncio
async def test_handle_checkout_success(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"
    now = datetime.now()
    checkin = RoomOccupancy(
        user_id="user123",
        room_name="RoomA",
        is_active=True,
        checkin_time=(now - timedelta(minutes=10)).replace(tzinfo=None),
        expiry_time=(now + timedelta(hours=1)).replace(tzinfo=None),
        username="testuser"
    )
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([checkin])
    room_count = RoomCount(room_name="RoomA", occupant_count=5, last_updated=now)
    fake_db.queries[RoomCount] = FakeQuery([room_count])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    broadcasted = []
    async def fake_broadcast(msg):
        broadcasted.append(msg)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    await manager.handle_checkout(ws, {"room_name": "RoomA"})
    assert any(msg.get("type") == "checkout" for msg in broadcasted)


@pytest.mark.asyncio
async def test_handle_checkout_auto_checkout_no_error(monkeypatch, manager):
    ws = FakeWebSocket()
    manager.user_ids[ws] = "user123"
    manager.usernames[ws] = "testuser"
    fake_db = FakeDB()
    checkin = RoomOccupancy(
        user_id="user123",
        room_name="RoomA",
        is_active=True,
        checkin_time=datetime.now().replace(tzinfo=None),
        expiry_time=(datetime.now() + timedelta(hours=1)).replace(tzinfo=None),
        username="testuser"
    )
    fake_db.queries[RoomOccupancy] = FakeQuery([checkin])
    room_count = RoomCount(room_name="RoomA", occupant_count=3, last_updated=datetime.now())
    fake_db.queries[RoomCount] = FakeQuery([room_count])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    broadcasted = []
    async def fake_broadcast(msg):
        broadcasted.append(msg)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    # Omit room_name to use the active checkin's room.
    await manager.handle_checkout(ws, {})
    assert any(msg.get("type") == "checkout" for msg in broadcasted)


@pytest.mark.asyncio
async def test_expire_checkins(monkeypatch, manager):
    now = activity.get_edmonton_time()
    expired = RoomOccupancy(
        user_id="user123",
        room_name="RoomA",
        is_active=True,
        checkin_time=(now - timedelta(hours=5)).replace(tzinfo=None),
        expiry_time=(now - timedelta(minutes=1)).replace(tzinfo=None),
        username="testuser"
    )
    fake_db = FakeDB()
    fake_db.queries[RoomOccupancy] = FakeQuery([expired])
    room_count = RoomCount(room_name="RoomA", occupant_count=2, last_updated=now)
    fake_db.queries[RoomCount] = FakeQuery([room_count])
    monkeypatch.setattr(manager, "_get_db", lambda: fake_db)

    broadcasted = []
    async def fake_broadcast(msg):
        broadcasted.append(msg)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    await manager.expire_checkins()
    assert any(msg.get("type") == "checkout" for msg in broadcasted)


@pytest.mark.asyncio
async def test_broadcast(monkeypatch, manager):
    ws_good = FakeWebSocket()
    ws_bad = FakeWebSocket()
    async def fail_send_json(msg):
        raise WebSocketDisconnect("Test disconnect")
    ws_bad.send_json = fail_send_json
    manager.active_connections = [ws_good, ws_bad]

    # Override disconnect to simply remove the ws.
    def fake_disconnect(ws):
        if ws in manager.active_connections:
            manager.active_connections.remove(ws)
        return {"type": "disconnection", "user_id": "dummy", "username": None,
                "timestamp": activity.get_edmonton_time().isoformat(), "message": "disconnected"}
    monkeypatch.setattr(manager, "disconnect", fake_disconnect)

    await manager.broadcast({"test": "message"})
    # ws_bad should have been removed.
    assert ws_bad not in manager.active_connections


@pytest.mark.asyncio
async def test_run_expiry_checker(monkeypatch):
    flag = False
    async def fake_expire_checkins():
        nonlocal flag
        flag = True
    monkeypatch.setattr(activity.manager, "expire_checkins", fake_expire_checkins)
    await activity.run_expiry_checker()
    assert flag is True




# -------------------------------------------------------------------
# Tests for the websocket_endpoint function
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_websocket_endpoint_authenticated(monkeypatch):
    # Create a fake user and generate a valid token.
    fake_user = User(id=uuid.uuid4(), email="test@example.com", username="testuser", password="pass")
    payload = {"sub": fake_user.email, "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    headers = {"cookie": f"access_token={token}"}
    ws = FakeWebSocket(headers=headers)

    fake_db = FakeDB()
    fake_db.queries[User] = FakeQuery([fake_user])
    # Monkey-patch SessionLocal in the activity module.
    monkeypatch.setattr(activity, "SessionLocal", lambda: fake_db)

    # Queue several messages:
    ws.queue_message("ping")
    ws.queue_message(json.dumps({
        "type": "checkin",
        "room_name": "TestRoom",
        "username": fake_user.username,
        "study_topic": "Math"
    }))
    ws.queue_message(json.dumps({
        "type": "setUsername",
        "username": "newname"
    }))
    ws.queue_message("invalid json")  # This should be skipped

    # Override connect so it simply records a history message.
    async def fake_connect(websocket, username=None, user_id=None):
        websocket.sent_messages.append({"type": "history", "user_id": user_id})
    monkeypatch.setattr(activity.manager, "connect", fake_connect)

    await activity.websocket_endpoint(ws)
    # When the connection is terminated (via WebSocketDisconnect), the websocket should be closed.
    assert ws not in activity.manager.active_connections


@pytest.mark.asyncio
async def test_websocket_endpoint_unauthenticated(monkeypatch):
    # No token in the cookie header.
    ws = FakeWebSocket(headers={"cookie": ""})
    fake_db = FakeDB()
    fake_db.queries[User] = FakeQuery([])  # No user found.
    monkeypatch.setattr(activity, "SessionLocal", lambda: fake_db)
    await activity.websocket_endpoint(ws)
    # Expect the websocket to be closed with an unauthorized error.
    assert ws.closed is True
