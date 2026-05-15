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
