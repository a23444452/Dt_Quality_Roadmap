# Azure AD SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace LDAP-based Corning AD login with Azure AD SSO using MSAL.js + Authorization Code Flow (PKCE), keeping local account login unchanged.

**Architecture:** Frontend uses `@azure/msal-browser` to redirect users to Azure AD, receives an ID token back via PKCE, then POSTs it to a new backend endpoint that verifies the token signature via Azure AD's JWKS and issues a local JWT. The existing user registration flow (pending → admin approval) is preserved for first-time SSO users.

**Tech Stack:** React 19, @azure/msal-browser, @azure/msal-react, FastAPI, PyJWT, cryptography, python-jose (existing)

---

## File Map

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `backend/app/utils/azure_ad.py` | Fetch JWKS, verify Azure AD ID token signature and claims |

### Backend — Modified Files

| File | Changes |
|------|---------|
| `backend/requirements.txt` | Add `PyJWT`, `cryptography` |
| `backend/app/config.py` | Add `azure_ad_client_id`, `azure_ad_tenant_id` |
| `backend/app/schemas/auth.py` | Add SSO schemas, remove AD schemas |
| `backend/app/routers/auth.py` | Add `/sso-login`, `/sso-register`, remove `/ad-login`, `/ad-register` |
| `backend/app/services/auth_service.py` | Remove `authenticate_ad_user`, `register_ad_user`, `ADAuthResult`, `ADRegistrationConflict` |
| `backend/tests/test_auth.py` | Add SSO endpoint tests |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `frontend/src/lib/msal-config.ts` | MSAL configuration (clientId, tenantId, redirectUri, scopes) |
| `frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx` | Registration dialog for SSO users (no password) |

### Frontend — Modified Files

| File | Changes |
|------|---------|
| `frontend/package.json` | Add `@azure/msal-browser`, `@azure/msal-react` |
| `frontend/src/types/auth.ts` | Add SSO types, remove AD types |
| `frontend/src/features/auth/AuthContext.tsx` | Add `ssoLogin`/`ssoRegister`, remove `adLogin`/`adRegister`, wrap app in MsalProvider |
| `frontend/src/features/auth/LoginPage.tsx` | Replace AD tab with "Sign in with Microsoft" button |

### Frontend — Removed Files

| File | Reason |
|------|--------|
| `frontend/src/features/auth/ADFirstTimeRegisterDialog.tsx` | Replaced by `SSOFirstTimeRegisterDialog.tsx` |

---

## Task 1: Backend — Add dependencies and config

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add PyJWT and cryptography to requirements.txt**

Add these two lines after `python-jose[cryptography]==3.3.*`:

```
PyJWT==2.9.*
cryptography==44.*
```

- [ ] **Step 2: Add Azure AD settings to config.py**

In `backend/app/config.py`, add two fields to the `Settings` class after `admin_notification_emails`:

```python
azure_ad_client_id: str = ""
azure_ad_tenant_id: str = ""
```

- [ ] **Step 3: Add env vars to backend/.env**

Append to `backend/.env`:

```
AZURE_AD_CLIENT_ID=your-client-id-here
AZURE_AD_TENANT_ID=your-tenant-id-here
```

- [ ] **Step 4: Install dependencies**

Run: `cd backend && pip install PyJWT==2.9.* cryptography==44.*`

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/.env
git commit -m "feat(auth): add Azure AD config and dependencies"
```

---

## Task 2: Backend — Implement Azure AD token verification

**Files:**
- Create: `backend/app/utils/azure_ad.py`
- Test: `backend/tests/test_azure_ad.py`

- [ ] **Step 1: Write tests for token verification**

Create `backend/tests/test_azure_ad.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_azure_ad.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement azure_ad.py**

Create `backend/app/utils/azure_ad.py`:

```python
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


def _get_signing_key(token: str, jwks: dict) -> str:
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_azure_ad.py -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/azure_ad.py backend/tests/test_azure_ad.py
git commit -m "feat(auth): add Azure AD ID token verification utility"
```

---

## Task 3: Backend — Add SSO schemas and endpoints

**Files:**
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/services/auth_service.py`

- [ ] **Step 1: Update schemas — add SSO, remove AD**

In `backend/app/schemas/auth.py`:

Remove these classes:
- `ADLoginRequest`
- `ADLoginAuthenticated`
- `ADLoginNeedRegistration`
- `ADLoginPendingApproval`
- `ADRegisterRequest`

Add these classes (at the end of the file):

```python
class SSOLoginRequest(BaseModel):
    id_token: str


class SSOLoginAuthenticated(BaseModel):
    status: Literal["authenticated"] = "authenticated"
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class SSOLoginNeedRegistration(BaseModel):
    status: Literal["need_registration"] = "need_registration"
    username: str
    email: str
    display_name: str


class SSOLoginPendingApproval(BaseModel):
    status: Literal["pending_approval"] = "pending_approval"
    username: str


class SSORegisterRequest(BaseModel):
    id_token: str
    plant_ids: list[int] = []
    process_ids: list[int] = []
```

- [ ] **Step 2: Update auth_service.py — remove AD functions**

In `backend/app/services/auth_service.py`:

Remove these items:
- `from app.utils.ldap_validation import check_account_and_password` (line 11)
- Class `ADAuthResult` (lines 76–106)
- Class `ADRegistrationConflict` (lines 109–113)
- Function `authenticate_ad_user` (lines 91–106)
- Function `register_ad_user` (lines 116–174)

Keep: `_AD_USER_SENTINEL_PREFIX`, `_unusable_password_hash()`, `authenticate_user`, `register_user`, `create_reset_token`, `reset_password`.

- [ ] **Step 3: Update routers/auth.py — remove AD endpoints, add SSO**

Replace the imports at the top of `backend/app/routers/auth.py`:

```python
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app.middleware.rate_limit import limiter
from app.models.plant import Plant
from app.models.process import Process
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    PlantInfo,
    ProcessInfo,
    RegisterRequest,
    ResetPasswordRequest,
    SSOLoginAuthenticated,
    SSOLoginNeedRegistration,
    SSOLoginPendingApproval,
    SSOLoginRequest,
    SSORegisterRequest,
    UserInfo,
)
from app.schemas.common import ok
from app.services.auth_service import (
    authenticate_user,
    create_reset_token,
    register_user,
    reset_password,
)
from app.utils.azure_ad import AzureADTokenError, verify_azure_id_token
from app.utils.email import send_new_user_registration_notification
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
```

Remove these endpoint functions:
- `ad_login` (the `@router.post("/ad-login")` handler)
- `ad_register` (the `@router.post("/ad-register")` handler)

Add these two new endpoints (after `_issue_tokens` helper):

```python
@router.post("/sso-login")
@limiter.limit("10/minute")
def sso_login(
    request: Request,
    body: SSOLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        claims = verify_azure_id_token(body.id_token)
    except AzureADTokenError as exc:
        status = 503 if "try again" in str(exc) else 401
        raise HTTPException(status_code=status, detail=str(exc))

    username = claims["preferred_username"].split("@")[0].lower()

    user = db.query(User).filter(func.lower(User.username) == username).first()

    if user is None:
        return ok(
            SSOLoginNeedRegistration(
                username=username,
                email=claims.get("email", ""),
                display_name=claims.get("name", ""),
            ).model_dump()
        )
    if user.status == "pending":
        return ok(SSOLoginPendingApproval(username=username).model_dump())
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is inactive. Contact an administrator.")

    login_payload = _issue_tokens(user, response)
    return ok(
        SSOLoginAuthenticated(
            access_token=login_payload.access_token,
            expires_in=login_payload.expires_in,
            user=login_payload.user,
        ).model_dump()
    )


@router.post("/sso-register", status_code=201)
@limiter.limit("3/minute")
def sso_register(request: Request, body: SSORegisterRequest, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError

    try:
        claims = verify_azure_id_token(body.id_token)
    except AzureADTokenError as exc:
        status = 503 if "try again" in str(exc) else 401
        raise HTTPException(status_code=status, detail=str(exc))

    username = claims["preferred_username"].split("@")[0].lower()
    email = claims.get("email", "").strip().lower()
    display_name = claims.get("name", username)

    existing = db.query(User).filter(func.lower(User.username) == username).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Account already exists for '{username}'.")

    if email:
        existing_email = db.query(User).filter(func.lower(User.email) == email).first()
        if existing_email is not None:
            raise HTTPException(status_code=409, detail=f"Account with email '{email}' already exists.")

    from app.services.auth_service import _unusable_password_hash

    user = User(
        username=username,
        email=email,
        password_hash=_unusable_password_hash(),
        display_name=display_name,
        role="viewer",
        status="pending",
    )

    if body.plant_ids:
        plants = db.query(Plant).filter(Plant.id.in_(body.plant_ids)).all()
        user.plants = plants

    if body.process_ids:
        processes = db.query(Process).filter(Process.id.in_(body.process_ids)).all()
        user.processes = processes

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    if settings.admin_notification_emails:
        admin_emails = [e.strip() for e in settings.admin_notification_emails.split(",") if e.strip()]
    else:
        admin_emails = [
            u.email
            for u in db.query(User).filter(User.role == "admin", User.status == "active").all()
            if u.email
        ]
    if admin_emails:
        send_new_user_registration_notification(
            admin_emails=admin_emails,
            username=user.username,
            display_name=user.display_name,
            email=user.email,
        )

    return ok(
        {
            "id": user.id,
            "username": user.username,
            "status": user.status,
            "message": "Registration submitted. Awaiting admin approval.",
        }
    )
```

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All existing tests pass (AD-specific tests may need removal if they exist)

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/routers/auth.py backend/app/services/auth_service.py
git commit -m "feat(auth): add SSO login/register endpoints, remove AD endpoints"
```

---

## Task 4: Backend — Add SSO endpoint tests

**Files:**
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: Add SSO endpoint tests**

Append to `backend/tests/test_auth.py`:

```python
from unittest.mock import patch


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_new_user(mock_verify, client):
    mock_verify.return_value = {
        "preferred_username": "newuser@corning.com",
        "email": "newuser@corning.com",
        "name": "New User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "need_registration"
    assert data["data"]["username"] == "newuser"
    assert data["data"]["email"] == "newuser@corning.com"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_active_user(mock_verify, client, active_user):
    mock_verify.return_value = {
        "preferred_username": "testuser@corning.com",
        "email": "test@example.com",
        "name": "Test User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "authenticated"
    assert "access_token" in data["data"]
    assert data["data"]["user"]["username"] == "testuser"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_pending_user(mock_verify, client):
    # First register a user so they are pending
    client.post("/api/v1/auth/register", json={
        "username": "pendingsso",
        "email": "pending@corning.com",
        "password": "SecurePass1",
        "display_name": "Pending User",
    })
    mock_verify.return_value = {
        "preferred_username": "pendingsso@corning.com",
        "email": "pending@corning.com",
        "name": "Pending User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["status"] == "pending_approval"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_invalid_token(mock_verify, client):
    from app.utils.azure_ad import AzureADTokenError
    mock_verify.side_effect = AzureADTokenError("Invalid or expired SSO token")
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "bad-token"})
    assert resp.status_code == 401


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_register_success(mock_verify, client):
    mock_verify.return_value = {
        "preferred_username": "ssouser@corning.com",
        "email": "ssouser@corning.com",
        "name": "SSO User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-register", json={
        "id_token": "fake-token",
        "plant_ids": [],
        "process_ids": [],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "pending"
    assert data["data"]["username"] == "ssouser"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_register_duplicate(mock_verify, client, active_user):
    mock_verify.return_value = {
        "preferred_username": "testuser@corning.com",
        "email": "test@example.com",
        "name": "Test User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-register", json={
        "id_token": "fake-token",
        "plant_ids": [],
        "process_ids": [],
    })
    assert resp.status_code == 409
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_auth.py
git commit -m "test(auth): add SSO endpoint tests"
```

---

## Task 5: Frontend — Install MSAL and add config

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Create: `frontend/src/lib/msal-config.ts`

- [ ] **Step 1: Install MSAL packages**

Run: `cd frontend && npm install @azure/msal-browser @azure/msal-react`

- [ ] **Step 2: Create MSAL config**

Create `frontend/src/lib/msal-config.ts`:

```typescript
import { PublicClientApplication, type Configuration } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}
```

- [ ] **Step 3: Add env vars to frontend/.env**

Create or append to `frontend/.env`:

```
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
```

- [ ] **Step 4: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/msal-config.ts frontend/.env
git commit -m "feat(auth): add MSAL configuration and dependencies"
```

---

## Task 6: Frontend — Update auth types

**Files:**
- Modify: `frontend/src/types/auth.ts`

- [ ] **Step 1: Replace auth types**

Rewrite `frontend/src/types/auth.ts`:

```typescript
export interface PlantRef {
  id: number
  name: string
}

export interface ProcessRef {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  display_name: string
  role: 'viewer' | 'editor' | 'admin'
  plants: PlantRef[]
  processes: ProcessRef[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  display_name: string
  plant_ids: number[]
  process_ids: number[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface SSOLoginRequest {
  id_token: string
}

export interface SSORegisterRequest {
  id_token: string
  plant_ids: number[]
  process_ids: number[]
}

export type SSOLoginResult =
  | {
      status: 'authenticated'
      access_token: string
      token_type: string
      expires_in: number
      user: User
    }
  | { status: 'need_registration'; username: string; email: string; display_name: string }
  | { status: 'pending_approval'; username: string }
```

- [ ] **Step 2: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: Errors in AuthContext.tsx and LoginPage.tsx (expected, will fix next)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/auth.ts
git commit -m "feat(auth): update auth types for SSO, remove AD types"
```

---

## Task 7: Frontend — Update AuthContext for SSO

**Files:**
- Modify: `frontend/src/features/auth/AuthContext.tsx`

- [ ] **Step 1: Rewrite AuthContext**

Replace `frontend/src/features/auth/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import apiClient from '@/lib/api-client'
import { msalInstance, loginRequest } from '@/lib/msal-config'
import type {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  SSOLoginResult,
  SSORegisterRequest,
} from '@/types/auth'
import type { ApiResponse } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<string>
  ssoLogin: () => Promise<SSOLoginResult>
  ssoRegister: (data: SSORegisterRequest) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  // Handle MSAL redirect response on page load
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return

    instance.handleRedirectPromise().then((response) => {
      if (response?.idToken) {
        localStorage.setItem('sso_id_token', response.idToken)
      }
    }).catch(() => {
      // Redirect errors are handled in LoginPage
    })
  }, [instance, inProgress])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('sso_id_token')
    setUser(null)
  }, [])

  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      try {
        const resp = await apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh')
        if (resp.data.data?.access_token) {
          localStorage.setItem('access_token', resp.data.data.access_token)
        }
      } catch {
        logout()
      }
    }, (8 * 60 - 5) * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [user, logout])

  const login = useCallback(async (data: LoginRequest) => {
    const resp = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data)
    const loginData = resp.data.data!
    localStorage.setItem('access_token', loginData.access_token)
    localStorage.setItem('user', JSON.stringify(loginData.user))
    setUser(loginData.user)
  }, [])

  const register = useCallback(async (data: RegisterRequest): Promise<string> => {
    const resp = await apiClient.post<ApiResponse<{ message: string }>>('/auth/register', data)
    return resp.data.data!.message
  }, [])

  const ssoLogin = useCallback(async (): Promise<SSOLoginResult> => {
    let idToken = localStorage.getItem('sso_id_token')

    if (!idToken) {
      // Initiate redirect — this will navigate away from the page
      await instance.loginRedirect(loginRequest)
      // This line won't be reached due to redirect
      throw new Error('Redirecting to Azure AD')
    }

    localStorage.removeItem('sso_id_token')

    const resp = await apiClient.post<ApiResponse<SSOLoginResult>>('/auth/sso-login', { id_token: idToken })
    const result = resp.data.data!

    if (result.status === 'authenticated') {
      localStorage.setItem('access_token', result.access_token)
      localStorage.setItem('user', JSON.stringify(result.user))
      setUser(result.user)
    }

    return result
  }, [instance])

  const ssoRegister = useCallback(async (data: SSORegisterRequest): Promise<string> => {
    const resp = await apiClient.post<ApiResponse<{ message: string }>>('/auth/sso-register', data)
    return resp.data.data!.message
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, ssoLogin, ssoRegister, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: Errors only in LoginPage.tsx (will fix next)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/AuthContext.tsx
git commit -m "feat(auth): rewrite AuthContext with SSO support"
```

---

## Task 8: Frontend — Create SSOFirstTimeRegisterDialog

**Files:**
- Create: `frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx`:

```typescript
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface ReferenceOption {
  id: number
  name: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

interface Props {
  open: boolean
  idToken: string
  username: string
  email: string
  displayName: string
  onSubmitted: (message: string) => void
  onCancel: () => void
}

export function SSOFirstTimeRegisterDialog({
  open,
  idToken,
  username,
  email,
  displayName,
  onSubmitted,
  onCancel,
}: Props) {
  const { ssoRegister } = useAuth()

  const [plantIds, setPlantIds] = useState<number[]>([])
  const [processIds, setProcessIds] = useState<number[]>([])
  const [options, setOptions] = useState<ReferenceOptions>({ plants: [], processes: [] })
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setOptionsLoading(true)
    apiClient
      .get<ApiResponse<ReferenceOptions>>('/reference/options')
      .then((resp) => {
        if (resp.data.data) setOptions(resp.data.data)
      })
      .finally(() => setOptionsLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) {
      setPlantIds([])
      setProcessIds([])
      setError(null)
    }
  }, [open])

  const togglePlant = (id: number) => {
    setPlantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleProcess = (id: number) => {
    setProcessIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (plantIds.length === 0 || processIds.length === 0) {
      setError('Please select at least one plant and one process.')
      return
    }

    setIsSubmitting(true)
    try {
      const message = await ssoRegister({
        id_token: idToken,
        plant_ids: plantIds,
        process_ids: processIds,
      })
      onSubmitted(message || 'Registration submitted. Awaiting admin approval.')
    } catch (err) {
      const axiosError = err as {
        response?: { status?: number; data?: { detail?: string } }
      }
      if (axiosError.response?.status === 409) {
        setError(axiosError.response.data?.detail ?? 'This account is already registered.')
      } else if (axiosError.response?.status === 401) {
        setError('SSO session expired. Please sign in again.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete your registration</DialogTitle>
          <DialogDescription>
            Welcome <b>{displayName || username}</b>! Select your plant and process assignments.
            An administrator will approve your access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Name</Label>
            <Input type="text" value={displayName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} disabled />
          </div>

          {!optionsLoading && (
            <>
              <div className="space-y-2">
                <Label>Plant (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options.plants.map((plant) => (
                    <label
                      key={plant.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={plantIds.includes(plant.id)}
                        onCheckedChange={() => togglePlant(plant.id)}
                      />
                      {plant.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Process (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {options.processes.map((proc) => (
                    <label
                      key={proc.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={processIds.includes(proc.id)}
                        onCheckedChange={() => toggleProcess(proc.id)}
                      />
                      {proc.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || optionsLoading}>
              {isSubmitting ? 'Submitting...' : 'Submit for approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors in this file

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx
git commit -m "feat(auth): add SSO first-time registration dialog"
```

---

## Task 9: Frontend — Rewrite LoginPage

**Files:**
- Modify: `frontend/src/features/auth/LoginPage.tsx`
- Delete: `frontend/src/features/auth/ADFirstTimeRegisterDialog.tsx`

- [ ] **Step 1: Rewrite LoginPage**

Replace `frontend/src/features/auth/LoginPage.tsx`:

```typescript
import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useAuth } from './AuthContext'
import { SSOFirstTimeRegisterDialog } from './SSOFirstTimeRegisterDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

export function LoginPage() {
  const { ssoLogin, login } = useAuth()
  const navigate = useNavigate()

  const [ssoError, setSsoError] = useState<string | null>(null)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [ssoInfo, setSsoInfo] = useState<string | null>(null)

  const [localUsername, setLocalUsername] = useState('')
  const [localPassword, setLocalPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const [registerDialog, setRegisterDialog] = useState<{
    open: boolean
    idToken: string
    username: string
    email: string
    displayName: string
  }>({ open: false, idToken: '', username: '', email: '', displayName: '' })

  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<{ admin_emails: string[]; app_url: string }>>('/reference/system-config')
      return resp.data.data ?? { admin_emails: [], app_url: '' }
    },
    staleTime: 300000,
  })

  // Handle SSO redirect response on mount
  useEffect(() => {
    const idToken = localStorage.getItem('sso_id_token')
    if (!idToken) return

    setSsoLoading(true)
    ssoLogin()
      .then((result) => {
        if (result.status === 'authenticated') {
          navigate('/', { replace: true })
        } else if (result.status === 'pending_approval') {
          setSsoInfo('Your account is awaiting administrator approval.')
        } else if (result.status === 'need_registration') {
          setRegisterDialog({
            open: true,
            idToken,
            username: result.username,
            email: result.email,
            displayName: result.display_name,
          })
        }
      })
      .catch((err) => {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } }
        if (axiosError.response?.status === 401) {
          setSsoError('SSO verification failed. Please sign in again.')
        } else if (axiosError.response?.status === 503) {
          setSsoError('Service temporarily unavailable. Please try again.')
        } else if (err instanceof Error && err.message === 'Redirecting to Azure AD') {
          // Expected — redirect in progress
        } else {
          setSsoError('Sign-in failed. Please try again.')
        }
      })
      .finally(() => setSsoLoading(false))
  }, [ssoLogin, navigate])

  const handleSSOClick = async () => {
    setSsoError(null)
    setSsoInfo(null)
    setSsoLoading(true)
    try {
      await ssoLogin()
    } catch (err) {
      if (err instanceof Error && err.message === 'Redirecting to Azure AD') {
        return
      }
      setSsoError('Sign-in failed. Please try again.')
      setSsoLoading(false)
    }
  }

  const handleLocalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setLocalSubmitting(true)
    try {
      await login({ username: localUsername, password: localPassword })
      navigate('/', { replace: true })
    } catch {
      setLocalError('Invalid username or password. Please try again.')
    } finally {
      setLocalSubmitting(false)
    }
  }

  const handleRegistrationSubmitted = (message: string) => {
    setRegisterDialog({ open: false, idToken: '', username: '', email: '', displayName: '' })
    setRegisterSuccess(message)
  }

  if (registerSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registration Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{registerSuccess}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setRegisterSuccess(null)}>
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Access D^t Solution Roadmap</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {ssoError && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {ssoError}
            </div>
          )}
          {ssoInfo && (
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {ssoInfo}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSSOClick}
            disabled={ssoLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {ssoLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleLocalSubmit} className="space-y-4">
            {localError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {localError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="local-username">Username</Label>
              <Input
                id="local-username"
                type="text"
                autoComplete="username"
                required
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="local-password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="local-password"
                type="password"
                autoComplete="current-password"
                required
                value={localPassword}
                onChange={(e) => setLocalPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={localSubmitting}>
              {localSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-foreground underline-offset-4 hover:underline font-medium"
              >
                Register
              </Link>
            </p>
          </form>
        </CardContent>

        {systemConfig?.admin_emails && systemConfig.admin_emails.length > 0 && (
          <div className="border-t px-6 py-4">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
              <Mail size={12} />
              Admin Contact
            </p>
            {systemConfig.admin_emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="block text-xs text-muted-foreground hover:text-foreground"
              >
                {email}
              </a>
            ))}
          </div>
        )}
      </Card>

      <SSOFirstTimeRegisterDialog
        open={registerDialog.open}
        idToken={registerDialog.idToken}
        username={registerDialog.username}
        email={registerDialog.email}
        displayName={registerDialog.displayName}
        onSubmitted={handleRegistrationSubmitted}
        onCancel={() => setRegisterDialog({ open: false, idToken: '', username: '', email: '', displayName: '' })}
      />
    </div>
  )
}
```

- [ ] **Step 2: Delete ADFirstTimeRegisterDialog**

Delete file: `frontend/src/features/auth/ADFirstTimeRegisterDialog.tsx`

- [ ] **Step 3: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/auth/LoginPage.tsx frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx
git rm frontend/src/features/auth/ADFirstTimeRegisterDialog.tsx
git commit -m "feat(auth): replace AD login with Azure AD SSO button"
```

---

## Task 10: Integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Start dev servers and verify login page**

Run backend: `cd backend && uvicorn app.main:app --reload`
Run frontend: `cd frontend && npm run dev`

Verify in browser at `http://localhost:5173/login`:
- "Sign in with Microsoft" button appears at top
- "or" separator visible
- Local account form below
- No "Corning AD" tab

- [ ] **Step 4: Final commit (if any linting fixes needed)**

```bash
git add -A
git commit -m "chore: cleanup after Azure AD SSO integration"
```
