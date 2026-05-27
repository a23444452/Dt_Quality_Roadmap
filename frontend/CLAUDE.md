# Frontend 開發規範

## MSAL.js 登入必須處理兩條路徑

MSAL 登入有 redirect 和 silent 兩條路徑，兩者都需要完整處理結果：

| 情境 | 路徑 | 觸發方式 |
|------|------|---------|
| 首次登入（無快取） | redirect → useEffect 回調 | `loginRedirect` |
| 快取存在時 | `acquireTokenSilent` 直接返回 | 按鈕 click handler |

❌ click handler 只有 `catch`，沒處理 `await ssoLogin()` 的返回值
✅ click handler 用 try/catch/finally 完整處理 authenticated / pending / need_registration + 解除 loading

## MSAL.js 需要 Secure Context（HTTPS）

MSAL.js 使用 `window.crypto.subtle` 進行 PKCE，該 API 僅在 Secure Context 下可用：
- `localhost` → 自動視為 secure，不需 HTTPS
- LAN IP (如 `192.168.x.x`) → **必須 HTTPS**，否則 `crypto.subtle` 為 undefined

開發環境透過 `@vitejs/plugin-basic-ssl` 啟用自簽憑證：
```ts
// vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl'
plugins: [react(), tailwindcss(), basicSsl()]
server: { host: '0.0.0.0' }  // 綁定所有介面，允許 LAN 連入
```

| 存取方式 | HTTPS 需求 | SSO 可用 |
|----------|-----------|---------|
| `localhost:5173` | 不需要 | ✅ |
| `192.168.x.x:5173` | 需要 | ❌ 沒 HTTPS 會失敗 |
| `https://192.168.x.x:5173` | basicSsl | ✅ (瀏覽器需接受自簽憑證) |
