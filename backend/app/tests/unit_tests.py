import json
from uuid import uuid4
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.core.auth import get_active_user, create_verification_token
from app.core.database import get_db
from app.models.user import User
from app.models.building import Room

from jose import jwt
from app.core.config import settings


fake_user = User(
    id=uuid4(),
    email="test@ualberta.ca",
    username="testuser",
    active=True
)
setattr(fake_user, "is_verified", True)

def override_get_active_user():
    return fake_user

def override_get_db():
    fake_db = MagicMock()
    yield fake_db

app.dependency_overrides[get_active_user] = override_get_active_user
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# ---------------------------
# Public and Health Endpoints
# ---------------------------
def test_public_health():
    response = client.get("/public_health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert data["message"] == "Public health check."

def test_private_health():
    response = client.get("/private_health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert data["message"] == "Private health check."

# ---------------------------
# Distance Endpoint
# ---------------------------
def test_nearest_buildings():
    params = {"lat": 53.5461, "lon": -113.4938}
    response = client.get("/nearest_buildings/", params=params)
    assert response.status_code == 200
    data = response.json()
    assert "user_location" in data
    assert "nearest_buildings" in data

# ---------------------------
# Auth Endpoints
# ---------------------------
def test_signup(monkeypatch):
    def fake_get_user_by_email(db, email):
        return None
    def fake_get_user_by_username(db, username):
        return None
    def fake_create_user(db, email, username, password, active=False):
        return fake_user
    async def fake_send_verification_email(email, token):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.get_user_by_username", fake_get_user_by_username)
    monkeypatch.setattr("app.core.auth.create_user", fake_create_user)
    monkeypatch.setattr("app.core.auth.send_verification_email", fake_send_verification_email)

    payload = {
        "email": "newuser@ualberta.ca",
        "username": "newuser",
        "password": "StrongP@ssw0rd!",
        "re_password": "StrongP@ssw0rd!"
    }
    response = client.post("/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] is True
    assert "User successfully registered" in data["message"]
    assert "email" in data["data"]

def test_signin(monkeypatch):
    def fake_get_user_by_email(db, email):
        return fake_user
    def fake_verify_password(plain, hashed):
        return True

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.verify_password", fake_verify_password)

    form_data = {
        "username": "test@ualberta.ca",
        "password": "AnyPassword"
    }
    response = client.post("/signin", data=form_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_signout(monkeypatch):
    class FakeCookie:
        access_token = "fake_token"

    def fake_get_active_cookie(db, access_token=None, user_id=None):
        return FakeCookie()

    def fake_deactivate_cookie(db, access_token):
        return True

    monkeypatch.setattr("app.core.auth.get_active_cookie", fake_get_active_cookie)
    monkeypatch.setattr("app.core.auth.deactivate_cookie", fake_deactivate_cookie)

    response = client.post("/signout")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "User signed out successfully" in data["message"]

def test_update_password(monkeypatch):
    monkeypatch.setattr("app.core.auth.verify_password", lambda plain, hashed: True)
    payload = {
        "old_password": "OldP@ssw0rd",
        "new_password": "NewP@ssw0rd!",
        "re_password": "NewP@ssw0rd!"
    }
    response = client.put("/update-password", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "Password updated successfully" in data["message"]

def test_verify_email(monkeypatch):
    def fake_get_user_by_email(db, email):
        return fake_user
    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)

    def create_verification_token_utc(email: str):
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"sub": email, "exp": expire}
        token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        return token

    monkeypatch.setattr("app.core.auth.create_verification_token", create_verification_token_utc)

    token = create_verification_token_utc("test@ualberta.ca")
    response = client.get(f"/verify-email?token={token}")
    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["status"] is True
    assert "Email verified successfully" in data["message"]

def test_resend_verification_email(monkeypatch):
    fake_unverified_user = User(
        id=uuid4(),
        email="test@ualberta.ca",
        username="testuser",
        active=False
    )
    setattr(fake_unverified_user, "is_verified", False)

    def fake_get_user_by_email(db, email):
        return fake_unverified_user

    async def fake_send_verification_email(email, token):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.send_verification_email", fake_send_verification_email)

    response = client.post("/resend-verification-email", params={"email": "test@ualberta.ca"})
    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["status"] is True
    assert "Verification email resent successfully" in data["message"]

def test_request_password_reset(monkeypatch):
    def fake_get_user_by_email(db, email):
        return fake_user

    async def fake_send_reset_password_email(email, token):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.send_reset_password_email", fake_send_reset_password_email)

    response = client.post("/request-password-reset", params={"email": "test@ualberta.ca"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "Password reset email sent successfully" in data["message"]

# ---------------------------
# User Routes Endpoints
# ---------------------------
def test_get_user_details():
    response = client.get("/user/details")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "User found" in data["message"]
    user_data = data["data"]
    assert user_data["email"] == fake_user.email

def test_update_user(monkeypatch):
    monkeypatch.setattr(
        "app.routes.user.filter_query",
        lambda db, model, filters, **kwargs: [fake_user]
    )
    payload = {
        "user_id": str(fake_user.id),
        "username": "updateduser",
        "active": True
    }
    response = client.put("/user/update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "User updated" in data["message"]

def test_delete_user(monkeypatch):
    monkeypatch.setattr(
        "app.routes.user.filter_query",
        lambda db, model, filters, **kwargs: [fake_user]
    )
    response = client.delete("/user/delete")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "User deleted" in data["message"]

def test_list_favorite_rooms(monkeypatch):
    fake_room = Room(id=uuid4(), building_id=uuid4(), name="Room1")

    monkeypatch.setattr(
        "app.routes.user.filter_query",
        lambda db, model, filters, **kwargs: [fake_room]
    )

    fake_db = MagicMock()
    fake_query = MagicMock()
    fake_query.join.return_value = fake_query
    fake_query.filter.return_value = fake_query
    fake_query.count.return_value = 1
    fake_db.query.return_value = fake_query


    app.dependency_overrides[get_db] = lambda: fake_db

    response = client.get("/user/list_favorite_rooms", params={"page": 1, "per_page": 10})

    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["status"] is True
    assert "Favorite rooms found" in data["message"]

def test_add_multiple_favorite_rooms(monkeypatch):
    room_id = uuid4()
    fake_db = MagicMock()
    fake_db.query.return_value.filter.return_value.all.return_value = [(room_id,)]

    monkeypatch.setattr("app.routes.user.get_db", lambda: iter([fake_db]))

    payload = {"room_ids": [str(room_id)]}
    response = client.put("/user/add_multiple_favorite_rooms", json=payload)
    assert response.status_code == 200

def test_add_favorite_room(monkeypatch):
    room_id = uuid4()
    fake_db = MagicMock()
    fake_db.commit = lambda: None
    fake_db.add = lambda x: None

    # First query: db.query(Room.id)
    room_query_mock = MagicMock()
    room_query_mock.filter.return_value.scalar.return_value = room_id

    # Second query: db.query(UserFavoriteRoom)
    favorite_query_mock = MagicMock()
    favorite_query_mock.filter.return_value.first.return_value = None

    fake_db.query.side_effect = [room_query_mock, favorite_query_mock]

    app.dependency_overrides[get_db] = lambda: fake_db

    response = client.put(f"/user/add_favorite_room?room_id={room_id}")
    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["status"] is True
    assert "Room favorited" in data["message"]

    # Reset dependency
    app.dependency_overrides[get_db] = override_get_db

def test_remove_favorite_room(monkeypatch):
    room_id = uuid4()
    fake_db = MagicMock()
    fake_db.query.return_value.filter.return_value.delete.return_value = 1

    monkeypatch.setattr("app.routes.user.get_db", lambda: iter([fake_db]))

    response = client.delete(f"/user/remove_favorite_room?room_id={room_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "Room removed from favorites" in data["message"]

# -------------------------------------------------
# To run these tests:
#   PYTHONPATH=. pytest app/tests/unit_tests.py
# -------------------------------------------------
