# Frontend 開發規範

## MSAL.js 登入必須處理兩條路徑

MSAL 登入有 redirect 和 silent 兩條路徑，兩者都需要完整處理結果：

| 情境 | 路徑 | 觸發方式 |
|------|------|---------|
| 首次登入（無快取） | redirect → useEffect 回調 | `loginRedirect` |
| 快取存在時 | `acquireTokenSilent` 直接返回 | 按鈕 click handler |

❌ click handler 只有 `catch`，沒處理 `await ssoLogin()` 的返回值
✅ click handler 用 try/catch/finally 完整處理 authenticated / pending / need_registration + 解除 loading
