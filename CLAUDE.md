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

## .env 變更後需重啟服務

修改 `backend/.env` 後，必須重啟 uvicorn 才會生效。

| 症狀 | 解決方法 |
|------|---------|
| API 回傳舊設定值 | Ctrl+C 停止，重新執行 uvicorn |
| 前端顯示舊資料 | 重啟後端 + 清除瀏覽器快取 |
