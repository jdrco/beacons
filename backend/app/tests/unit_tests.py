import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from jose import jwt

# ---------------------------
# Imports from your app
# ---------------------------
from app.main import app
from app.core.auth import (
    get_active_user,
    create_verification_token,
    get_password_hash,
    verify_password
)
from app.core.config import settings
from app.core.database import get_db, Base
from app.models.user import User, Program
from app.models.building import Room, UserFavoriteRoom
from app.models.occupancy import RoomCount, RoomOccupancy, ActivityEvent

# ---------------------------
# Setup for Mocks and Client
# ---------------------------
fake_user = User(
    id=uuid.uuid4(),
    email="test@ualberta.ca",
    username="testuser",
    password="hashedpassword",
    active=True
)
setattr(fake_user, "is_verified", True)

def override_get_active_user():
    return fake_user

def override_get_db():
    """Default get_db override that yields a MagicMock (used by endpoints that do not need a real DB)."""
    fake_db = MagicMock()
    yield fake_db

app.dependency_overrides[get_active_user] = override_get_active_user
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


# =============================================================================
# AUTH ENDPOINTS
# =============================================================================

# ---------------------------
# POST /signup
# ---------------------------

@pytest.mark.parametrize(
    "payload, error_msg",
    [
        (
            {
                "email": "alreadyexists@ualberta.ca",
                "password": "TestPass123!",
                "re_password": "TestPass123!"
            },
            "Email already registered."
        ),
        (
            {
                "email": "notualberta@email.com",
                "password": "TestPass123!",
                "re_password": "TestPass123!"
            },
            "Only @ualberta.ca emails are allowed."
        ),
        (
            {
                "email": "mismatch@ualberta.ca",
                "password": "Mismatch1!",
                "re_password": "Mismatch2!"
            },
            "Passwords do not match"
        ),
    ],
)
def test_signup_negative(monkeypatch, payload, error_msg):
    """
    Tests invalid signup scenarios.
    """
    def fake_get_user_by_email(db, email):
        if email == "alreadyexists@ualberta.ca":
            return fake_user
        return None

    async def fake_send_verification_email(email, token):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.send_verification_email", fake_send_verification_email)

    response = client.post("/signup", json=payload)
    # Expect a 400 error for these validation cases.
    assert response.status_code == 400, response.json()
    data = response.json()
    assert data["status"] is False
    assert error_msg in data["message"]


def test_signup_positive(monkeypatch):
    """
    A fully valid signup scenario for /signup
    - The email does not exist.
    - The password meets complexity requirements.
    - The passwords match.
    """
    def mock_get_user_by_email(db, email):
        # Return None to simulate that no user with this email is found
        return None

    def mock_get_user_by_username(db, username):
        # Return None to simulate that the random username is not taken
        return None

    async def mock_send_verification_email(email, token):
        # Just a stub, do nothing
        return None

    def mock_create_user(db, email, username, password, active, program_id=None):
        # Return a user-like object
        new_user = User(
            id=uuid.uuid4(),
            email=email,
            username=username,
            password=get_password_hash(password),
            active=active
        )
        return new_user

    monkeypatch.setattr("app.core.auth.get_user_by_email", mock_get_user_by_email)
    monkeypatch.setattr("app.core.auth.get_user_by_username", mock_get_user_by_username)
    monkeypatch.setattr("app.core.auth.send_verification_email", mock_send_verification_email)
    monkeypatch.setattr("app.core.auth.create_user", mock_create_user)

    payload = {
        "email": "newstudent@ualberta.ca",
        "password": "ValidPass123!",
        "re_password": "ValidPass123!"
    }
    response = client.post("/signup", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] is True
    assert "User successfully registered" in data["message"]


# ---------------------------
# POST /signin
# ---------------------------

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
    assert response.status_code == 200, response.json()
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_signin_wrong_password(monkeypatch):
    """
    Attempt to sign in with an incorrect password.
    """
    def fake_get_user_by_email(db, email):
        return fake_user

    def fake_verify_password(plain, hashed):
        return False

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr("app.core.auth.verify_password", fake_verify_password)

    form_data = {
        "username": "test@ualberta.ca",
        "password": "WrongPassword"
    }
    response = client.post("/signin", data=form_data)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] is False
    assert "Invalid email or password." in data["message"]


# ---------------------------
# POST /signout
# ---------------------------

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


# ---------------------------
# PUT /update-password
# ---------------------------

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


# ---------------------------
# GET /verify-email
# ---------------------------

def test_verify_email(monkeypatch):
    """
    Test that the verify-email endpoint issues a redirect upon successful verification.
    """
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
    response = client.get(f"/verify-email?token={token}", follow_redirects=False)
    assert response.status_code in (302, 307), response.json()
    # Verify that the redirect location points to the frontend sign-in URL.
    assert response.headers["location"] == "http://localhost:3000/signin"


def test_verify_email_invalid_token(monkeypatch):
    """
    Attempt to verify email with an invalid token.
    """
    def fake_get_user_by_email(db, email):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)

    invalid_token = "some.invalid.token"
    response = client.get(f"/verify-email?token={invalid_token}", follow_redirects=False)
    # Expecting a redirect response
    assert response.status_code in (302, 307), (
        f"Unexpected status code: {response.status_code} with response: {response.text}"
    )
    # Check that the redirect URL contains the proper error message.
    expected_url = "http://localhost:3000/resend-verification-email?error=verification_failed"
    assert response.headers["location"] == expected_url


# ---------------------------
# POST /resend-verification-email
# ---------------------------

def test_resend_verification_email(monkeypatch):
    fake_unverified_user = User(
        id=uuid.uuid4(),
        email="test@ualberta.ca",
        username="testuser",
        password="hashedpassword",
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


# ---------------------------
# POST /request-password-reset
# ---------------------------

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


def test_request_password_reset_user_not_found(monkeypatch):
    """
    Attempt to request a password reset for a non-existent user.
    """
    def fake_get_user_by_email(db, email):
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", fake_get_user_by_email)

    response = client.post("/request-password-reset", params={"email": "unknown@ualberta.ca"})
    assert response.status_code == 404
    data = response.json()
    assert data["status"] is False
    assert "User not found" in data["message"]


# ---------------------------
# GET /verify-password-reset
# ---------------------------

def test_verify_password_reset_valid_token(monkeypatch):
    """
    Test a scenario where the token is valid and the user is found.
    The route should redirect the user to the sign-in page.
    """
    def create_test_token(email: str):
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"sub": email, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    valid_token = create_test_token("resetuser@ualberta.ca")

    def mock_get_user_by_email(db, email):
        # Return a user object for the test
        return fake_user

    monkeypatch.setattr("app.core.auth.get_user_by_email", mock_get_user_by_email)

    response = client.get(f"/verify-password-reset?token={valid_token}", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"].endswith("/signin")


def test_verify_password_reset_invalid_token(monkeypatch):
    """
    Test a scenario with an invalid token. Expect a 400 error or similar.
    """
    invalid_token = "some.invalid.token"

    def mock_get_user_by_email(db, email):
        # In case the code tries to look up a user
        return None

    monkeypatch.setattr("app.core.auth.get_user_by_email", mock_get_user_by_email)

    response = client.get(f"/verify-password-reset?token={invalid_token}")
    assert response.status_code == 400, response.json()
    data = response.json()
    assert data["status"] is False
    assert "Invalid token" in data["message"]


# ---------------------------
# POST /reset-password
# ---------------------------

def test_reset_password_success(monkeypatch):
    """
    Test a valid reset-password scenario:
    - The token is valid
    - The user is found
    - The new password meets complexity requirements and matches re_password
    """
    def mock_get_user_by_email(db, email):
        return fake_user  # Return our fake user

    def create_test_token(email: str):
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"sub": email, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    monkeypatch.setattr("app.core.auth.get_user_by_email", mock_get_user_by_email)

    reset_token = create_test_token(fake_user.email)
    payload = {
        "password": "NewValidPass123!",
        "re_password": "NewValidPass123!"
    }
    response = client.post(f"/reset-password?token={reset_token}", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Password reset successfully" in data["message"]


def test_reset_password_mismatch(monkeypatch):
    """
    Test a scenario where the new password fields do not match.
    """
    def mock_get_user_by_email(db, email):
        return fake_user

    monkeypatch.setattr("app.core.auth.get_user_by_email", mock_get_user_by_email)

    def create_test_token(email: str):
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"sub": email, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    reset_token = create_test_token(fake_user.email)
    payload = {
        "password": "NewValidPass123!",
        "re_password": "DifferentPass!"
    }
    response = client.post(f"/reset-password?token={reset_token}", json=payload)
    assert response.status_code == 400, response.text
    data = response.json()
    assert data["status"] is False
    assert "Passwords do not match" in data["message"]


# ---------------------------
# GET /list_programs
# ---------------------------

def test_list_programs_success(monkeypatch):
    """
    Test retrieving program list with no extra filters.
    """

    fake_program_1 = Program(
        id=uuid.uuid4(),
        name="Computer Science",
        is_undergrad=True,
        faculty="Science"
    )
    fake_program_2 = Program(
        id=uuid.uuid4(),
        name="Mechanical Engineering",
        is_undergrad=False,
        faculty="Engineering"
    )

    def mock_query(*args, **kwargs):
        class FakeQuery:
            def filter(self, *filters):
                return self
            def count(self):
                return 2
            def offset(self, val):
                return self
            def limit(self, val):
                return self
            def all(self):
                return [fake_program_1, fake_program_2]

        return FakeQuery()

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.get("/list_programs")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert len(data["data"]) == 2
    assert "Computer Science" in [prog["name"] for prog in data["data"]]


# =============================================================================
# USER ENDPOINTS
# =============================================================================

# ---------------------------
# GET /user/details
# ---------------------------

def test_get_user_details():
    response = client.get("/user/details")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "User found" in data["message"]
    user_data = data["data"]
    assert user_data["email"] == fake_user.email


# ---------------------------
# PUT /user/update
# ---------------------------

def test_update_user(monkeypatch):
    monkeypatch.setattr(
        "app.routes.user.filter_query",
        lambda db, model, filters, **kwargs: [fake_user]
    )
    payload = {
        "username": "updateduser",
        "program": "SomeProgram"
    }
    response = client.put("/user/update", json=payload)
    assert response.status_code in (200, 404)
    if response.status_code == 200:
        data = response.json()
        assert data["status"] is True
        assert "User updated" in data["message"]


# ---------------------------
# DELETE /user/delete
# ---------------------------

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


def test_delete_user_not_found(monkeypatch):
    """
    Attempt to delete a non-existent user.
    """
    monkeypatch.setattr(
        "app.routes.user.filter_query",
        lambda db, model, filters, **kwargs: []
    )
    response = client.delete("/user/delete")
    assert response.status_code == 404
    data = response.json()
    assert data["status"] is False
    assert "User not found" in data["message"]


# ---------------------------
# GET /user/list_favorite_rooms
# ---------------------------

def test_list_favorite_rooms(monkeypatch):
    fake_room = Room(id=uuid.uuid4(), building_id=uuid.uuid4(), name="Room1")
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


# ---------------------------
# PUT /user/add_multiple_favorite_rooms
#   (No direct test shown in this file)
# ---------------------------

# ---------------------------
# PUT /user/add_favorite_room
# ---------------------------

def test_add_favorite_room(monkeypatch):
    """
    Test adding a single favorite room via query parameter.
    """
    room_name = "CAB 239"
    room_id = uuid.uuid4()
    fake_room = Room(id=room_id, building_id=uuid.uuid4(), name=room_name)

    def fake_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "rooms":
            mock_q.filter.return_value.first.return_value = fake_room
        elif model.__tablename__ == "user_favorite_rooms":
            mock_q.filter.return_value.first.return_value = None
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = fake_query
    fake_db.commit = lambda: None
    fake_db.add = lambda x: None

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.put(f"/user/add_favorite_room?room_name={room_name}")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["status"] is True
    assert ("Room favorited" in data["message"]
            or "Room favorited successfully" in data["message"])


# ---------------------------
# DELETE /user/remove_favorite_room
# ---------------------------

def test_remove_favorite_room(monkeypatch):
    """
    Test removal of a favorite room.
    """
    room_name = "CAB 239"
    some_room_id = uuid.uuid4()
    fake_room = Room(id=some_room_id, building_id=uuid.uuid4(), name=room_name)

    def fake_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "rooms":
            mock_q.filter.return_value.first.return_value = fake_room
        elif model.__tablename__ == "user_favorite_rooms":
            mock_q.filter.return_value.delete.return_value = 1
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = fake_query
    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.delete(f"/user/remove_favorite_room?room_name={room_name}")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "Room removed from favorites" in data["message"]


def test_remove_favorite_room_not_found(monkeypatch):
    """
    Test removal of a non-favorited room.
    """
    room_name = "CAB 239"
    some_room_id = uuid.uuid4()
    fake_room = Room(id=some_room_id, building_id=uuid.uuid4(), name=room_name)

    def fake_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "rooms":
            mock_q.filter.return_value.first.return_value = fake_room
        elif model.__tablename__ == "user_favorite_rooms":
            # Simulate delete returning 0 (no records deleted)
            mock_q.filter.return_value.delete.return_value = 0
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = fake_query
    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.delete(f"/user/remove_favorite_room?room_name={room_name}")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 404, response.json()
    data = response.json()
    assert data["status"] is False
    assert ("Room not favorited" in data["message"]
            or "does not exist" in data["message"])


# ---------------------------
# PUT /user/toggle_notification
# ---------------------------

def test_toggle_notification(monkeypatch):
    """
    Tests toggling the notification boolean on a user's favorite room.
    """
    room_name = "CAB 239"
    fake_room = Room(id=uuid.uuid4(), building_id=uuid.uuid4(), name=room_name)
    fake_favorite = UserFavoriteRoom(
        user_id=fake_user.id, room_id=fake_room.id, notification_sent=True
    )

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "rooms":
            mock_q.filter.return_value.first.return_value = fake_room
        elif model.__tablename__ == "user_favorite_rooms":
            mock_q.filter.return_value.first.return_value = fake_favorite
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query
    fake_db.commit = MagicMock()

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.put(f"/user/toggle_notification?room_name={room_name}")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Notification status toggled successfully" in data["message"]


def test_toggle_notification_not_favorited(monkeypatch):
    """
    Attempt to toggle notification for a room that is not in the user's favorites.
    """
    room_name = "CAB 239"
    fake_room = Room(id=uuid.uuid4(), building_id=uuid.uuid4(), name=room_name)

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "rooms":
            mock_q.filter.return_value.first.return_value = fake_room
        elif model.__tablename__ == "user_favorite_rooms":
            # Return None to simulate not favorited
            mock_q.filter.return_value.first.return_value = None
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.put(f"/user/toggle_notification?room_name={room_name}")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 404
    data = response.json()
    assert data["status"] is False
    assert "Room not favorited by the user" in data["message"]


# ---------------------------
# POST /calculate_distances
# ---------------------------

def test_calculate_distances():
    """
    Test the POST /calculate_distances endpoint with valid floats.
    """
    payload = {
        "start_lat": 53.5461,
        "start_long": -113.4938,
        "destinations": [
            ["PlaceA", 53.5232, -113.5263],
            ["PlaceB", 53.5220, -113.5]
        ]
    }
    response = client.post("/calculate_distances", json=payload)
    assert response.status_code == 200, response.json()
    data = response.json()
    # Expecting a response that contains "distances"
    assert "distances" in data


def test_calculate_distances_invalid_coordinates():
    """
    Provide invalid lat/long (non-float strings) and expect validation errors.
    """
    payload = {
        "start_lat": "invalid_lat",
        "start_long": "invalid_long",
        "destinations": [
            ["PlaceA", 53.5232, -113.5263]
        ]
    }
    response = client.post("/calculate_distances", json=payload)
    # Pydantic should return a 422 error for invalid types.
    assert response.status_code == 422, response.json()
    data = response.json()
    assert "detail" in data


# =============================================================================
# ROOMS ENDPOINTS
# =============================================================================

# ---------------------------
# GET /rooms/{room_name}/demographics
# ---------------------------

def test_room_demographics_no_active_checkins(monkeypatch):
    """
    Test a scenario where there are no active checkins for the specified room.
    We expect the code to return an empty list and a success message.
    """
    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "room_occupancy":
            # Return [] to simulate no active checkins
            mock_q.filter.return_value.all.return_value = []
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query
    app.dependency_overrides[get_db] = lambda: fake_db

    response = client.get("/rooms/CAB 239/demographics")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "No active check-ins for this room" in data["message"]
    assert data["data"] == []


def test_room_demographics_with_active_checkins(monkeypatch):
    """
    Test a scenario where there are active checkins, and we get a breakdown by program.
    """
    # Fake checkin by user
    checkin_user_id = str(uuid.uuid4())
    active_checkin = RoomOccupancy(
        id=uuid.uuid4(),
        user_id=checkin_user_id,
        room_name="CAB 239",
        is_active=True,
        expiry_time=datetime.now() + timedelta(hours=2)
    )

    # Corresponding user in some Program
    fake_program = Program(
        id=uuid.uuid4(),
        name="Computer Science",
        is_undergrad=True,
        faculty="Science"
    )
    user_with_program = User(
        id=checkin_user_id,
        email="checkin@ualberta.ca",
        username="checkinUser",
        program_id=fake_program.id
    )

    def mock_query(*args, **kwargs):
        # If more than one argument is given, we're likely selecting multiple columns.
        if len(args) > 1:
            fake_obj = MagicMock()
            fake_obj.join.return_value.filter.return_value.all.return_value = [
                (user_with_program.id, fake_program.name)
            ]
            return fake_obj
        else:
            model = args[0]
            mock_q = MagicMock()
            if hasattr(model, "__tablename__") and model.__tablename__ == "room_occupancy":
                mock_q.filter.return_value.all.return_value = [active_checkin]
            return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query
    app.dependency_overrides[get_db] = lambda: fake_db

    response = client.get("/rooms/CAB 239/demographics")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Room demographics retrieved successfully" in data["message"]
    # Check that the "Computer Science" program is counted correctly.
    assert data["data"].get("Computer Science") == 1


# =============================================================================
# OCCUPANCY ENDPOINTS
# =============================================================================

# ---------------------------
# GET /api/occupancy/rooms
# ---------------------------

def test_get_occupancy_rooms(monkeypatch):
    """
    Test that we can get the occupant count for all rooms with occupant_count > 0.
    """
    fake_room_count = RoomCount(
        room_name="CAB 239",
        occupant_count=2,
        last_updated=datetime.now()
    )

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "room_counts":
            # Return a list with one RoomCount that has occupant_count=2
            mock_q.filter.return_value.all.return_value = [fake_room_count]
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.get("/api/occupancy/rooms")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Room occupancy data retrieved successfully" in data["message"]
    assert len(data["data"]) == 1
    assert data["data"][0]["room_name"] == "CAB 239"
    assert data["data"][0]["occupant_count"] == 2


# ---------------------------
# GET /api/occupancy/buildings
# ---------------------------

def test_get_occupancy_buildings(monkeypatch):
    """
    Test retrieving occupant counts aggregated by building.
    Example: "CAB 239" => building "CAB"
    """
    fake_room_count_1 = RoomCount(
        room_name="CAB 239",
        occupant_count=2,
        last_updated=datetime.now()
    )
    fake_room_count_2 = RoomCount(
        room_name="CAB 345",
        occupant_count=3,
        last_updated=datetime.now()
    )

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "room_counts":
            mock_q.filter.return_value.all.return_value = [
                fake_room_count_1,
                fake_room_count_2
            ]
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.get("/api/occupancy/buildings")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Building occupancy data retrieved successfully" in data["message"]
    # We should see 1 building result with occupant_count=5
    assert len(data["data"]) == 1
    assert data["data"][0]["building_name"] == "CAB"
    assert data["data"][0]["occupant_count"] == 5


# ---------------------------
# GET /api/occupancy/room/{room_name}
# ---------------------------

def test_get_occupancy_room(monkeypatch):
    """
    Test occupancy details for a single room, including occupant info and last_updated.
    """
    fake_room_count = RoomCount(
        room_name="CAB 239",
        occupant_count=1,
        last_updated=datetime.now()
    )
    fake_room_occupancy = RoomOccupancy(
        id=uuid.uuid4(),
        user_id="test_user_id",
        username="test_user",
        room_name="CAB 239",
        is_active=True,
        checkin_time=datetime.now() - timedelta(minutes=10),
        expiry_time=datetime.now() + timedelta(minutes=50),
    )

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "room_counts":
            mock_q.filter.return_value.first.return_value = fake_room_count
        elif model.__tablename__ == "room_occupancy":
            mock_q.filter.return_value.all.return_value = [fake_room_occupancy]
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.get("/api/occupancy/room/CAB 239")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert data["data"]["room_name"] == "CAB 239"
    assert data["data"]["occupant_count"] == 1
    assert len(data["data"]["occupants"]) == 1
    assert data["data"]["occupants"][0]["username"] == "test_user"


# ---------------------------
# GET /api/occupancy/activity/{room_name}
# ---------------------------

def test_get_occupancy_activity(monkeypatch):
    """
    Test retrieval of recent activity events for a specific room.
    """
    fake_activity = ActivityEvent(
        id=uuid.uuid4(),
        type="checkin",
        user_id="test_user_id",
        username="test_user",
        room_name="CAB 239",
        study_topic="Calculus",
        timestamp=datetime.now() - timedelta(minutes=5),
        message="User checked in"
    )

    def mock_query(model):
        mock_q = MagicMock()
        if model.__tablename__ == "activity_events":
            mock_q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [fake_activity]
        return mock_q

    fake_db = MagicMock()
    fake_db.query.side_effect = mock_query

    app.dependency_overrides[get_db] = lambda: fake_db
    response = client.get("/api/occupancy/activity/CAB 239")
    app.dependency_overrides[get_db] = override_get_db

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] is True
    assert "Activity data for CAB 239 retrieved successfully" in data["message"]
    assert len(data["data"]) == 1
    assert data["data"][0]["type"] == "checkin"
    assert data["data"][0]["username"] == "test_user"
    assert data["data"][0]["study_topic"] == "Calculus"


# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

# ---------------------------
# GET /public_health
# ---------------------------

def test_public_health():
    response = client.get("/public_health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert data["message"] == "Public health check."


# ---------------------------
# GET /private_health
# ---------------------------

def test_private_health():
    response = client.get("/private_health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert data["message"] == "Private health check."

