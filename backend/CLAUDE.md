# Backend 開發規範

## Email 發送順序原則

當操作會修改 user.email 時，必須：
1. **先**保存 `original_email = user.email`
2. **先**發送通知到 original_email
3. **後**修改 user.email

```python
# ✅ 正確順序
original_email = user.email
send_notification(user_email=original_email, ...)
user.email = f"{user.email}_disabled_{user.id}"
db.commit()

# ❌ 錯誤順序
user.email = f"{user.email}_disabled_{user.id}"
send_notification(user_email=user.email, ...)  # 發送到錯誤地址！
```

適用場景：disable_user, reject_user 等會修改 email 的操作

## Solution Map 篩選架構

| 篩選層級 | 欄位 | 來源 |
|----------|------|------|
| Process Category | `process.category` | Melting / Finishing / System |
| Process | `process.name` | CBW, INSP, DP, System... |
| Station | `station.name` | System(Overall), System(CBW)... |

注意：Station 名稱含括號，如 `System(Overall)` 非 `System`

## .env NTLM 格式：單反斜線

LDAP NTLM 帳號格式必須用**單反斜線**：

| .env 寫法 | pydantic-settings 讀到的值 | 結果 |
|-----------|---------------------------|------|
| `LDAP_BIND_DN=ap\wangm44` | `ap\wangm44` | ✅ 正確 |
| `LDAP_BIND_DN=ap\\wangm44` | `ap\\wangm44` | ❌ NTLM 失敗 |

pydantic-settings 不做反斜線轉義，寫什麼就讀什麼。

## Azure AD Access Token vs ID Token

| 欄位 | ID Token | Access Token |
|------|----------|--------------|
| aud | `{client_id}` | `api://{client_id}` |
| iss | `https://login.microsoftonline.com/{tenant}/v2.0` | `https://sts.windows.net/{tenant}/` |
| username | `preferred_username` | `upn` |

修改 token 類型時，三個驗證欄位都要同步更新。

## Corning LDAP 查詢必須用 NTLM 認證

ap.corning.com 不支援 Anonymous Bind。所有 LDAP 查詢必須：
1. 使用 NTLM 認證（`authentication=NTLM`）
2. 提供 service account（格式：`ap\account`）
3. Python 3.13 需要 MD4 patch（OpenSSL 3.0 預設停用 MD4）

遞迴群組查詢使用 OID `1.2.840.113556.1.4.1941`。
