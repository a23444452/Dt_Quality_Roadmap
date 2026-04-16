# D^t Quality Roadmap - 設計進度

## 專案概述

將 Power BI 報表 (Dt_Solution_Map_for_QA) 轉換為 Web 應用程式，提供：
- Solution Map 總覽（桑基圖 + 樞紐表）
- Process Map 視覺化（製程地圖）
- 資料編輯功能（CRUD）
- 分析儀表板（KPI 卡片 + 圖表）

## 已確認的設計決策

### 技術架構

| 層級 | 技術 |
|------|------|
| **Database** | MS SQL Server |
| **Backend** | FastAPI + Python 3.11+ + SQLAlchemy 2.0 |
| **Frontend** | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| **Charts** | ECharts（桑基圖）+ TanStack Table |
| **部署** | 公司內部伺服器 |

### 身份驗證

- **登入方式**：僅本地帳號（暫不使用 AD）
- **註冊機制**：需管理員審核
- **權限角色**：Viewer / Editor / Admin
- **忘記密碼**：Email 重設連結 + 管理員手動重設

### 匯入匯出

- **範本格式**：提供矩陣格式 + 清單格式兩種
- **匯入流程**：上傳 → 驗證 → 預覽 → 確認
- **匯出選項**：可選擇資料範圍、格式、包含工作表

## 資料庫設計

### 主要資料表

```
- status_definition    # 狀態定義（MP, Developing, Planned...）
- defect_category      # 缺陷大類
- defect_type          # 缺陷類型
- process              # 製程（System, Melting, Finishing）
- station              # 站點
- plant                # 工廠
- tank_line            # 產線
- solution             # 解決方案
- solution_map         # 核心關聯表（Solution × Line × Status）
- users                # 用戶（含審核狀態）
- audit_log            # 稽核日誌
```

### 用戶狀態

- `pending` - 待審核
- `active` - 已啟用
- `rejected` - 已拒絕
- `disabled` - 已停用

## API 設計

### 主要端點

```
/api/v1/auth           # 身份驗證（login, register, forgot-password）
/api/v1/solutions      # 解決方案 CRUD
/api/v1/solution-map   # 導入狀態（核心）
/api/v1/defects        # 缺陷分類
/api/v1/processes      # 製程/站點
/api/v1/plants         # 工廠/產線
/api/v1/dashboard      # 儀表板統計
/api/v1/import-export  # 匯入匯出
/api/v1/users          # 用戶管理（Admin）
```

## 前端頁面

1. **Dashboard** (`/`) - 總覽統計、KPI 卡片、桑基圖
2. **Solution Map** (`/solution-map`) - 樞紐表視圖
3. **Process Map** (`/process-map`) - 製程流程視覺化
4. **Data Management** (`/data-management`) - CRUD 編輯
5. **Analysis** (`/analysis/defect`, `/analysis/process`) - 分析頁面
6. **Login** (`/login`) - 登入/註冊
7. **Admin** (`/admin/users`) - 用戶管理

## 下一步

1. **撰寫完整設計文件** → `docs/superpowers/specs/2026-04-16-dt-quality-roadmap-design.md`
2. **Spec 自我審查**
3. **用戶審核設計文件**
4. **建立實作計畫**（使用 writing-plans skill）

## 原始資料來源

- `Dt_Solution_Map_for_QA_New0126.pbit` - Power BI 範本
- `Dt_Solution_Map_for_QA_New0126.pbix` - Power BI 報表
- `TC Finishing D^t Solution Migration_2026.xlsx` - Excel 資料

---

*Last updated: 2026-04-16*
