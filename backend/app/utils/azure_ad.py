from __future__ import annotations

import logging
import time

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm

from app.config import settings

logger = logging.getLogger(__name__)

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_TTL_SECONDS = 86400


class AzureADTokenError(Exception):
    pass


def _fetch_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache is not None and (now - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    url = (
        f"https://login.microsoftonline.com/"
        f"{settings.azure_ad_tenant_id}/discovery/v2.0/keys"
    )
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = now
        return _jwks_cache
    except Exception as exc:
        if _jwks_cache is not None:
            logger.warning("JWKS fetch failed, using cached keys: %s", exc)
            return _jwks_cache
        raise AzureADTokenError("Unable to verify SSO token, try again") from exc


def _get_signing_key(token: str, jwks: dict):
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    if not kid:
        raise AzureADTokenError("Token missing kid header")

    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return RSAAlgorithm.from_jwk(key_data)

    raise AzureADTokenError("Signing key not found in JWKS")


def verify_azure_id_token(id_token: str) -> dict:
    jwks = _fetch_jwks()
    public_key = _get_signing_key(id_token, jwks)

    expected_issuer = (
        f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}/v2.0"
    )

    try:
        claims = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.azure_ad_client_id,
            issuer=expected_issuer,
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AzureADTokenError("Invalid or expired SSO token") from exc
    except jwt.InvalidAudienceError as exc:
        raise AzureADTokenError("Token not issued for this application (audience mismatch)") from exc
    except jwt.InvalidIssuerError as exc:
        raise AzureADTokenError("Invalid token issuer") from exc
    except jwt.PyJWTError as exc:
        raise AzureADTokenError("Invalid or expired SSO token") from exc

    if "preferred_username" not in claims:
        raise AzureADTokenError("Invalid token claims (missing preferred_username)")

    return claims
