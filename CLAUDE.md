# D^t Solution Roadmap - Claude 開發規範

## 前後端 Status/Enum 同步檢查

當後端新增狀態值時，前端必須同步更新：
1. TypeScript interface 的類型定義
2. 篩選器的選項列表
3. 顏色/樣式映射表

檢查指令：
```bash
# 後端狀態值
grep -r "status ==" backend/app/
# 前端類型定義
grep -r "status.*:" frontend/src/
```

## UI 標籤更新 - 全面搜尋

更改 UI 顯示標籤時，必須搜尋所有相關頁面：

```bash
grep -r "舊標籤名稱" frontend/src/
```

常見需同步更新的頁面組合：
| 功能 | 相關頁面 |
|------|---------|
| 用戶欄位 | RegisterPage, LoginPage, ProfilePage |
| 資料列表 | 列表頁, 詳情頁, 編輯對話框 |
| 導航元素 | Sidebar, Header, Footer |

## 前端篩選/顯示 Bug 排查順序

當使用者報告「篩選 X 看不到某些資料」：

1. **先查後端查詢邏輯** — `backend/app/services/` 中對應的 filter 條件
2. **再查前端 filter 傳參** — 確認前端傳的值和後端期望一致
3. **最後才查 DB 資料** — 只有確認邏輯正確但資料缺失時才改 DB

❌ 直接改 DB schema/資料結構
✅ 先 grep 相關 service → Read 篩選邏輯 → 定位 bug

## .env 變更後需重啟服務

修改 `backend/.env` 後，必須重啟 uvicorn 才會生效。

| 症狀 | 解決方法 |
|------|---------|
| API 回傳舊設定值 | Ctrl+C 停止，重新執行 uvicorn |
| 前端顯示舊資料 | 重啟後端 + 清除瀏覽器快取 |

## 重構欄位名稱時的檢查清單

改名（如 `id_token` → `access_token`）時必須全域搜尋：
1. TypeScript types/interfaces
2. API request body
3. 元件 props 和 state
4. 測試檔案的 mock 和 payload
5. README / 文件

```bash
grep -r "舊名稱" frontend/src/ backend/ --include="*.ts" --include="*.tsx" --include="*.py"
```
