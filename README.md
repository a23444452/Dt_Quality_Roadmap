# D^t Solution Roadmap

將 Power BI 報表 `Dt_Solution_Map_for_QA` 轉換為全功能 Web 應用程式，提供 Solution Map 管理、製程視覺化、資料分析與協作編輯能力。支援從 Excel 檔案動態匯入完整資料，包含 Tank/Line 類型區分與 Quality Attribute 品質屬性。

---

## 功能總覽

### Dashboard 儀表板
- **KPI 卡片** — 即時顯示 Solution 總數、MP (Mass Production) 覆蓋率、Developing 與 Planned 數量
- **Plant 篩選** — KPI 卡片支援依 Plant 下拉選單篩選，查看各工廠的統計數據
- **完整狀態明細** — Total Solutions 卡片顯示所有狀態數量：MP + Developing + Planned + Initiation + Resource Constrain
- **計算說明** — 每張 KPI 卡片下方顯示計算方式（如「15 MP + 20 Developing + 10 Planned」）
- **桑基圖 (Sankey Chart)** — 視覺化呈現 Defect Category → Defect Type → Solution → Plant 的流向關係
- **篩選功能** — 支援依 Defect Category 與 Process 篩選 Sankey 圖資料
- **工廠覆蓋率表** — 各工廠的 MP 導入百分比排行

### Solution Map 樞紐表
- **矩陣視圖** — Solution × Tank Line 的交叉表，以色塊顯示導入狀態
- **六維篩選** — Process Category、Process、Station、Defect Category、Plant、Status 獨立下拉選單
- **級聯篩選** — 選擇 Process Category 後自動篩選 Process 選項，選擇 Process 後自動篩選 Station 選項
- **即時編輯** — Editor/Admin 點擊 cell 可直接修改狀態，支援樂觀鎖 (Optimistic Lock) 防止並發衝突
- **批次更新** — 一次更新多筆 Solution Map 狀態
- **Quality Attribute** — 顯示每個 Solution 的品質屬性
- **Status Definition 說明** — 左上角「Status Definition」按鈕，點擊彈出各狀態的詳細說明（MP、Developing、Initiation 等）

### Process Map 製程地圖
- **互動式流程圖** — 顯示完整製程流程圖片 (Melting → Forming → BOD → CBW → INSP → DP)
- **Process 圓點熱點** — 6 個彩色圓點代表各製程區域，點擊可查看詳細資訊
- **Hover 資訊提示** — 滑鼠移至圓點顯示該 Process 的所有站點名稱與 Solution 數量
- **D^t Solution 表格** — 點擊圓點後在下方顯示該製程的完整 Solution 清單
- **表格欄位** — Station、Solution Name、Quality Attribute、MP Plants（顯示已量產的工廠數量，如「3 Plants」）
- **Process Category 篩選** — 支援依製程類別 (Melting/Finishing/System) 篩選
- **Line Type 篩選** — 支援依產線類型 (Tank/Line) 篩選
- **色彩區分** — 依 Process 著色 (Melting 紅色、Forming 紫色、BOD 橘色、CBW 藍色、INSP 綠色、DP 青色)
- **選取狀態效果** — 選取的圓點放大並帶有發光脈動動畫

### Data Management 資料管理
- **完整 CRUD** — 9 個 Tab 管理所有資料實體：
  - **Solutions** — 解決方案管理，支援 Defect Type 與 Station 下拉選單
  - **Defect Categories** — 缺陷大類管理
  - **Defect Types** — 缺陷類型管理，支援 Category 下拉選單
  - **Processes** — 製程管理，支援 Category 選擇 (Melting/Finishing/System)
  - **Stations** — 站點管理，支援 Process 下拉選單並顯示 Category
  - **Plants** — 工廠管理
  - **Tank Lines** — 產線管理，支援 Plant 下拉選單與 Tank/Line 類型
  - **Import** — Excel 匯入 (矩陣/清單格式)
  - **Export** — Excel 匯出
- **G$ Item 欄位** — Solutions 表格支援標記為 G$ Item（僅 Admin 可編輯）
- **狀態切換** — 編輯對話框支援 Active/Inactive 狀態切換
- **刪除確認** — 刪除操作前彈出確認對話框，避免誤刪
- **權限控制** — 依據使用者的 Plant/Process 權限控制編輯範圍
- **關聯下拉選單** — 所有子層級實體編輯時自動載入父層級選項
- **Excel 匯入** — 支援矩陣格式與清單格式，提供預覽確認流程 (Upload → Preview → Confirm)
- **Excel 匯出** — 依篩選條件匯出 .xlsx 檔案
- **範本下載** — 提供標準匯入範本，含下拉式選單驗證與參考工作表

### Analysis 分析頁面
- **製程分析 (Process Analysis)** — 依 Station 分析 Solution 分佈
  - **Plant 篩選** — 右上角下拉選單選擇特定工廠或全部工廠
  - **堆疊長條圖** — 各 Station 的 Solution 數量，以 Process 顏色區分堆疊，圖表標題顯示總計
  - **Summary Table** — 左側 1/2 寬度表格，列出 Process、Station、Solutions 數量
  - **Solution Details 卡片** — 右側 1/2 寬度，點擊 Summary Table 的 Solutions 數字後顯示該 Station 的所有 Solution
  - **MP Tank/Lines 資訊** — Solution Details 內每個 Solution 顯示已 MP 到哪些 Tank/Lines（依選擇的 Plant 篩選）

### G$ Management
- **G$ Items 管理** — 標記 Solution 為 G$ Item，管理 Goal Sharing 項目
- **G$ Tracking 追蹤** — 2026 年度 Goal Sharing 完成狀態追蹤儀表板
  - **Item Tracking List** — 顯示所有 D^t class 的 G$ Solution 狀態（Complete / Not Complete）
  - **Cumulative Completion Chart** — 月度累計完成數 vs Budget / Stretch 目標趨勢圖
  - **Retrofit view** — 水平條形圖按 Category 分類顯示完成 / 未完成數量
  - **Plant view** — 各工廠堆疊柱狀圖（完成/未完成）搭配 Budget / Stretch 目標線
  - **資料來源** — 讀取 `Quality Roadmap G$ database_Fin_BOD_Dt.xlsx`，Excel 更新後重整頁面即自動反映

### Admin 管理後台
- **用戶管理** — 審核新用戶註冊 (Approve/Reject)、停用帳號、重設密碼
- **狀態篩選** — User Management 提供 5 個分頁：All / Pending / Active / Disabled / Rejected
- **停用確認** — Disable 前彈出確認對話框，避免誤操作
- **帳號釋放** — 被停用或拒絕的用戶，其 username 和 email 會自動釋放，可重新註冊
- **待審核提醒** — Sidebar 的 User Management 旁顯示待審核用戶數量 Badge
- **Email 通知** — 新用戶註冊、審核通過、審核拒絕、帳號停用時自動發送 Email 通知（英文）
- **Admin 聯絡資訊** — Sidebar 下方及登入頁面顯示 Admin 聯絡 Email（從 .env 設定讀取）
- **系統設定** — 管理狀態定義 (Status Definition) 的名稱、色碼

### 身份驗證與授權
- **Azure AD SSO（推薦）** — 點擊「Sign in with Microsoft」按鈕，透過 MSAL.js + PKCE 完成 Azure AD 登入
  - 後端驗證 Access Token 簽章（RS256 / JWKS）
  - 驗證通過後，透過 LDAP 查詢使用者是否屬於 `Quality-Roadmap-Access` AD Group
  - 不在群組 → 403 拒絕；首次登入若系統無此帳號 → 彈出視窗補填 Plant/Process，送出後進入 Pending 等 Admin 審核
  - Username 比對為 case-insensitive，避免大小寫不一致造成重複帳號
- **本地帳號** — 帳號密碼登入，密碼以 bcrypt 雜湊儲存（適用無 Azure AD 的外部人員或測試）
- **註冊審核制** — 新用戶註冊後需管理員審核通過才能使用
- **Plant/Process 選擇** — 註冊時選擇所屬 Plant 與 Process，決定可編輯的資料範圍
- **JWT Token** — Access Token (8hr) + Refresh Token (7 天, HttpOnly Cookie)
- **角色權限** — Viewer (唯讀) / Editor (編輯) / Admin (管理)
- **Cell-level 權限** — Editor 只能編輯自己 Plant 和 Process 範圍內的 Solution Map
- **密碼重設** — Email 重設連結 + 管理員手動重設（僅適用本地帳號）

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

### 快速啟動（腳本一鍵安裝）

使用 `scripts/` 目錄下的腳本，免去手動輸入指令。

#### 首次設定

執行對應平台的 setup 腳本：

<details>
<summary><b>macOS / Linux</b></summary>

```bash
./scripts/setup.sh
```

</details>

<details open>
<summary><b>Windows</b></summary>

| 腳本 | 適用環境 |
|------|----------|
| `scripts\setup.bat` | CMD（命令提示字元），雙擊即可執行 |
| `scripts\setup.ps1` | PowerShell |

> 如果 `.ps1` 無法執行，請先在 PowerShell 中執行：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

</details>

腳本會自動完成以下 6 個步驟：
1. 檢查 Python 和 Node.js 是否已安裝
2. 建立 Python 虛擬環境 (`backend/.venv`)
3. 安裝 Backend 依賴
4. 建立 `.env` 環境變數檔（首次需手動編輯 `JWT_SECRET`）
5. 執行資料庫遷移 + 載入範例資料
6. 安裝 Frontend 依賴

#### 啟動開發伺服器

<details>
<summary><b>macOS / Linux</b></summary>

| 腳本 | 說明 |
|------|------|
| `./scripts/start-dev.sh` | 同時啟動 Backend + Frontend（按 `Ctrl+C` 一次停止全部） |
| `./scripts/start-backend.sh` | 僅啟動 Backend |
| `./scripts/start-frontend.sh` | 僅啟動 Frontend |

</details>

<details open>
<summary><b>Windows</b></summary>

| 腳本 | 說明 |
|------|------|
| `scripts\start-dev.bat` / `.ps1` | 同時啟動 Backend + Frontend（各開一個新視窗） |
| `scripts\start-backend.bat` / `.ps1` | 僅啟動 Backend |
| `scripts\start-frontend.bat` / `.ps1` | 僅啟動 Frontend |

</details>

啟動後：
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 文件: http://localhost:8000/docs

#### 預設管理員帳號

| 欄位 | 值 |
|------|---|
| Username | `admin` |
| Password | `Admin123!` |

> 以下「手動安裝步驟」適用於需要手動控制每個步驟的情況。

---

### 2. 啟動 Backend（手動安裝）

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

### 資料架構概念

系統的資料有**嚴格的層級依賴關係**，必須**由上往下**依序建立：

```
Step 1: Status Definition (狀態定義)
        └─ 系統已預設 7 個：MP, Developing, Initiation, Planned, Resource constrain, No intention, NA

Step 2: Process (製程) → Station (站點)
        └─ 例：Finishing → Coating, Polishing

Step 3: Defect Category (缺陷大類) → Defect Type (缺陷類型)
        └─ 例：Surface → Bubble, Scratch

Step 4: Plant (工廠) → Tank Line (產線)
        └─ 例：Plant Alpha → Line A-1, Line A-2

Step 5: Solution (解決方案)
        └─ 需要指定 Defect Type + Station
        └─ 例：Defect Type "Bubble" + Station "Coating" → "Anti-Bubble Spray"

Step 6: Solution Map (導入狀態)
        └─ 需要 Solution + Tank Line + Status
        └─ 例："Anti-Bubble Spray" × "Line A-1" → MP
```

**重要**：如果某頁面顯示空白或 "No data"，通常是因為 **Solution Map 缺少資料**。Solution Map 是 Dashboard、Process Map、Analysis 等所有統計頁面的資料來源。

### 各頁面的資料來源

| 頁面 | 需要的資料 | 顯示內容 |
|------|-----------|---------|
| **Dashboard** | Solution Map | KPI 統計、Sankey 圖、工廠覆蓋率 |
| **Solution Map** | Solution + Tank Line + Solution Map | 樞紐表矩陣 |
| **Process Map** | Solution (綁定 Station) + Solution Map | 製程流程圖 |
| **Process Analysis** | Process → Station → Solution → Solution Map | 製程分析圖表 |
| **Data Management** | 各項 Reference Data | CRUD 管理表格 |

---

### 方式一：透過前端網頁操作（推薦）

以 **Admin** 帳號登入後，依照以下順序操作。

#### Step 1: 確認狀態定義（Admin → Settings）

前往左側 Sidebar 的 **Settings** 頁面，確認 Status Definition 已存在：

| 代碼 | 名稱 | 色碼 | 說明 |
|------|------|------|------|
| MP | Mass Production | 綠色 (#28A745) | 已量產 |
| DEVELOPING | Developing | 黃色 (#FFC107) | 開發中 |
| INITIATION | Initiation | 青色 (#17A2B8) | 啟動中 |
| PLANNED | Planned | 紫色 (#6F42C1) | 已規劃 |
| RESOURCE_CONSTRAIN | Resource constrain | 橘色 (#FD7E14) | 資源受限 |
| NO_INTENTION | No intention | 灰色 (#6C757D) | 無意導入 |
| NA | Not Applicable | 淺灰 (#ADB5BD) | 不適用 |

> 系統已預設這 7 個狀態，從 Excel 檔案定義載入。如需新增可在此頁面操作。

#### Step 2: 建立基礎參考資料（Data Management）

前往 **Data Management** 頁面，依照以下順序在各 Tab 操作：

**2-1. Plants Tab — 新增工廠**

1. 切換至 **Plants** Tab
2. 點擊 **Add Plant** 按鈕
3. 輸入工廠名稱（如 Plant Alpha）和代碼（如 A）
4. 儲存

**2-2. Tank Lines Tab — 新增產線**

1. 切換至 **Tank Lines** Tab
2. 點擊 **Add Tank Line** 按鈕
3. 選擇所屬 Plant（如 Plant Alpha）
4. 輸入名稱和代碼
5. 選擇類型：**Tank**（熔融槽）或 **Line**（產線）
6. 儲存

**2-3. Processes Tab — 新增製程**

1. 切換至 **Processes** Tab
2. 點擊 **Add Process** 按鈕
3. 選擇 Category（Melting / Finishing / System）
4. 輸入 Process 名稱（如 Forming、BOD、CBW）
5. 儲存

**2-4. Stations Tab — 新增站點**

1. 切換至 **Stations** Tab
2. 點擊 **Add Station** 按鈕
3. 選擇所屬 Process（下拉選單會顯示 Process 名稱與 Category）
4. 輸入 Station 名稱（如 Coating）
5. 儲存

**2-5. Defect Categories Tab — 新增缺陷大類**

1. 切換至 **Defect Categories** Tab
2. 點擊 **Add Defect Category** 按鈕
3. 輸入 Category 名稱（如 Surface、Structural）
4. 儲存

**2-6. Defect Types Tab — 新增缺陷類型**

1. 切換至 **Defect Types** Tab
2. 點擊 **Add Defect Type** 按鈕
3. 選擇所屬 Category（下拉選單）
4. 輸入 Type 名稱（如 Bubble）
5. 儲存

**2-7. Solutions Tab — 新增解決方案**

1. 切換至 **Solutions** Tab
2. 點擊 **Add Solution** 按鈕
3. 選擇 Defect Type（下拉選單會顯示 Type 名稱與 Category）
4. 選擇 Station（下拉選單會顯示 Station 名稱與 Process）
5. 輸入 Solution 名稱（如 Anti-Bubble Spray）
6. 可選填 Quality Attribute 和 Description
7. 儲存

#### Step 3: 設定導入狀態（Solution Map）

前往 **Solution Map** 頁面：

1. 找到要設定的 Solution × Tank Line 交叉格
2. 點擊 cell → 選擇狀態 (MP/DEV/PLAN/NA/HOLD)
3. 可加入備註
4. 點擊「Save」儲存

**狀態色塊說明：**

| 色塊 | 狀態 | 說明 |
|------|------|------|
| 🟢 綠色 | **MP** | Mass Production — 已量產 |
| 🟡 黃色 | **Developing** | 開發中 |
| 🔵 青色 | **Initiation** | 啟動中 |
| 🟣 紫色 | **Planned** | 已規劃 |
| 🟠 橘色 | **Resource constrain** | 資源受限 |
| ⚫ 灰色 | **No intention** | 無意導入 |
| ⚪ 淺灰 | **NA** | Not Applicable — 不適用 |

> **樂觀鎖機制**：如果其他人同時修改了同一筆資料，系統會提示 Conflict，請重新整理後再操作。

#### Step 4: 確認各頁面顯示

完成以上步驟後，以下頁面應可正常顯示資料：
- **Dashboard** — KPI 卡片 + Sankey 圖
- **Solution Map** — 樞紐表
- **Process Map** — 製程流程圖
- **Process Analysis** — 製程分析圖表

---

### 方式二：透過 API（Swagger UI）

適用於建立 Process、Defect Category、Plant 等前端目前無法直接新增的父層級資料。

#### Step 1: 開啟 API 文件

啟動 Backend 後，開啟瀏覽器前往 http://localhost:8000/docs

#### Step 2: 取得 Token

1. 找到 `POST /api/v1/auth/login`
2. 點擊 **Try it out**
3. 輸入：
   ```json
   { "username": "admin", "password": "Admin123!" }
   ```
4. 點擊 **Execute**
5. 複製回傳的 `access_token`
6. 點擊頁面頂部的 **Authorize** 按鈕，貼上 `Bearer <token>`

#### Step 3: 依序呼叫 API 建立資料

按以下順序操作（每一步都需先完成前一步）：

**建立製程：**
```
POST /api/v1/processes
Body: { "name": "Finishing", "description": "後段製程", "sort_order": 3 }
```

**建立站點：**
```
POST /api/v1/stations
Body: { "process_id": 1, "name": "Coating", "sort_order": 1 }
```
> `process_id` 為上一步建立的 Process ID。

**建立缺陷大類：**
```
POST /api/v1/defect-categories
Body: { "name": "Surface", "description": "表面缺陷" }
```

**建立缺陷類型：**
```
POST /api/v1/defect-types
Body: { "category_id": 1, "name": "Bubble" }
```

**建立工廠：**
```
POST /api/v1/plants
Body: { "name": "Plant Alpha", "code": "PA" }
```

**建立產線：**
```
POST /api/v1/tank-lines
Body: { "plant_id": 1, "name": "Line A-1", "code": "A1", "line_type": "Line" }
```
> `line_type` 可為 `"Tank"` 或 `"Line"`（預設為 `"Line"`）

**建立解決方案：**
```
POST /api/v1/solutions
Body: { "defect_type_id": 1, "station_id": 1, "name": "Anti-Bubble Spray", "quality_attribute": "Bubble Control" }
```
> `quality_attribute` 為選填欄位，用於標示 Solution 的品質屬性

**批次設定導入狀態：**
```
POST /api/v1/solution-map/batch
Body: {
  "updates": [
    { "solution_id": 1, "tank_line_id": 1, "status_id": 1 },
    { "solution_id": 1, "tank_line_id": 2, "status_id": 2, "notes": "Testing" }
  ]
}
```
> `status_id`: 1=MP, 2=DEV, 3=PLAN, 4=NA, 5=HOLD（依實際 ID）。

#### API 建立順序速查

| 順序 | API | 依賴 | 新增欄位 |
|------|-----|------|----------|
| 1 | `POST /api/v1/processes` | 無 | |
| 2 | `POST /api/v1/stations` | process_id | |
| 3 | `POST /api/v1/defect-categories` | 無 | |
| 4 | `POST /api/v1/defect-types` | category_id | |
| 5 | `POST /api/v1/plants` | 無 | |
| 6 | `POST /api/v1/tank-lines` | plant_id | `line_type` (Tank/Line) |
| 7 | `POST /api/v1/solutions` | defect_type_id + station_id | `quality_attribute` |
| 8 | `POST /api/v1/solution-map/batch` | solution_id + tank_line_id + status_id | |

---

### 方式三：Excel 匯入（批次操作）

適用於大量資料的批次匯入。

#### Step 1: 下載匯入範本

1. 前往 **Data Management** 頁面的 **Import** 區域
2. 點擊 **Download Template** 按鈕
3. 選擇格式：
   - **List 格式** — 每列一筆記錄，適合少量精確匯入
   - **Matrix 格式** — 矩陣格式（模仿原始 Power BI 報表），適合全量匯入

**範本特色：**
- **下拉式選單驗證** — Defect Type、Station、Plant、Tank/Line、Status 欄位都有下拉選單，減少輸入錯誤
- **Solution Name** — 保持自由輸入，可複製參考工作表中的名稱
- **參考工作表** — 範本包含三個參考 Sheet：
  - `Reference - Solutions` — 所有 Solution 名稱、Defect Type、Station、Process
  - `Reference - Tank_Lines` — 所有 Plant、Tank/Line 名稱、類型 (Tank/Line)
  - `Reference - Statuses` — 所有 Status Code、名稱、說明

#### Step 2: 填寫 Excel

從第 3 列開始填寫資料（第 1 列為標題，第 2 列為範例說明）。

**填寫方式：**
1. **Solution 欄位** — 手動輸入，可從 `Reference - Solutions` 工作表複製
2. **其他欄位** — 點擊儲存格，從下拉選單中選擇（避免輸入錯誤）

**List 格式範例：**

| Solution | Defect Type | Station | Plant | Line | Status |
|----------|-------------|---------|-------|------|--------|
| Anti-Bubble Spray | Bubble | Coating | Plant Alpha | Line A-1 | MP |
| Anti-Bubble Spray | Bubble | Coating | Plant Alpha | Line A-2 | DEVELOPING |
| Anti-Bubble Spray | Bubble | Coating | Plant Beta | Line B-1 | PLANNED |
| Slow Cool Cycle | Crack | Casting | Plant Alpha | Line A-1 | MP |

**Matrix 格式範例：**

| Solution | Defect Type | Station | Plant A \| Line A-1 | Plant A \| Line A-2 | Plant B \| Line B-1 |
|----------|-------------|---------|---------------------|---------------------|---------------------|
| Anti-Bubble Spray | Bubble | Coating | MP | DEVELOPING | PLANNED |
| Slow Cool Cycle | Crack | Casting | MP | NA | DEVELOPING |

> **欄位說明：**
> - Status 欄位使用下拉選單，代碼包含：`MP`、`DEVELOPING`、`INITIATION`、`PLANNED`、`RESOURCE_CONSTRAIN`、`NO_INTENTION`、`NA`
> - 產線欄位名稱（Matrix 格式）格式為 `{工廠名稱} | {Tank/Line 名稱}`
> - 如果 Solution、Defect Type、Station 等尚未在系統中建立，匯入時會報錯，請先在 Data Management 中建立

#### Step 3: 上傳並預覽

1. 在 **Import** 區域選擇對應格式（List / Matrix）
2. 拖拽或選擇 Excel 檔案上傳
3. 系統顯示預覽結果：

   | 項目 | 說明 |
   |------|------|
   | **New Records** | 將新增的筆數 |
   | **Updated Records** | 將更新的筆數 |
   | **Errors** | 格式錯誤（如無效的 Status 代碼） |
   | **Warnings** | 警告（如找不到的產線將自動建立） |

#### Step 4: 確認匯入

1. 確認預覽無嚴重錯誤
2. 點擊 **Confirm Import** 執行匯入
3. 系統回報匯入結果（新增/更新/跳過筆數）

> **注意**：預覽結果有 15 分鐘有效期，超時需重新上傳。

#### Step 5: 匯出現有資料

如需匯出現有資料作為備份或參考：

1. 前往 **Data Management** 頁面的 **Export** 區域
2. 選擇匯出格式（List / Matrix）
3. 點擊 **Download** 按鈕下載 .xlsx 檔案

---

### 新增使用者

#### 前置作業（新使用者必須先完成）

使用 Azure AD SSO 登入前，新使用者需完成以下申請：

| # | 項目 | 負責人 | 說明 |
|---|------|--------|------|
| 1 | **加入 AD Group** | 系統管理員 / IT | 請管理員將使用者的 NT 帳號加入 `Quality-Roadmap-Access` AD Group（ap.corning.com）。未加入此群組的使用者即使 SSO 登入成功，仍會被系統拒絕（403） |
| 2 | **確認 Azure AD 帳號** | 使用者本人 | 確認可正常登入 Microsoft 365（即擁有有效的 Corning Azure AD 帳號） |

> **注意：** AD Group 是系統的「入口閘門」— 不在群組內的使用者連註冊都無法完成。

#### 方式一：Azure AD SSO 登入（推薦 Corning 員工使用）

1. 登入頁面點擊 **「Sign in with Microsoft」** 按鈕
2. 在 Microsoft 登入視窗完成驗證（支援 MFA）
3. 首次登入系統會自動彈出「Complete your registration」視窗
   - 勾選所屬 Plant（可複選）與 Process（可複選）
   - 送出後帳號狀態為「Pending」
4. 管理員至 **Admin → User Management** 頁面審核、指派角色
5. 審核通過後，下次點擊「Sign in with Microsoft」即直接進入系統

#### 方式二：Local Account 註冊（適用無 Azure AD 的外部人員或測試）

1. 登入頁面點擊 **Local Account** Tab，點擊「Register」連結
2. 填寫 Name（顯示名稱）、Account（帳號）、Email、Password（需含大小寫字母及數字，至少 8 字元）
3. 選擇所屬 Plant（可多選）和 Process（可多選），決定可編輯的資料範圍
4. 送出後帳號狀態為「Pending」，需管理員審核
5. 管理員至 **Admin → User Management** 頁面，找到 Pending 用戶，選擇角色後點擊「Approve」

#### 共同事項

- 管理員可隨時在 User Management 頁面修改使用者的 Plant/Process 權限
- 若需聯繫管理員，可點擊登入頁面或 Sidebar 下方的 Admin Contact Email

### API 服務帳號（外部系統整合）

若其他廠的 Dashboard 或自動化系統需要透過 REST API 取得本系統資料，可建立 **Viewer 權限的服務帳號**。

#### 建立服務帳號

```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# 建立預設 api-service 帳號（自動產生 20 字元強密碼）
python -m app.create_service_account

# 建立自訂名稱的服務帳號（如各廠專用）
python -m app.create_service_account --username api-plant-a

# 指定密碼
python -m app.create_service_account --username api-plant-a --password "YourSecret123!"

# 重設現有服務帳號的密碼
python -m app.create_service_account --username api-service --reset
```

執行後會顯示帳號資訊與使用範例，密碼**只會顯示一次**，請妥善保存。

#### 服務帳號使用範例

```bash
# 1. 取得 access token
curl -X POST http://your-server/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "api-service", "password": "xxxxx"}'

# 回傳：{"data": {"access_token": "eyJ...", ...}}

# 2. 呼叫資料 API
curl http://your-server/api/v1/dashboard/summary \
  -H 'Authorization: Bearer eyJ...'
```

#### 可用的 API 端點（Viewer 權限）

| 端點 | 說明 |
|------|------|
| `GET /api/v1/dashboard/summary` | KPI + Sankey 圖資料 |
| `GET /api/v1/dashboard/process-analysis` | 製程分析資料 |
| `GET /api/v1/dashboard/defect-analysis` | 缺陷分析資料 |
| `GET /api/v1/solution-map` | Solution Map 完整資料 |
| `GET /api/v1/solutions` | Solution 清單 |
| `GET /api/v1/plants` | 工廠清單 |
| `GET /api/v1/tank-lines` | 產線清單 |
| `GET /api/v1/statuses` | 狀態定義 |

> **安全性建議**：
> - 每個外部系統/工廠建議使用獨立的服務帳號，方便追蹤與權限管理
> - 密碼請儲存在整合系統的環境變數（如 `.env`），避免寫死在程式碼中
> - 若密碼外洩，執行 `--reset` 即可重設

### 角色權限說明

| 操作 | Viewer | Editor | Admin |
|------|--------|--------|-------|
| 瀏覽所有頁面 | O | O | O |
| 匯出 Excel | O | O | O |
| 編輯 Solution Map 狀態 | X | O (限 Plant/Process 範圍) | O |
| 新增/修改 Solutions | X | O (限 Process 範圍) | O |
| 編輯 G$ Item 欄位 | X | X | O |
| 匯入 Excel | X | O | O |
| 刪除資料 | X | X | O |
| 管理用戶 (Approve/Reject) | X | X | O |
| 編輯使用者 Plant/Process | X | X | O |
| 管理 Reference Data (Process, Category, Plant) | X | X | O |

**Editor 權限範圍說明：**
- Editor 只能編輯自己註冊時選擇的 Plant 和 Process 範圍內的資料
- 新增 Solution 時，Station 下拉選單只會顯示在 Editor 權限範圍內的選項
- Admin 可以在 User Management 頁面修改使用者的 Plant/Process 權限

---

## API 端點總覽

| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/auth/login` | POST | 本地帳號登入 | Public |
| `/api/v1/auth/register` | POST | 本地帳號註冊 | Public |
| `/api/v1/auth/sso-login` | POST | Azure AD SSO 登入（驗 Access Token + AD Group） | Public |
| `/api/v1/auth/sso-register` | POST | SSO 首次登入補填 Plant/Process | Public |
| `/api/v1/auth/refresh` | POST | 刷新 Token | Public |
| `/api/v1/auth/forgot-password` | POST | 忘記密碼 | Public |
| `/api/v1/auth/reset-password` | POST | 重設密碼 | Public |
| `/api/v1/solution-map` | GET | 樞紐表資料 | Viewer+ |
| `/api/v1/solution-map/{id}` | PUT | 更新狀態 (含樂觀鎖) | Editor+ |
| `/api/v1/solution-map/batch` | POST | 批次 Upsert | Editor+ |
| `/api/v1/solutions` | CRUD | 解決方案管理 | GET: Viewer+ / Write: Editor+ / Delete: Admin |
| `/api/v1/defect-categories` | CRUD | 缺陷大類 | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/defect-types` | CRUD | 缺陷類型 | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/processes` | CRUD | 製程 (含 category 欄位) | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/stations` | CRUD | 站點 | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/plants` | CRUD | 工廠 | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/tank-lines` | CRUD | 產線 | GET: Viewer+ / Write: Admin / Delete: Admin |
| `/api/v1/statuses` | CRUD | 狀態定義 | GET: Viewer+ / Write: Admin |
| `/api/v1/dashboard/summary` | GET | KPI + Sankey | Viewer+ |
| `/api/v1/dashboard/defect-analysis` | GET | 缺陷分析 | Viewer+ |
| `/api/v1/dashboard/process-analysis` | GET | 製程分析 | Viewer+ |
| `/api/v1/import-export/import` | POST | 匯入 Excel | Editor+ |
| `/api/v1/import-export/import/confirm` | POST | 確認匯入 | Editor+ |
| `/api/v1/import-export/export` | GET | 匯出 Excel | Viewer+ |
| `/api/v1/import-export/template` | GET | 下載匯入範本 | Public |
| `/api/v1/g-items` | CRUD | G$ Items 管理 | GET: Viewer+ / Write: Admin |
| `/api/v1/g-tracking/data` | GET | G$ Tracking 圖表資料（讀取 Excel） | Viewer+ |
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
│   │   │   ├── dashboard/          # KPI + Sankey + 覆蓋率 + 篩選
│   │   │   ├── solution-map/       # 樞紐表 + 六維篩選 + 級聯邏輯 + 編輯
│   │   │   ├── process-map/        # 生產線流程圖 (蛇形佈局)
│   │   │   ├── data-management/    # 9 Tab CRUD (含 Plant/Process/DefectCategory)
│   │   │   ├── analysis/           # 缺陷/製程分析
│   │   │   ├── g-items/            # G$ Management 管理頁面
│   │   │   ├── g-tracking/         # G$ Tracking 追蹤圖表
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
| `APP_BASE_URL` | 前端網址 (用於 Email 連結) | `http://localhost:5173` |
| `SMTP_HOST` | SMTP 郵件伺服器 (空白則使用 Corning 內部 SMTP) | (空) |
| `SMTP_PORT` | SMTP 埠號 | `587` |
| `SMTP_USER` | SMTP 帳號 (外部 SMTP 用) | (空) |
| `SMTP_PASSWORD` | SMTP 密碼 (外部 SMTP 用) | (空) |
| `SMTP_SENDER` | Email 寄件者地址 | `DtRoadmap@corning.com` |
| `GUNICORN_WORKERS` | Worker 進程數量 | CPU核心數 × 2 + 1 |
| `GUNICORN_TIMEOUT` | 請求超時時間 (秒) | `120` |
| `GUNICORN_LOG_LEVEL` | 日誌等級 (debug/info/warning/error) | `info` |

### MS SQL Server 連線

正式環境使用 MS SQL Server 時，修改 `DATABASE_URL`：

```
DATABASE_URL=mssql+pymssql://username:password@host:1433/database_name
```

### Email 通知設定

當新使用者註冊時，系統會自動發送 Email 通知給所有 Admin。

#### Corning 內部網路（推薦）

在 Corning 內部網路部署時，系統會自動使用 `smtphub.corning.com:25`，**不需要設定任何 SMTP 參數**。

只需設定以下環境變數：

```env
# backend/.env

# 前端網址（用於 Email 中的連結）
APP_BASE_URL=http://192.168.x.x

# 自訂寄件者 Email（選填，預設為 DtRoadmap@corning.com）
SMTP_SENDER=yourname@corning.com

# Admin 通知收件者（逗號分隔，可設定多個）
# 留空則自動從資料庫查詢所有 Active Admin 的 email
ADMIN_NOTIFICATION_EMAILS=admin1@corning.com,admin2@corning.com
```

#### 外部 SMTP 伺服器

若部署在 Corning 網路外部，需設定完整的 SMTP 參數：

```env
# backend/.env

APP_BASE_URL=https://your-domain.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
SMTP_SENDER=noreply@example.com
```

#### 通知設定說明

| 設定項目 | 說明 |
|---------|------|
| `APP_BASE_URL` | Email 中「前往 User Management」按鈕的連結網址 |
| `SMTP_SENDER` | Email 顯示的寄件者地址，Admin 回信會寄到此地址 |
| `SMTP_HOST` | 留空則自動使用 Corning 內部 SMTP（`smtphub.corning.com`） |
| `ADMIN_NOTIFICATION_EMAILS` | Admin Email（逗號分隔），用於通知收件及前端顯示聯絡資訊，留空則從 DB 查詢 |

#### 通知觸發時機

| 事件 | Email 通知 |
|------|-----------|
| 新用戶註冊 | 發送給所有 Admin |
| 審核通過 (Approve) | 發送給該用戶 |
| 審核拒絕 (Reject) | 發送給該用戶 |
| 帳號停用 (Disable) | 發送給該用戶 |

#### 前端顯示

- **Sidebar 下方** — 顯示 Admin Contact Email（可點擊發送郵件）
- **登入頁面** — 顯示 Admin Contact Email
- **Sidebar Badge** — Admin 登入後，User Management 旁顯示待審核人數（每分鐘刷新）

---

## 生產環境部署

### 多 Worker 模式 (方案 A: 20-50 人)

生產環境使用 Gunicorn 多 Worker 模式，充分利用多核 CPU：

#### 使用腳本啟動

<details>
<summary><b>macOS / Linux</b></summary>

```bash
./scripts/start-prod.sh
```

</details>

<details open>
<summary><b>Windows</b></summary>

```powershell
.\scripts\start-prod.ps1
# 或
scripts\start-prod.bat
```

</details>

#### 手動啟動

```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 使用 gunicorn.conf.py 配置檔
gunicorn app.main:app -c gunicorn.conf.py

# 或直接指定參數
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

#### Worker 數量建議

| 伺服器 CPU | 建議 Workers | 預估支援人數 |
|------------|-------------|-------------|
| 2 核心 | 5 | 20-30 人 |
| 4 核心 | 9 | 40-60 人 |
| 8 核心 | 17 | 80-120 人 |

> 公式: `(CPU 核心數 × 2) + 1`

#### Docker 生產部署

```bash
# 調整 docker-compose.yml 中的 GUNICORN_WORKERS 環境變數
docker-compose up -d --build
```

```yaml
# docker-compose.yml 範例
environment:
  - GUNICORN_WORKERS=9  # 依伺服器 CPU 調整
  - GUNICORN_TIMEOUT=120
```

---

## 公司內部 Server 部署

將系統部署在公司共用 PC Server，讓內部網路的使用者都能透過瀏覽器存取。

### 前置需求

1. **固定 IP 或 Hostname** — Server 需有固定內網 IP（如 `192.168.1.100`）或可解析的 hostname
2. **防火牆設定** — 開放 port 80 (HTTP) 或 443 (HTTPS)
3. **系統需求** — Windows Server 2019+ 或 Windows 10/11，建議 4+ CPU 核心、8GB+ RAM

### 方案一：簡易部署（適合小型團隊 5-20 人）

#### Step 1: 設定 Backend 監聽所有網路介面

```powershell
cd backend
.venv\Scripts\Activate.ps1

# 綁定到 0.0.0.0 讓外部可存取
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Step 2: 設定 Frontend 監聽所有網路介面

```powershell
cd frontend

# 使用 --host 參數讓外部可存取
npm run dev -- --host 0.0.0.0
```

#### Step 3: 設定 CORS 允許內網存取

編輯 `backend/.env`：

```env
CORS_ORIGINS=http://192.168.1.100:5173,http://your-server-hostname:5173
```

> 將 `192.168.1.100` 替換為實際的 Server IP

#### Step 4: 設定 Windows 防火牆

```powershell
# 以系統管理員身分執行 PowerShell
New-NetFirewallRule -DisplayName "Dt Quality Roadmap - Backend" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Dt Quality Roadmap - Frontend" -Direction Inbound -Port 5173 -Protocol TCP -Action Allow
```

#### Step 5: 使用者存取方式

告知使用者在瀏覽器輸入：
```
http://192.168.1.100:5173
```

---

### 方案二：生產級部署（適合 20+ 人，推薦）

使用 Nginx 作為反向代理，統一入口 + 靜態檔案快取 + 負載平衡。

#### Step 1: 安裝 Nginx for Windows

1. 下載 Nginx Windows 版本：https://nginx.org/en/download.html
2. 解壓縮到 `C:\nginx`

#### Step 2: 設定 Nginx

編輯 `C:\nginx\conf\nginx.conf`：

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # 後端 API
    upstream backend {
        server 127.0.0.1:8000;
    }

    server {
        listen 80;
        server_name 192.168.1.100;  # 替換為實際 IP 或 hostname

        # 前端靜態檔案
        location / {
            root   C:/path/to/Dt_Quality_Roadmap/frontend/dist;
            index  index.html;
            try_files $uri $uri/ /index.html;
        }

        # API 請求轉發到後端
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Step 3: 建置前端靜態檔案

```powershell
cd frontend
npm run build
```

產生的檔案在 `frontend/dist` 目錄。

#### Step 4: 啟動服務

```powershell
# 啟動 Backend（使用 Gunicorn 多 Worker）
cd backend
.venv\Scripts\Activate.ps1
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000

# 啟動 Nginx
cd C:\nginx
start nginx
```

#### Step 5: 設定防火牆

```powershell
New-NetFirewallRule -DisplayName "Dt Quality Roadmap - HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
```

#### Step 6: 使用者存取方式

```
http://192.168.1.100
```

---

### 開機自動啟動

#### 使用 Windows 工作排程器

1. 建立啟動腳本 `C:\scripts\start-dt-roadmap.bat`：

```batch
@echo off
cd /d C:\path\to\Dt_Quality_Roadmap\backend
call .venv\Scripts\activate.bat
start /B uvicorn app.main:app --host 0.0.0.0 --port 8000

cd /d C:\nginx
start nginx
```

2. 開啟「工作排程器」(Task Scheduler)
3. 建立基本工作 → 觸發程序選「電腦啟動時」
4. 動作選「啟動程式」，指向 `C:\scripts\start-dt-roadmap.bat`
5. 勾選「以最高權限執行」

#### 使用 NSSM (推薦)

NSSM (Non-Sucking Service Manager) 可將程式註冊為 Windows 服務：

```powershell
# 下載 NSSM: https://nssm.cc/download
# 安裝 Backend 為服務
nssm install DtRoadmapBackend "C:\path\to\backend\.venv\Scripts\uvicorn.exe" "app.main:app --host 0.0.0.0 --port 8000"
nssm set DtRoadmapBackend AppDirectory "C:\path\to\Dt_Quality_Roadmap\backend"
nssm start DtRoadmapBackend

# 安裝 Nginx 為服務
nssm install DtRoadmapNginx "C:\nginx\nginx.exe"
nssm set DtRoadmapNginx AppDirectory "C:\nginx"
nssm start DtRoadmapNginx
```

---

### 常見問題

<details>
<summary><b>Q: 使用者反映無法連線？</b></summary>

1. 確認 Server 防火牆已開放對應 port
2. 確認服務正在執行：`netstat -ano | findstr ":8000"`
3. 確認 CORS 設定包含使用者存取的 URL
4. 使用者嘗試清除瀏覽器快取或使用無痕模式

</details>

<details>
<summary><b>Q: API 回應緩慢？</b></summary>

1. 增加 Gunicorn Worker 數量
2. 檢查 Server CPU/記憶體使用率
3. 考慮將 SQLite 替換為 MS SQL Server

</details>

<details>
<summary><b>Q: 如何設定 HTTPS？</b></summary>

1. 取得 SSL 憑證（公司內部 CA 或自簽憑證）
2. 修改 Nginx 設定加入 SSL：

```nginx
server {
    listen 443 ssl;
    ssl_certificate     C:/certs/server.crt;
    ssl_certificate_key C:/certs/server.key;
    # ... 其他設定
}
```

3. 開放防火牆 port 443

</details>

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

- **Azure AD Token 驗證** — RS256 簽章驗證（透過 Microsoft JWKS endpoint）、audience / issuer / 過期時間驗證
- **AD Group 閘門** — 透過 LDAP（NTLM 認證）遞迴查詢使用者是否屬於 `Quality-Roadmap-Access` 群組；不在群組 → 403
- **密碼** — bcrypt 雜湊 (cost factor 12)（本地帳號）
- **JWT** — HS256 演算法，Access Token 8hr + Refresh Token 7 天 (HttpOnly Cookie)
- **Rate Limiting** — `/login`、`/sso-login` 5 次/分鐘；`/sso-register` 3 次/分鐘
- **SQL Injection 防護** — SQLAlchemy 參數化查詢
- **XSS 防護** — React 自動 escape
- **CORS** — 限制允許的來源
- **稽核日誌** — 所有寫入操作記錄至 audit_log 表
- **樂觀鎖** — Solution Map 更新使用 version 欄位防止並發衝突
- **輸入驗證** — Pydantic v2 嚴格驗證所有 API 輸入

---

## 原始資料來源

- `D^t Solution Quality Roadmap.xlsx` — **主要資料來源** (包含完整的 Tank/Line、Solution、Status 定義)
- `Dt_Solution_Map_for_QA_New0126.pbit` — Power BI 範本
- `Dt_Solution_Map_for_QA_New0126.pbix` — Power BI 報表
- `Quality Roadmap G$ database_Fin_BOD_Dt.xlsx` — G$ Tracking 資料來源 (2026 年度 Goal Sharing)
- `TC Finishing D^t Solution Migration_2026.xlsx` — Excel 原始資料 (舊版)

### Excel 資料結構 (D^t Solution Quality Roadmap.xlsx)

| Sheet 名稱 | 內容 | 匯入資料量 |
|-----------|------|-----------|
| Definition | 狀態定義 (MP, Developing, etc.) | 7 筆 |
| Defect | 缺陷類別與類型 | 7 類別, 16 類型 |
| Station | 製程與工站 | 3 製程, 37 工站 |
| Tank_Line | 工廠、Tank 與 Line | 10 工廠, 102 Tank/Line |
| Dt_Solution | 解決方案與品質屬性 | 75 筆 |
| Melting | 熔融製程的 Solution Map | ~900 筆 |
| Finishing | 後段製程的 Solution Map | ~1,400 筆 |

---

## License

[MIT](LICENSE)
