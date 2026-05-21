import time
from unittest.mock import patch, MagicMock

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from app.utils.azure_ad import verify_azure_id_token, AzureADTokenError


@pytest.fixture
def rsa_keypair():
    """Generate a test RSA keypair."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key


@pytest.fixture
def valid_token(rsa_keypair):
    """Create a valid ID token signed with test key."""
    private_key, _ = rsa_keypair
    payload = {
        "aud": "test-client-id",
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
        "sub": "user-sub-id",
        "preferred_username": "wangm44@corning.com",
        "email": "wangm44@corning.com",
        "name": "Ming Wang",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "nbf": int(time.time()),
    }
    pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    return jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid"})


@pytest.fixture
def mock_jwks(rsa_keypair):
    """Mock JWKS response with test public key."""
    _, public_key = rsa_keypair
    from jwt.algorithms import RSAAlgorithm
    jwk_dict = RSAAlgorithm.to_jwk(public_key, as_dict=True)
    jwk_dict["kid"] = "test-kid"
    jwk_dict["use"] = "sig"
    return {"keys": [jwk_dict]}


@patch("app.utils.azure_ad.settings")
@patch("app.utils.azure_ad._fetch_jwks")
def test_verify_valid_token(mock_fetch, mock_settings, valid_token, mock_jwks):
    mock_settings.azure_ad_client_id = "test-client-id"
    mock_settings.azure_ad_tenant_id = "test-tenant-id"
    mock_fetch.return_value = mock_jwks

    claims = verify_azure_id_token(valid_token)

    assert claims["preferred_username"] == "wangm44@corning.com"
    assert claims["email"] == "wangm44@corning.com"
    assert claims["name"] == "Ming Wang"


@patch("app.utils.azure_ad.settings")
@patch("app.utils.azure_ad._fetch_jwks")
def test_verify_expired_token(mock_fetch, mock_settings, rsa_keypair, mock_jwks):
    mock_settings.azure_ad_client_id = "test-client-id"
    mock_settings.azure_ad_tenant_id = "test-tenant-id"
    mock_fetch.return_value = mock_jwks

    private_key, _ = rsa_keypair
    payload = {
        "aud": "test-client-id",
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
        "sub": "user-sub-id",
        "preferred_username": "wangm44@corning.com",
        "exp": int(time.time()) - 100,
        "iat": int(time.time()) - 3700,
    }
    pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    token = jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid"})

    with pytest.raises(AzureADTokenError, match="expired"):
        verify_azure_id_token(token)


@patch("app.utils.azure_ad.settings")
@patch("app.utils.azure_ad._fetch_jwks")
def test_verify_wrong_audience(mock_fetch, mock_settings, rsa_keypair, mock_jwks):
    mock_settings.azure_ad_client_id = "different-client-id"
    mock_settings.azure_ad_tenant_id = "test-tenant-id"
    mock_fetch.return_value = mock_jwks

    private_key, _ = rsa_keypair
    payload = {
        "aud": "test-client-id",
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
        "sub": "user-sub-id",
        "preferred_username": "wangm44@corning.com",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    token = jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid"})

    with pytest.raises(AzureADTokenError, match="audience"):
        verify_azure_id_token(token)


@patch("app.utils.azure_ad.settings")
@patch("app.utils.azure_ad._fetch_jwks")
def test_verify_missing_preferred_username(mock_fetch, mock_settings, rsa_keypair, mock_jwks):
    mock_settings.azure_ad_client_id = "test-client-id"
    mock_settings.azure_ad_tenant_id = "test-tenant-id"
    mock_fetch.return_value = mock_jwks

    private_key, _ = rsa_keypair
    payload = {
        "aud": "test-client-id",
        "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
        "sub": "user-sub-id",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    token = jwt.encode(payload, pem, algorithm="RS256", headers={"kid": "test-kid"})

    with pytest.raises(AzureADTokenError, match="claims"):
        verify_azure_id_token(token)
