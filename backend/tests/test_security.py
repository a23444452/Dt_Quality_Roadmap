from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    hashed = hash_password("MyPassword123")
    assert verify_password("MyPassword123", hashed)
    assert not verify_password("WrongPassword", hashed)


def test_create_and_decode_access_token():
    token = create_access_token(user_id=1, role="editor")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["role"] == "editor"


def test_create_and_decode_refresh_token():
    token = create_refresh_token(user_id=1)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    result = decode_token("invalid.token.here")
    assert result is None
