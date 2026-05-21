# Azure AD SSO Authentication Design

## Summary

Replace the existing Corning AD (LDAP bind) authentication with Azure AD SSO using MSAL.js + Authorization Code Flow with PKCE. Local account login remains unchanged.

## Architecture

```
Frontend (MSAL.js)          Azure AD (Entra ID)          Backend (FastAPI)
       │                           │                           │
       │  1. loginRedirect()       │                           │
       ├──────────────────────────►│                           │
       │                           │                           │
       │  2. Redirect + auth code  │                           │
       │◄──────────────────────────┤                           │
       │  (MSAL exchanges via PKCE)│                           │
       │                           │                           │
       │  3. POST /sso-login {id_token}                        │
       ├───────────────────────────────────────────────────────►│
       │                                                        │
       │  4. Verify token (JWKS) → lookup user → issue JWT     │
       │◄───────────────────────────────────────────────────────┤
       │                                                        │
```

## Login Flow

1. User clicks "Sign in with Microsoft" on Login page
2. MSAL.js initiates redirect to Azure AD login
3. User authenticates (or SSO session auto-passes)
4. Azure AD redirects back; MSAL exchanges auth code for ID token (PKCE)
5. Frontend POSTs ID token to `POST /api/v1/auth/sso-login`
6. Backend verifies ID token signature via Azure AD JWKS
7. Backend extracts `preferred_username` (NT account), `email`, `name`
8. DB lookup:
   - User exists + active → issue JWT (same as existing login)
   - User exists + pending → return `{ status: "pending_approval" }`
   - User not found → return `{ status: "need_registration", username, email, display_name }`
9. If `need_registration`: frontend shows registration dialog (plant/process selection, no password)

## Frontend Changes

### New Dependencies

- `@azure/msal-browser`
- `@azure/msal-react`

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/msal-config.ts` | MSAL configuration (clientId, tenantId, redirectUri, scopes) |
| `frontend/src/features/auth/SSOFirstTimeRegisterDialog.tsx` | Registration dialog for SSO users (no password field) |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/features/auth/AuthContext.tsx` | Remove `adLogin`/`adRegister`, add `ssoLogin`/`ssoRegister` |
| `frontend/src/features/auth/LoginPage.tsx` | Replace "Corning AD" tab with "Sign in with Microsoft" button |
| `frontend/src/types/auth.ts` | Add SSO-related types, remove AD types |

### Environment Variables

```
VITE_AZURE_CLIENT_ID=<app-client-id>
VITE_AZURE_TENANT_ID=<tenant-id>
```

### MSAL Configuration

```typescript
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' },
}

export const loginRequest = { scopes: ['openid', 'profile', 'email'] }
```

### Login Page Layout

- Top: "Sign in with Microsoft" button (full-width, Microsoft branding)
- Separator: "or"
- Bottom: "Local Account" form (unchanged)
- No more tabs — single page with both options visible

## Backend Changes

### New Dependencies

- `PyJWT` (decode + verify Azure AD tokens)
- `cryptography` (RS256 signature verification)

### New Files

| File | Purpose |
|------|---------|
| `backend/app/utils/azure_ad.py` | `verify_azure_id_token()` — fetches JWKS, verifies signature/claims |

### New Endpoints

#### `POST /api/v1/auth/sso-login`

Request: `{ id_token: string }`

Response (one of):
- `{ status: "authenticated", access_token, expires_in, user }` — success
- `{ status: "need_registration", username, email, display_name }` — new user
- `{ status: "pending_approval", username }` — awaiting admin

#### `POST /api/v1/auth/sso-register`

Request: `{ id_token: string, plant_ids: int[], process_ids: int[] }`

Response: `{ id, username, status: "pending", message }` — same as existing register

### Modified Files

| File | Changes |
|------|---------|
| `backend/app/config.py` | Add `azure_ad_client_id`, `azure_ad_tenant_id` |
| `backend/app/schemas/auth.py` | Add SSO schemas, remove AD schemas |
| `backend/app/routers/auth.py` | Add SSO endpoints, remove AD endpoints |
| `backend/app/services/auth_service.py` | Remove `authenticate_ad_user`, `register_ad_user` |

### Removed Endpoints

- `POST /api/v1/auth/ad-login`
- `POST /api/v1/auth/ad-register`

### Environment Variables

```
AZURE_AD_CLIENT_ID=<app-client-id>
AZURE_AD_TENANT_ID=<tenant-id>
```

### Token Verification (`azure_ad.py`)

- Fetch JWKS from `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys`
- Cache JWKS in memory (TTL 24h)
- Verify: signature (RS256), `aud` == client_id, `iss` == expected issuer, `exp` not expired
- Extract: `preferred_username`, `email`, `name`

## Security

### Token Validation Checks

| Check | Rejection |
|-------|-----------|
| `aud` != client_id | 401 "Token not issued for this application" |
| `iss` != expected issuer | 401 "Invalid token issuer" |
| `exp` expired | 401 "Invalid or expired SSO token" |
| Signature invalid | 401 "Invalid or expired SSO token" |
| Missing `preferred_username` | 401 "Invalid token claims" |
| JWKS unreachable | 503 "Unable to verify SSO token, try again" |

### Rate Limiting

- `/sso-login`: 10/minute
- `/sso-register`: 3/minute

## Error Handling

### Frontend

| Scenario | UX |
|----------|-----|
| MSAL login cancelled | Return to login page silently |
| MSAL login failed | "Sign-in failed. Please try again." |
| Backend 401 | "SSO verification failed. Please sign in again." |
| Backend 503 | "Service temporarily unavailable. Please try again." |
| Backend 403 | Show message from response detail |

### Backend

- All token verification errors → 401 with descriptive message
- Network errors fetching JWKS → 503
- User inactive → 403
- Registration conflict → 409

## Files Retained (Not Removed)

- `backend/app/utils/ldap_validation.py` — kept but no longer called by SSO flow
- `backend/tests/test_auth.py` — update to test SSO endpoints instead of AD

## Azure AD App Registration Requirements

- Platform: Single-page application (SPA)
- Redirect URI: `http://localhost:5173` (dev) + production URL
- Supported account types: Single tenant (Corning only)
- API permissions: `openid`, `profile`, `email` (delegated)
- No client secret needed (public client with PKCE)
