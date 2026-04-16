# D^t Quality Roadmap

將 Power BI 報表 `Dt_Solution_Map_for_QA` 轉換為全功能 Web 應用程式，提供 Solution Map 管理、製程視覺化、資料分析與協作編輯能力。

---

## 功能總覽

### Dashboard 儀表板
- **KPI 卡片** — 即時顯示 Solution 總數、MP (Mass Production) 覆蓋率、Developing 與 Planned 數量
- **桑基圖 (Sankey Chart)** — 視覺化呈現 Defect Category → Defect Type → Station → Status 的流向關係
- **工廠覆蓋率表** — 各工廠的 MP 導入百分比排行

### Solution Map 樞紐表
- **矩陣視圖** — Solution × Tank Line 的交叉表，以色塊顯示導入狀態
- **多維篩選** — 依製程 (Process)、站點 (Station)、缺陷類別、工廠、狀態篩選
- **即時編輯** — Editor/Admin 點擊 cell 可直接修改狀態，支援樂觀鎖 (Optimistic Lock) 防止並發衝突
- **批次更新** — 一次更新多筆 Solution Map 狀態

### Process Map 製程地圖
- **流程視覺化** — 以 ECharts 圖表呈現 System → Melting → Finishing 製程流程
- **站點詳情** — 點擊站點節點查看相關 Solution 清單與狀態分佈

### Data Management 資料管理
- **CRUD 操作** — Solutions、Defect Types、Stations、Tank Lines 的新增/編輯/刪除
- **Excel 匯入** — 支援矩陣格式與清單格式，提供預覽確認流程 (Upload → Preview → Confirm)
- **Excel 匯出** — 依篩選條件匯出 .xlsx 檔案
- **範本下載** — 提供標準匯入範本

### Analysis 分析頁面
- **缺陷分析** — 缺陷類型分佈、各工廠覆蓋率對比圖表
- **製程分析** — 各製程 Solution 數量對比、完成度分析

### Admin 管理後台
- **用戶管理** — 審核新用戶註冊 (Approve/Reject)、停用帳號、重設密碼
- **系統設定** — 管理狀態定義 (Status Definition) 的名稱、色碼

### 身份驗證與授權
- **本地帳號** — 帳號密碼登入，密碼以 bcrypt 雜湊儲存
- **註冊審核制** — 新用戶註冊後需管理員審核通過才能使用
- **JWT Token** — Access Token (8hr) + Refresh Token (7 天, HttpOnly Cookie)
- **角色權限** — Viewer (唯讀) / Editor (編輯) / Admin (管理)
- **密碼重設** — Email 重設連結 + 管理員手動重設

---

## 技術架構

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React 18 + TypeScript + Vite                    │
│  Tailwind CSS v4 + shadcn/ui                     │
│  ECharts (Sankey/流程圖) + TanStack Table (樞紐表) │
│  TanStack Query (資料快取) + React Router         │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│  FastAPI + Python 3.11+                          │
│  SQLAlchemy 2.0 + Alembic (Migrations)           │
│  Pydantic v2 (驗證) + JWT (認證)                  │
├─────────────────────────────────────────────────┤
│                  Database                        │
│  MS SQL Server (Production)                      │
│  SQLite (Development)                            │
└─────────────────────────────────────────────────┘
```

---

## 快速開始

### 前置需求

| 軟體 | 最低版本 | 下載連結 |
|------|---------|---------|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 20+ | https://nodejs.org/ |
| npm | 9+ | 隨 Node.js 一同安裝 |
| Git | 2.30+ | https://git-scm.com/downloads |

> **Windows 使用者注意**：安裝 Python 時請勾選 **「Add Python to PATH」**，安裝 Node.js 時請勾選 **「Add to PATH」**。

### 1. Clone 專案

```bash
git clone https://github.com/a23444452/Dt_Quality_Roadmap.git
cd Dt_Quality_Roadmap
```

---

### 2. 啟動 Backend

<details>
<summary><b>macOS / Linux</b></summary>

```bash
# 進入後端目錄
cd backend

# 建立 Python 虛擬環境
python3 -m venv .venv
source .venv/bin/activate

# 安裝依賴
pip install -r requirements.txt

# 建立環境變數檔
cp .env.example .env
# 用文字編輯器開啟 .env，將 JWT_SECRET 改為至少 64 字元的隨機字串
# 例如: JWT_SECRET=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ01

# 執行資料庫遷移
alembic upgrade head

# 載入範例資料
python -m app.seed

# 啟動開發伺服器
uvicorn app.main:app --reload --port 8000
```

</details>

<details open>
<summary><b>Windows (PowerShell)</b></summary>

#### Step 1: 開啟 PowerShell

按 `Win + X` → 選擇「Windows PowerShell」或「終端機」。

#### Step 2: 進入後端目錄並建立虛擬環境

```powershell
cd backend

# 建立虛擬環境
python -m venv .venv

# 啟動虛擬環境
.venv\Scripts\Activate.ps1
```

> **如果出現「無法載入 .ps1 因為這個系統上的指令碼執行已停用」錯誤**，請先執行：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> 然後重新執行 `.venv\Scripts\Activate.ps1`。

啟動成功後，終端機提示符前方會出現 `(.venv)` 字樣。

#### Step 3: 安裝 Python 依賴

```powershell
pip install -r requirements.txt
```

> **如果 `pymssql` 安裝失敗**（Windows 常見），可暫時忽略，開發階段使用 SQLite 不需要此套件：
> ```powershell
> pip install -r requirements.txt 2>$null
> # 或手動安裝除 pymssql 以外的套件
> pip install fastapi uvicorn sqlalchemy alembic pydantic-settings python-jose passlib python-multipart openpyxl httpx pytest pytest-asyncio bcrypt slowapi
> ```

#### Step 4: 建立環境變數檔

```powershell
copy .env.example .env
```

用記事本或 VS Code 開啟 `.env` 檔案，修改 `JWT_SECRET`：

```powershell
notepad .env
```

將 `JWT_SECRET=change-me-to-random-64-chars` 改為一個至少 64 字元的隨機字串，例如：

```
JWT_SECRET=MySecretKeyThatIsAtLeast64CharactersLongForProductionUsePleaseChange
```

儲存並關閉。

#### Step 5: 執行資料庫遷移與載入範例資料

```powershell
# 建立資料庫結構
alembic upgrade head

# 載入範例資料 (包含管理員帳號)
python -m app.seed
```

正常會看到：`Database seeded successfully!`

#### Step 6: 啟動 Backend 伺服器

```powershell
uvicorn app.main:app --reload --port 8000
```

看到以下輸出表示啟動成功：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to stop)
INFO:     Started reloader process
```

驗證：開啟瀏覽器前往 http://localhost:8000/docs ，應可看到 Swagger API 文件。

**保持此終端機視窗開啟，不要關閉。**

</details>

---

### 3. 啟動 Frontend

開啟**新的終端機視窗**（macOS: 新 Terminal 分頁 / Windows: 新的 PowerShell 視窗）。

<details>
<summary><b>macOS / Linux</b></summary>

```bash
# 從專案根目錄進入前端目錄
cd Dt_Quality_Roadmap/frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

</details>

<details open>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# 進入前端目錄 (從專案根目錄)
cd frontend

# 安裝依賴
npm install
```

> **如果出現 `npm: command not found`**，表示 Node.js 未加入 PATH。請重新安裝 Node.js 並確認勾選「Add to PATH」，或手動將 `C:\Program Files\nodejs\` 加入系統環境變數。

```powershell
# 啟動開發伺服器
npm run dev
```

看到以下輸出表示啟動成功：

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

</details>

Frontend 開發伺服器啟動於 http://localhost:5173，已設定 proxy 將 `/api` 請求自動轉發至 Backend (port 8000)。

---

### 4. 登入系統

1. 開啟瀏覽器前往 http://localhost:5173
2. 使用 Seed 資料預設的管理員帳號登入：

| 欄位 | 值 |
|------|---|
| Username | `admin` |
| Password | `Admin123!` |

3. 登入後即可看到 Dashboard，左側 Sidebar 可切換各功能頁面。

---

### 5. 停止伺服器

開發完成後，使用以下方式停止前後端伺服器。

**方法一：在各終端機視窗按 `Ctrl + C`**

如果 Backend 和 Frontend 分別在兩個終端機視窗前景執行，直接在各視窗按 `Ctrl + C` 即可停止。

**方法二：使用指令結束背景程序**

如果伺服器在背景執行，使用以下指令：

<details>
<summary><b>macOS / Linux</b></summary>

```bash
# 停止 Backend
pkill -f uvicorn

# 停止 Frontend
pkill -f vite

# 或一次全部停止
pkill -f "uvicorn|vite"
```

</details>

<details open>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# 停止 Backend
Get-Process | Where-Object { $_.ProcessName -like "*uvicorn*" -or $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force

# 停止 Frontend
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 或使用 taskkill
taskkill /F /IM "python.exe" /FI "WINDOWTITLE eq uvicorn*"
taskkill /F /IM "node.exe"
```

> **注意**：`taskkill /F /IM "node.exe"` 會結束所有 Node.js 程序。如果你有其他 Node.js 應用在執行，建議改用 `Ctrl + C` 在各視窗手動停止。

</details>

**方法三：確認程序已停止**

<details>
<summary><b>macOS / Linux</b></summary>

```bash
# 確認 port 8000 (Backend) 和 5173 (Frontend) 已釋放
lsof -i :8000
lsof -i :5173
# 如果有輸出，表示還有程序佔用，使用 kill <PID> 結束
```

</details>

<details open>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# 確認 port 是否已釋放
netstat -ano | findstr ":8000"
netstat -ano | findstr ":5173"
# 如果有輸出，記下最後一欄的 PID，然後執行：
# taskkill /F /PID <PID>
```

</details>

---

### 常見問題排除

<details>
<summary><b>Q: Windows 上 <code>python</code> 指令找不到？</b></summary>

Windows 可能需要使用 `python` 而非 `python3`。如果兩者都無法使用：

1. 開啟「系統設定」→「應用程式」→「應用程式執行別名」
2. 關閉「應用程式安裝程式 python.exe」和「應用程式安裝程式 python3.exe」
3. 確認 Python 安裝目錄已加入 PATH 環境變數

</details>

<details>
<summary><b>Q: <code>alembic upgrade head</code> 出現 ModuleNotFoundError？</b></summary>

確認虛擬環境已啟動（終端機前方有 `(.venv)` 字樣）。如果沒有：
- macOS/Linux: `source .venv/bin/activate`
- Windows: `.venv\Scripts\Activate.ps1`

</details>

<details>
<summary><b>Q: Frontend 頁面顯示但 API 呼叫失敗 (Network Error)？</b></summary>

確認 Backend 伺服器正在運行（port 8000）。Frontend 的 Vite 開發伺服器會將 `/api` 請求 proxy 到 `http://localhost:8000`，Backend 必須同時啟動。

</details>

<details>
<summary><b>Q: Windows 上 <code>bcrypt</code> 安裝失敗？</b></summary>

嘗試安裝 Microsoft Visual C++ Build Tools：
1. 前往 https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. 下載並安裝，勾選「C++ 建置工具」
3. 重新開啟 PowerShell 並執行 `pip install -r requirements.txt`

</details>

<details>
<summary><b>Q: <code>npm install</code> 很慢或失敗？</b></summary>

嘗試切換 npm registry：
```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

</details>

---

## 使用說明

### 新增使用者

1. 開啟登入頁面，點擊「Register」連結
2. 填寫 Username、Email、Password（需含大小寫字母及數字，至少 8 字元）、Display Name
3. 送出後帳號狀態為「Pending」，需管理員審核
4. 管理員至 **Admin → User Management** 頁面，找到 Pending 用戶，選擇角色後點擊「Approve」

### 管理 Solution Map

1. 進入 **Solution Map** 頁面
2. 使用頂部篩選列縮小顯示範圍（依製程、站點、缺陷類別、工廠）
3. 樞紐表以色塊顯示各 Solution 在各產線的導入狀態：
   - 🟢 **MP** (Mass Production) — 已量產
   - 🟡 **DEV** (Developing) — 開發中
   - 🔵 **PLAN** (Planned) — 已規劃
   - ⚪ **NA** (Not Applicable) — 不適用
   - 🔴 **HOLD** (On Hold) — 暫停
4. **Editor/Admin** 可點擊 cell 修改狀態：
   - 選擇新狀態
   - 可加入備註
   - 系統使用樂觀鎖機制，若其他人同時修改會收到 Conflict 提示

### 匯入 Excel 資料

1. 進入 **Data Management** 頁面
2. 切換至「Import」區域
3. 選擇匯入格式：
   - **List 格式** — 每列一筆記錄 (Solution, Defect Type, Station, Plant, Line, Status)
   - **Matrix 格式** — 行為 Solution，列為產線，值為狀態代碼
4. 拖拽或選擇 Excel 檔案上傳
5. 系統顯示預覽結果：新增筆數、更新筆數、錯誤清單
6. 確認無誤後點擊「Confirm Import」執行匯入

### 匯出 Excel 資料

1. 進入 **Data Management** 頁面的「Export」區域
2. 選擇匯出格式 (List / Matrix)
3. 點擊「Download」按鈕

### 下載匯入範本

1. 進入 **Data Management** 頁面的「Import」區域
2. 點擊「Download Template」按鈕選擇格式

---

## API 端點總覽

| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/auth/login` | POST | 登入 | Public |
| `/api/v1/auth/register` | POST | 註冊 | Public |
| `/api/v1/auth/refresh` | POST | 刷新 Token | Public |
| `/api/v1/auth/forgot-password` | POST | 忘記密碼 | Public |
| `/api/v1/auth/reset-password` | POST | 重設密碼 | Public |
| `/api/v1/solution-map` | GET | 樞紐表資料 | Viewer+ |
| `/api/v1/solution-map/{id}` | PUT | 更新狀態 (含樂觀鎖) | Editor+ |
| `/api/v1/solution-map/batch` | POST | 批次 Upsert | Editor+ |
| `/api/v1/solutions` | CRUD | 解決方案管理 | GET: Viewer+ / Write: Editor+ |
| `/api/v1/defect-categories` | CRUD | 缺陷大類 | GET: Viewer+ / Write: Admin |
| `/api/v1/defect-types` | CRUD | 缺陷類型 | GET: Viewer+ / Write: Admin |
| `/api/v1/processes` | CRUD | 製程 | GET: Viewer+ / Write: Admin |
| `/api/v1/stations` | CRUD | 站點 | GET: Viewer+ / Write: Admin |
| `/api/v1/plants` | CRUD | 工廠 | GET: Viewer+ / Write: Admin |
| `/api/v1/tank-lines` | CRUD | 產線 | GET: Viewer+ / Write: Admin |
| `/api/v1/statuses` | CRUD | 狀態定義 | GET: Viewer+ / Write: Admin |
| `/api/v1/dashboard/summary` | GET | KPI + Sankey | Viewer+ |
| `/api/v1/dashboard/defect-analysis` | GET | 缺陷分析 | Viewer+ |
| `/api/v1/dashboard/process-analysis` | GET | 製程分析 | Viewer+ |
| `/api/v1/import-export/import` | POST | 匯入 Excel | Editor+ |
| `/api/v1/import-export/import/confirm` | POST | 確認匯入 | Editor+ |
| `/api/v1/import-export/export` | GET | 匯出 Excel | Viewer+ |
| `/api/v1/import-export/template` | GET | 下載匯入範本 | Public |
| `/api/v1/users` | GET | 用戶列表 | Admin |
| `/api/v1/users/{id}/approve` | PUT | 審核通過 | Admin |
| `/api/v1/users/{id}/reject` | PUT | 審核拒絕 | Admin |
| `/api/v1/users/{id}/disable` | PUT | 停用帳號 | Admin |
| `/api/v1/users/{id}/reset-password` | PUT | 重設密碼 | Admin |
| `/api/v1/health` | GET | 健康檢查 | Public |

完整 API 文件請啟動 Backend 後前往 http://localhost:8000/docs

---

## 專案結構

```
Dt_Quality_Roadmap/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 進入點
│   │   ├── config.py               # 環境變數設定
│   │   ├── database.py             # SQLAlchemy 引擎
│   │   ├── dependencies.py         # DI (get_db, get_current_user, require_role)
│   │   ├── seed.py                 # 範例資料腳本
│   │   ├── models/                 # 11 個 SQLAlchemy Models
│   │   ├── schemas/                # Pydantic 驗證 Schemas
│   │   ├── routers/                # API 路由
│   │   ├── services/               # 商業邏輯
│   │   ├── middleware/             # Rate Limiting
│   │   └── utils/                  # JWT, bcrypt, Excel 工具
│   ├── alembic/                    # 資料庫遷移
│   ├── tests/                      # 80 個測試
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # 路由 + Provider
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 元件
│   │   │   ├── layout/             # Sidebar, Header, AppLayout
│   │   │   └── charts/             # SankeyChart, StatusBadge
│   │   ├── features/
│   │   │   ├── auth/               # 登入/註冊/密碼重設
│   │   │   ├── dashboard/          # KPI + Sankey + 覆蓋率
│   │   │   ├── solution-map/       # 樞紐表 + 篩選 + 編輯
│   │   │   ├── process-map/        # 製程流程圖
│   │   │   ├── data-management/    # CRUD + 匯入匯出
│   │   │   ├── analysis/           # 缺陷/製程分析
│   │   │   └── admin/              # 用戶管理 + 系統設定
│   │   ├── hooks/                  # useSolutionMap, useReferenceData
│   │   ├── lib/                    # API Client, Query Client
│   │   └── types/                  # TypeScript 型別定義
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── nginx.conf
└── docs/                           # 設計文件 + 實作計畫
```

---

## Docker 部署

### 使用 Docker Compose

```bash
# 1. 建立環境變數檔
cp backend/.env.example backend/.env
# 編輯 .env 設定正式環境的資料庫連線與 JWT_SECRET

# 2. 啟動所有服務
docker-compose up -d --build

# 3. 執行資料庫遷移
docker-compose exec backend alembic upgrade head

# 4. 載入初始資料 (首次部署)
docker-compose exec backend python -m app.seed
```

服務啟動後：
- Frontend: http://localhost (port 80)
- Backend API: http://localhost/api/v1/
- API 文件: http://localhost/api/v1/docs (透過 nginx proxy)

### 環境變數說明

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | 資料庫連線字串 | `sqlite:///./dev.db` |
| `JWT_SECRET` | JWT 簽署金鑰 (至少 64 字元) | `change-me` |
| `JWT_EXPIRY_HOURS` | Access Token 有效時數 | `8` |
| `CORS_ORIGINS` | 允許的前端來源 (逗號分隔) | `http://localhost:5173` |
| `SMTP_HOST` | SMTP 郵件伺服器 | (空) |
| `SMTP_PORT` | SMTP 埠號 | `587` |
| `SMTP_USER` | SMTP 帳號 | (空) |
| `SMTP_PASSWORD` | SMTP 密碼 | (空) |

### MS SQL Server 連線

正式環境使用 MS SQL Server 時，修改 `DATABASE_URL`：

```
DATABASE_URL=mssql+pymssql://username:password@host:1433/database_name
```

---

## 開發指引

### 執行測試

```bash
cd backend
pytest tests/ -v
```

### 新增資料庫遷移

修改 model 後：

```bash
cd backend
alembic revision --autogenerate -m "description of change"
alembic upgrade head
```

### 新增 shadcn/ui 元件

```bash
cd frontend
npx shadcn@latest add <component-name>
```

### TypeScript 型別檢查

```bash
cd frontend
npx tsc --noEmit
```

---

## 安全機制

- **密碼** — bcrypt 雜湊 (cost factor 12)
- **JWT** — HS256 演算法，Access Token 8hr + Refresh Token 7 天 (HttpOnly Cookie)
- **Rate Limiting** — 登入端點 5 次/分鐘
- **SQL Injection 防護** — SQLAlchemy 參數化查詢
- **XSS 防護** — React 自動 escape
- **CORS** — 限制允許的來源
- **稽核日誌** — 所有寫入操作記錄至 audit_log 表
- **樂觀鎖** — Solution Map 更新使用 version 欄位防止並發衝突
- **輸入驗證** — Pydantic v2 嚴格驗證所有 API 輸入

---

## 原始資料來源

- `Dt_Solution_Map_for_QA_New0126.pbit` — Power BI 範本
- `Dt_Solution_Map_for_QA_New0126.pbix` — Power BI 報表
- `TC Finishing D^t Solution Migration_2026.xlsx` — Excel 原始資料

---

## License

[MIT](LICENSE)
