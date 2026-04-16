# D^t Quality Roadmap - 完整設計規格

> **Version**: 1.0
> **Date**: 2026-04-16
> **Status**: Draft
> **Author**: Vince Wang

---

## 1. 專案概述

### 1.1 背景

將現有 Power BI 報表 `Dt_Solution_Map_for_QA` 轉換為獨立的 Web 應用程式。原始報表以矩陣格式呈現各產線的缺陷解決方案導入狀態，但 Power BI 的互動性與編輯能力有限，無法滿足團隊即時更新、協作編輯與深度分析的需求。

### 1.2 目標

| 目標 | 說明 |
|------|------|
| **視覺化** | 以桑基圖 + 樞紐表呈現 Solution Map 全貌 |
| **即時編輯** | 提供 CRUD 介面讓 Engineer 直接維護資料 |
| **流程視覺化** | Process Map 展示製程站點與缺陷的關聯 |
| **分析能力** | KPI 卡片 + 多維度統計圖表 |
| **協作** | 多用戶權限控制、稽核紀錄 |
| **匯入匯出** | 支援 Excel 批次匯入/匯出 |

### 1.3 使用者角色

| 角色 | 說明 | 權限 |
|------|------|------|
| **Viewer** | 品質團隊成員 | 瀏覽所有頁面、匯出資料 |
| **Editor** | 品質工程師 | Viewer + 編輯 Solution Map 資料 |
| **Admin** | 系統管理員 | Editor + 用戶管理、系統設定 |

---

## 2. 技術架構

### 2.1 技術堆疊

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React 18 + TypeScript + Tailwind CSS        │
│  shadcn/ui + ECharts + TanStack Table        │
├─────────────────────────────────────────────┤
│                  Backend                     │
│  FastAPI + Python 3.11+ + SQLAlchemy 2.0     │
│  Pydantic v2 + Alembic (migrations)          │
├─────────────────────────────────────────────┤
│                 Database                     │
│  Microsoft SQL Server                        │
└─────────────────────────────────────────────┘
```

### 2.2 技術選型理由

| 技術 | 選型理由 |
|------|---------|
| **FastAPI** | 高效能 async、自動 OpenAPI 文件、Pydantic 驗證 |
| **SQLAlchemy 2.0** | 成熟 ORM、支援 MS SQL、Type-safe query |
| **React 18** | 團隊熟悉、生態系完整、Concurrent Features |
| **ECharts** | 原生支援桑基圖、效能優異、高度可自訂 |
| **TanStack Table** | Headless table、支援樞紐功能、虛擬捲動 |
| **shadcn/ui** | 可自訂 UI 元件、Tailwind 整合、無 vendor lock-in |
| **MS SQL Server** | 公司既有基礎設施、與現有系統整合 |

### 2.3 部署架構

```
公司內部伺服器
├── Nginx (反向代理 + 靜態檔案)
│   ├── /           → React SPA (build artifacts)
│   └── /api/       → FastAPI (uvicorn)
└── MS SQL Server   → 資料庫
```

### 2.4 專案目錄結構

```
Dt_Quality_Roadmap/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings (env-based)
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── solution.py
│   │   │   ├── solution_map.py
│   │   │   ├── defect.py
│   │   │   ├── process.py
│   │   │   ├── plant.py
│   │   │   └── audit_log.py
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── solution.py
│   │   │   ├── solution_map.py
│   │   │   ├── defect.py
│   │   │   ├── process.py
│   │   │   ├── plant.py
│   │   │   ├── dashboard.py
│   │   │   └── import_export.py
│   │   ├── routers/             # API routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── solutions.py
│   │   │   ├── solution_map.py
│   │   │   ├── defects.py
│   │   │   ├── processes.py
│   │   │   ├── plants.py
│   │   │   ├── dashboard.py
│   │   │   ├── import_export.py
│   │   │   └── users.py
│   │   ├── services/            # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── solution_service.py
│   │   │   ├── import_export_service.py
│   │   │   └── dashboard_service.py
│   │   ├── middleware/          # Auth, CORS, logging
│   │   │   ├── __init__.py
│   │   │   └── auth.py
│   │   └── utils/              # Helpers
│   │       ├── __init__.py
│   │       ├── security.py     # JWT, password hashing
│   │       └── excel.py        # Excel import/export
│   ├── alembic/                # DB migrations
│   ├── tests/
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── layout/         # Layout (Sidebar, Header)
│   │   │   └── charts/         # Chart wrappers
│   │   ├── features/           # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── solution-map/
│   │   │   ├── process-map/
│   │   │   ├── data-management/
│   │   │   ├── analysis/
│   │   │   └── admin/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities, API client
│   │   ├── types/              # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── docs/
└── docker-compose.yml          # 開發環境 (optional)
```

---

## 3. 資料庫設計

### 3.1 ER 圖（概念層）

```
defect_category 1──N defect_type
process         1──N station
plant           1──N tank_line

solution ──── solution_map ──── tank_line
                   │
              status_definition

users ──── audit_log
```

### 3.2 資料表定義

#### 3.2.1 status_definition - 狀態定義

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| code | NVARCHAR(20) | UNIQUE, NOT NULL | 狀態代碼 (MP, DEV, PLAN...) |
| name | NVARCHAR(50) | NOT NULL | 顯示名稱 |
| color | NVARCHAR(7) | NOT NULL | Hex 色碼 (#RRGGBB) |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序順序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

**預設資料**:

| code | name | color |
|------|------|-------|
| MP | Mass Production | #28A745 |
| DEV | Developing | #FFC107 |
| PLAN | Planned | #17A2B8 |
| NA | Not Applicable | #6C757D |
| HOLD | On Hold | #DC3545 |

#### 3.2.2 defect_category - 缺陷大類

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| name | NVARCHAR(100) | UNIQUE, NOT NULL | 類別名稱 |
| description | NVARCHAR(500) | NULL | 說明 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

#### 3.2.3 defect_type - 缺陷類型

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| category_id | INT | FK → defect_category.id, NOT NULL | 所屬大類 |
| name | NVARCHAR(100) | NOT NULL | 類型名稱 |
| description | NVARCHAR(500) | NULL | 說明 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

**唯一約束**: `(category_id, name)`

#### 3.2.4 process - 製程

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| name | NVARCHAR(100) | UNIQUE, NOT NULL | 製程名稱 (System, Melting, Finishing) |
| description | NVARCHAR(500) | NULL | 說明 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

#### 3.2.5 station - 站點

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| process_id | INT | FK → process.id, NOT NULL | 所屬製程 |
| name | NVARCHAR(100) | NOT NULL | 站點名稱 |
| description | NVARCHAR(500) | NULL | 說明 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

**唯一約束**: `(process_id, name)`

#### 3.2.6 plant - 工廠

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| name | NVARCHAR(100) | UNIQUE, NOT NULL | 工廠名稱 |
| code | NVARCHAR(20) | UNIQUE, NOT NULL | 工廠代碼 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

#### 3.2.7 tank_line - 產線

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| plant_id | INT | FK → plant.id, NOT NULL | 所屬工廠 |
| name | NVARCHAR(100) | NOT NULL | 產線名稱 |
| code | NVARCHAR(20) | NOT NULL | 產線代碼 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |

**唯一約束**: `(plant_id, code)`

#### 3.2.8 solution - 解決方案

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| defect_type_id | INT | FK → defect_type.id, NOT NULL | 對應缺陷類型 |
| station_id | INT | FK → station.id, NOT NULL | 對應站點 |
| name | NVARCHAR(200) | NOT NULL | 方案名稱 |
| description | NVARCHAR(2000) | NULL | 方案說明 |
| sort_order | INT | NOT NULL, DEFAULT 0 | 排序 |
| is_active | BIT | NOT NULL, DEFAULT 1 | 是否啟用 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |
| created_by | INT | FK → users.id, NULL | 建立者 |
| updated_by | INT | FK → users.id, NULL | 更新者 |

**唯一約束**: `(defect_type_id, station_id, name)`

#### 3.2.9 solution_map - 核心關聯表

這是整個系統的核心表，記錄「某解決方案在某產線的導入狀態」。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| solution_id | INT | FK → solution.id, NOT NULL | 解決方案 |
| tank_line_id | INT | FK → tank_line.id, NOT NULL | 產線 |
| status_id | INT | FK → status_definition.id, NOT NULL | 導入狀態 |
| notes | NVARCHAR(1000) | NULL | 備註 |
| version | INT | NOT NULL, DEFAULT 1 | 樂觀鎖版本號 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| created_by | INT | FK → users.id, NULL | 建立者 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |
| updated_by | INT | FK → users.id, NULL | 更新者 |

**唯一約束**: `(solution_id, tank_line_id)`

**樂觀鎖**: 更新時必須帶 `version`，若 DB 中的 version 不匹配則回傳 409 Conflict。

**索引**:
- `IX_solution_map_solution` ON (solution_id)
- `IX_solution_map_tank_line` ON (tank_line_id)
- `IX_solution_map_status` ON (status_id)

#### 3.2.10 users - 用戶

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | INT | PK, IDENTITY | 主鍵 |
| username | NVARCHAR(50) | UNIQUE, NOT NULL | 帳號 |
| email | NVARCHAR(255) | UNIQUE, NOT NULL | Email |
| password_hash | NVARCHAR(255) | NOT NULL | 密碼雜湊 (bcrypt) |
| display_name | NVARCHAR(100) | NOT NULL | 顯示名稱 |
| role | NVARCHAR(20) | NOT NULL, DEFAULT 'viewer' | 角色 (viewer/editor/admin) |
| status | NVARCHAR(20) | NOT NULL, DEFAULT 'pending' | 帳號狀態 |
| reset_token | NVARCHAR(255) | NULL | 密碼重設 token |
| reset_token_expires | DATETIME2 | NULL | Token 過期時間 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 建立時間 |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 更新時間 |
| last_login_at | DATETIME2 | NULL | 最後登入 |

**用戶狀態機**:
```
(註冊) → pending → active (審核通過)
                 → rejected (審核拒絕)
         active → disabled (管理員停用)
         disabled → active (管理員重新啟用)
```

#### 3.2.11 audit_log - 稽核日誌

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | BIGINT | PK, IDENTITY | 主鍵 |
| user_id | INT | FK → users.id, NOT NULL | 操作者 |
| action | NVARCHAR(50) | NOT NULL | 動作 (CREATE/UPDATE/DELETE/IMPORT) |
| entity_type | NVARCHAR(50) | NOT NULL | 實體類型 (solution/solution_map/...) |
| entity_id | INT | NOT NULL | 實體 ID |
| old_values | NVARCHAR(MAX) | NULL | 變更前值 (JSON) |
| new_values | NVARCHAR(MAX) | NULL | 變更後值 (JSON) |
| ip_address | NVARCHAR(45) | NULL | 用戶 IP |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() | 操作時間 |

**索引**:
- `IX_audit_log_user` ON (user_id)
- `IX_audit_log_entity` ON (entity_type, entity_id)
- `IX_audit_log_created` ON (created_at DESC)

---

## 4. API 設計

### 4.1 通用規範

**Base URL**: `/api/v1`

**Response 格式**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

**認證**: Bearer JWT Token (Header: `Authorization: Bearer <token>`)

**分頁**: `?page=1&limit=20` (預設 limit=20, 最大 100)

**排序**: `?sort=name&order=asc`

**篩選**: `?status=active&process_id=1`

### 4.2 Authentication API

#### POST /api/v1/auth/login

```json
// Request
{ "username": "engineer1", "password": "..." }

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 28800,
    "user": {
      "id": 1,
      "username": "engineer1",
      "display_name": "Engineer 1",
      "role": "editor"
    }
  }
}
```

#### POST /api/v1/auth/register

```json
// Request
{
  "username": "new_user",
  "email": "user@company.com",
  "password": "...",
  "display_name": "New User"
}

// Response 201
{
  "success": true,
  "data": {
    "id": 5,
    "username": "new_user",
    "status": "pending",
    "message": "Registration submitted. Awaiting admin approval."
  }
}
```

#### POST /api/v1/auth/refresh

```json
// Request (Cookie: refresh_token=xxx)
// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 28800
  }
}
```

Refresh token 存於 HttpOnly cookie，有效期 7 天。Access token 過期前 5 分鐘自動 silent refresh。

#### POST /api/v1/auth/forgot-password

```json
// Request
{ "email": "user@company.com" }

// Response 200
{
  "success": true,
  "data": { "message": "If the email exists, a reset link has been sent." }
}
```

#### POST /api/v1/auth/reset-password

```json
// Request
{ "token": "reset-token-xxx", "new_password": "..." }

// Response 200
{
  "success": true,
  "data": { "message": "Password reset successfully." }
}
```

### 4.3 Solution Map API (核心)

#### GET /api/v1/solution-map

取得樞紐表資料（Solution × Line 矩陣）。

**Query Parameters**:
- `process_id` - 篩選製程
- `station_id` - 篩選站點
- `defect_category_id` - 篩選缺陷大類
- `plant_id` - 篩選工廠
- `status_id` - 篩選狀態

```json
// Response 200
{
  "success": true,
  "data": {
    "solutions": [
      {
        "id": 1,
        "name": "Solution A",
        "defect_type": "Bubble",
        "defect_category": "Surface",
        "station": "Coating",
        "process": "Finishing",
        "statuses": {
          "line_1": { "status_id": 1, "status_code": "MP", "notes": null },
          "line_2": { "status_id": 2, "status_code": "DEV", "notes": "Testing phase" },
          "line_3": null
        }
      }
    ],
    "lines": [
      { "id": 1, "key": "line_1", "name": "Line A", "plant": "Plant 1" },
      { "id": 2, "key": "line_2", "name": "Line B", "plant": "Plant 1" }
    ],
    "filters": {
      "processes": [...],
      "stations": [...],
      "defect_categories": [...],
      "plants": [...],
      "statuses": [...]
    }
  }
}
```

#### PUT /api/v1/solution-map/{id}

更新單一 Solution Map 狀態。**需 Editor 以上權限**。

```json
// Request (version 用於樂觀鎖，不匹配回 409 Conflict)
{ "status_id": 2, "notes": "Developing since Q2", "version": 1 }

// Response 200
{
  "success": true,
  "data": {
    "id": 42,
    "solution_id": 1,
    "tank_line_id": 2,
    "status_id": 2,
    "notes": "Developing since Q2",
    "updated_at": "2026-04-16T10:30:00",
    "updated_by": { "id": 1, "display_name": "Engineer 1" }
  }
}
```

#### POST /api/v1/solution-map/batch

批次 upsert 多筆狀態（不存在則新增，已存在則更新）。**需 Editor 以上權限**。

使用 `POST` 而非 `PUT`，因為此操作為 upsert 語意（可能建立新資源）。

```json
// Request
{
  "updates": [
    { "solution_id": 1, "tank_line_id": 2, "status_id": 1 },
    { "solution_id": 1, "tank_line_id": 3, "status_id": 2, "notes": "In progress" }
  ]
}

// Response 200
{
  "success": true,
  "data": { "created": 1, "updated": 1, "failed": 0 }
}
```

### 4.4 Solutions API

#### GET /api/v1/solutions

```
Query: ?defect_type_id=1&station_id=2&page=1&limit=20
```

#### POST /api/v1/solutions (Editor+)

```json
{
  "defect_type_id": 1,
  "station_id": 2,
  "name": "New Solution",
  "description": "..."
}
```

#### PUT /api/v1/solutions/{id} (Editor+)

#### DELETE /api/v1/solutions/{id} (Admin)

Soft delete (設 `is_active = false`)。

### 4.5 Reference Data APIs

以下 API 結構相同，提供 CRUD 操作：

| Endpoint | 資源 | 寫入權限 |
|----------|------|---------|
| `/api/v1/defect-categories` | 缺陷大類 | Admin |
| `/api/v1/defect-types` | 缺陷類型 | Admin |
| `/api/v1/processes` | 製程 | Admin |
| `/api/v1/stations` | 站點 | Admin |
| `/api/v1/plants` | 工廠 | Admin |
| `/api/v1/tank-lines` | 產線 | Admin |
| `/api/v1/statuses` | 狀態定義 | Admin |

**共用 Query Parameters**: `?is_active=true&sort=sort_order&order=asc`

### 4.6 Dashboard API

#### GET /api/v1/dashboard/summary

```json
// Response 200
{
  "success": true,
  "data": {
    "kpi": {
      "total_solutions": 150,
      "mp_count": 80,
      "mp_percentage": 53.3,
      "developing_count": 35,
      "planned_count": 20,
      "coverage_by_plant": [
        { "plant": "Plant 1", "mp_percentage": 60.5, "total": 90 },
        { "plant": "Plant 2", "mp_percentage": 45.2, "total": 60 }
      ]
    },
    "sankey": {
      "nodes": [
        { "id": "cat_1", "name": "Surface", "layer": "defect_category" },
        { "id": "type_1", "name": "Bubble", "layer": "defect_type" },
        { "id": "sta_1", "name": "Coating", "layer": "station" },
        { "id": "status_1", "name": "MP", "layer": "status" }
      ],
      "links": [
        { "source": "cat_1", "target": "type_1", "value": 10 },
        { "source": "type_1", "target": "sta_1", "value": 8 },
        { "source": "sta_1", "target": "status_1", "value": 6 }
      ]
    }
  }
}
```

#### GET /api/v1/dashboard/defect-analysis

```
Query: ?process_id=1&plant_id=2&group_by=defect_category
```

#### GET /api/v1/dashboard/process-analysis

```
Query: ?plant_id=1&group_by=station
```

### 4.7 Import/Export API

#### POST /api/v1/import-export/import (Editor+)

**Content-Type**: `multipart/form-data`

```
file: <Excel file>
format: "matrix" | "list"
mode: "preview" | "execute"
```

**Preview Response**:
```json
{
  "success": true,
  "data": {
    "preview": {
      "total_rows": 150,
      "new_records": 30,
      "updated_records": 120,
      "errors": [
        { "row": 45, "field": "status", "message": "Unknown status: 'TEST'" }
      ],
      "warnings": [
        { "row": 12, "message": "Line 'Z99' not found, will be created" }
      ]
    },
    "import_id": "imp_abc123"
  }
}
```

**Import 預覽暫存**: 預覽結果存於伺服器端暫存檔（temp 目錄），TTL 為 15 分鐘。超時後 `import_id` 失效，需重新上傳。背景排程每 5 分鐘清理過期暫存。

**Execute Response** (用 import_id 確認):
```json
// POST /api/v1/import-export/import/confirm
{ "import_id": "imp_abc123" }

// Response 200
{
  "success": true,
  "data": {
    "imported": 150,
    "created": 30,
    "updated": 120,
    "skipped": 0
  }
}
```

#### GET /api/v1/import-export/export

```
Query: ?format=matrix&process_id=1&plant_id=2
```

回傳 Excel 檔案 (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)。

#### GET /api/v1/import-export/template

```
Query: ?format=matrix
```

下載匯入範本。

### 4.8 User Management API (Admin)

#### GET /api/v1/users

```
Query: ?status=pending&role=editor&page=1&limit=20
```

#### PUT /api/v1/users/{id}/approve

```json
{ "role": "editor" }
```

#### PUT /api/v1/users/{id}/reject

```json
{ "reason": "Duplicate account" }
```

#### PUT /api/v1/users/{id}/disable

#### PUT /api/v1/users/{id}/reset-password

管理員手動重設密碼，產生臨時密碼回傳。

---

## 5. 前端設計

### 5.1 路由結構

| 路由 | 頁面 | 權限 |
|------|------|------|
| `/login` | 登入頁 | Public |
| `/register` | 註冊頁 | Public |
| `/forgot-password` | 忘記密碼 | Public |
| `/reset-password` | 重設密碼（從 Email 連結進入） | Public |
| `/` | Dashboard | Viewer+ |
| `/solution-map` | Solution Map 樞紐表 | Viewer+ |
| `/process-map` | Process Map 流程圖 | Viewer+ |
| `/data-management` | 資料管理 CRUD | Editor+ |
| `/analysis/defect` | 缺陷分析 | Viewer+ |
| `/analysis/process` | 製程分析 | Viewer+ |
| `/admin/users` | 用戶管理 | Admin |
| `/admin/settings` | 系統設定 | Admin |

### 5.2 Layout 設計

```
┌──────────────────────────────────────────────┐
│  Header: Logo | D^t Quality Roadmap  | User  │
├────────┬─────────────────────────────────────┤
│        │                                     │
│  Side  │         Main Content                │
│  bar   │                                     │
│        │                                     │
│  Nav   │                                     │
│  Items │                                     │
│        │                                     │
│        │                                     │
└────────┴─────────────────────────────────────┘
```

- **Sidebar**: 可收合、icon + text、active 狀態高亮
- **Header**: Logo、應用名稱、用戶頭像 + dropdown (Profile, Logout)
- **Theme**: Light mode 為主、專業藍灰色調

### 5.3 頁面規格

#### 5.3.1 Dashboard (`/`)

**KPI 卡片區** (頂部):
- Total Solutions 總數
- MP (Mass Production) 比例 + 進度條
- Developing 數量
- Planned 數量

**桑基圖** (中間):
- 流向：Defect Category → Defect Type → Station → Status
- 互動：hover 顯示數值、click 過濾
- ECharts `sankey` series

**快速統計表** (底部):
- 各工廠 MP 覆蓋率排行
- 近期更新紀錄

#### 5.3.2 Solution Map (`/solution-map`)

**篩選列** (頂部):
- Process dropdown (multi-select)
- Station dropdown (依 Process 連動)
- Defect Category dropdown
- Plant dropdown
- Status filter chips
- Reset / Apply 按鈕

**樞紐表** (主體):
- 行：Solution (grouped by Defect Category → Defect Type → Station)
- 列：Tank Line (grouped by Plant)
- 值：Status (色塊顯示)
- 使用 TanStack Table + 虛擬捲動
- 可展開/收合群組
- Cell click → 編輯 status (Editor+ 才顯示 edit icon)

**色塊圖例** (底部):
- MP (綠) / Developing (黃) / Planned (藍) / NA (灰) / Hold (紅)

#### 5.3.3 Process Map (`/process-map`)

**製程流程圖**:
- 水平流程：System → Melting → Finishing
- 每個製程下展開 Stations
- 每個 Station 顯示相關 Solutions 數量 + 狀態分佈
- 點擊 Station → 展開 Solution 清單

**視覺設計**:
- 節點大小依 Solution 數量
- 邊線粗細依關聯強度
- 狀態色彩分佈 (pie chart within node)

#### 5.3.4 Data Management (`/data-management`)

**Tab 切換**:
- Solutions | Defect Types | Stations | Tank Lines

**每個 Tab**:
- 搜尋列 + 篩選
- 資料表格 (sortable, paginated)
- 新增按鈕 (opens modal/drawer)
- 行操作：Edit / Delete (soft)
- Inline edit for quick changes

**匯入匯出區**:
- 上傳區域 (drag & drop)
- 格式選擇：矩陣格式 / 清單格式
- 下載範本按鈕
- 匯出按鈕 (可選範圍)

#### 5.3.5 Analysis Pages

**Defect Analysis** (`/analysis/defect`):
- 缺陷類型分佈 (Bar chart)
- 各 Plant 缺陷覆蓋率 (Grouped bar)
- 趨勢圖 (如有歷史資料)
- 明細表格 (drill-down)

**Process Analysis** (`/analysis/process`):
- 各製程 Solution 數量對比
- Station 熱力圖 (Station × Plant, 值為 MP%)
- 製程完成度雷達圖

#### 5.3.6 Admin Pages

**User Management** (`/admin/users`):
- 用戶列表 (filterable by status/role)
- Pending 用戶高亮顯示 + 快速 Approve/Reject
- 角色變更 dropdown
- Disable/Enable toggle
- 手動重設密碼按鈕

### 5.4 狀態管理

```
React Context + TanStack Query
├── AuthContext        # 用戶認證狀態
├── useQuery           # Server state (GET)
├── useMutation        # Server state (POST/PUT/DELETE)
└── Local state        # UI state (modals, filters, etc.)
```

**策略**:
- **Server state**: 全部由 TanStack Query 管理，自動 cache + refetch
- **Auth state**: React Context + localStorage (JWT)
- **UI state**: 各 component 的 useState / useReducer
- 不使用 Redux 或其他全域狀態管理（避免過度設計）

### 5.5 API Client

```typescript
// lib/api-client.ts
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor: attach JWT
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 6. 身份驗證與授權

### 6.1 認證流程

```
Client                  Server
  │                       │
  │  POST /auth/login     │
  │  {username, password}  │
  │──────────────────────>│
  │                       │ verify password (bcrypt)
  │                       │ check user.status == 'active'
  │  200 {access_token}   │ generate JWT
  │<──────────────────────│
  │                       │
  │  GET /solutions       │
  │  Authorization: Bearer│
  │──────────────────────>│
  │                       │ verify JWT
  │                       │ check permissions
  │  200 {data}           │
  │<──────────────────────│
```

### 6.2 JWT Token

| Field | Value |
|-------|-------|
| Algorithm | HS256 |
| Access Token Expiry | 8 hours |
| Refresh Token Expiry | 7 days |
| Payload | `{ sub: user_id, role: role, exp: timestamp }` |
| Secret | Environment variable `JWT_SECRET` |
| Refresh Token 儲存 | HttpOnly, Secure, SameSite=Strict cookie |

**Silent Refresh**: 前端在 access token 過期前 5 分鐘自動呼叫 `/auth/refresh`，避免用戶操作中斷。

### 6.3 權限矩陣

| API | Viewer | Editor | Admin |
|-----|--------|--------|-------|
| GET (讀取) | O | O | O |
| POST (新增) | X | O | O |
| PUT (更新) | X | O | O |
| DELETE (刪除) | X | X | O |
| User Management | X | X | O |
| Import | X | O | O |
| Export | O | O | O |

### 6.4 密碼安全

- 雜湊：bcrypt (cost factor 12)
- 最小長度：8 字元
- 複雜度要求：至少包含大寫、小寫、數字
- 重設 Token：UUID4, 有效期 24 小時

---

## 7. 匯入匯出

### 7.1 匯入格式

#### 矩陣格式 (Matrix)

模仿原始 Power BI 報表結構：

```
| Defect Category | Defect Type | Station | Solution    | Plant1-LineA | Plant1-LineB | Plant2-LineC |
|-----------------|-------------|---------|-------------|--------------|--------------|--------------|
| Surface         | Bubble      | Coating | Solution A  | MP           | DEV          | PLAN         |
| Surface         | Bubble      | Coating | Solution B  | NA           | MP           | MP           |
```

#### 清單格式 (List)

```
| Solution    | Defect Type | Station | Plant  | Line   | Status |
|-------------|-------------|---------|--------|--------|--------|
| Solution A  | Bubble      | Coating | Plant1 | LineA  | MP     |
| Solution A  | Bubble      | Coating | Plant1 | LineB  | DEV    |
```

### 7.2 匯入流程

```
上傳 Excel
    │
    ▼
解析檔案 (openpyxl)
    │
    ▼
驗證格式
    ├─ 檢查必要欄位
    ├─ 驗證 status 代碼
    ├─ 比對 reference data (plant, line, etc.)
    └─ 標記 errors / warnings
    │
    ▼
預覽結果
    ├─ 新增筆數
    ├─ 更新筆數
    ├─ 錯誤清單
    └─ 警告清單
    │
    ▼
使用者確認
    │
    ▼
執行匯入 (transaction)
    ├─ Insert / Update solution_map
    ├─ 記錄 audit_log
    └─ 回傳結果
```

### 7.3 匯出選項

- **資料範圍**: 全部 / 依篩選條件
- **格式**: 矩陣格式 / 清單格式
- **工作表**: 可選包含 reference data sheets
- **檔案格式**: .xlsx

---

## 8. 非功能性需求

### 8.1 效能

| 指標 | 目標 |
|------|------|
| API 回應時間 | < 500ms (P95) |
| 樞紐表載入 | < 2s (1000+ solutions) |
| 桑基圖渲染 | < 1s |
| 匯入處理 | < 30s (1000 rows) |
| 匯出生成 | < 10s |

### 8.2 安全性

- HTTPS (TLS 1.2+)
- CORS 限制 (同源政策)
- Rate limiting (login: 5/min, API: 100/min)
- SQL injection 防護 (SQLAlchemy parameterized queries)
- XSS 防護 (React 自動 escape)
- Input validation (Pydantic)
- Audit logging (所有寫入操作)

### 8.3 可靠性

- 資料庫備份：每日自動備份
- Error logging：結構化日誌 (JSON format)
- Transaction integrity：匯入作業使用資料庫 transaction
- Graceful error handling：用戶友善錯誤訊息

### 8.4 可維護性

- Code coverage > 80%
- API 文件自動生成 (FastAPI OpenAPI)
- Database migrations (Alembic)
- 環境變數管理 (不硬編碼 secrets)

---

## 9. 開發環境與工具

### 9.1 Backend

```bash
# Python 環境
python -m venv .venv
source .venv/bin/activate

# 依賴
pip install fastapi uvicorn sqlalchemy[asyncio] pymssql
pip install pydantic-settings python-jose[cryptography] passlib[bcrypt]
pip install openpyxl alembic pytest httpx

# 啟動
uvicorn app.main:app --reload --port 8000
```

### 9.2 Frontend

```bash
# 建立專案
npm create vite@latest frontend -- --template react-ts

# 依賴
npm install axios @tanstack/react-query @tanstack/react-table
npm install echarts echarts-for-react
npm install react-router-dom
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init

# 啟動
npm run dev
```

### 9.3 環境變數

```env
# Backend (.env)
DATABASE_URL=mssql+pymssql://user:pass@host:1433/dbname
JWT_SECRET=<random-64-char-string>
JWT_EXPIRY_HOURS=8
CORS_ORIGINS=http://localhost:5173
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASSWORD=<secret>
```

---

## 10. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| MS SQL 連線問題 | 後端無法啟動 | 開發階段可用 SQLite fallback |
| 大量資料效能 | 樞紐表卡頓 | TanStack Table 虛擬捲動 + 伺服器端分頁 |
| Excel 格式不一致 | 匯入失敗 | 嚴格驗證 + 提供範本 |
| 密碼重設 Email | 無法寄送 | 提供管理員手動重設替代方案 |
| 瀏覽器相容性 | UI 異常 | 目標 Chrome 90+ / Edge 90+ |

---

## 11. Spec 自我審查清單

- [x] **完整性**: 所有頁面、API、資料表都有定義
- [x] **一致性**: API response 格式統一、命名慣例一致
- [x] **可行性**: 技術選型與公司環境相容
- [x] **安全性**: 認證授權、輸入驗證、稽核日誌、Refresh Token
- [x] **效能**: 虛擬捲動、分頁、索引策略
- [x] **可測試性**: API 有明確的 contract、可獨立測試
- [x] **匯入匯出**: 格式定義清楚、流程完整 (preview → confirm)、預覽暫存 TTL
- [x] **錯誤處理**: 統一錯誤格式、用戶友善訊息
- [x] **部署**: 部署架構明確、環境變數獨立
- [x] **並發控制**: solution_map 使用樂觀鎖 (version)
- [x] **資料完整性**: 所有表統一有 created_at/updated_at
- [x] **Sankey 節點唯一性**: 使用 id + layer 避免跨層名稱衝突

### 11.1 審查修正記錄

| 等級 | 問題 | 修正 |
|------|------|------|
| HIGH | JWT 無 refresh 機制 | 加入 refresh token (HttpOnly cookie, 7天) + silent refresh |
| HIGH | Import 預覽暫存無 TTL | 定義 15 分鐘 TTL + 背景清理排程 |
| HIGH | Batch update 語意模糊 | 改為 POST (upsert)，明確回傳 created/updated 數量 |
| MEDIUM | solution_map 缺 created_at/by | 已補齊 |
| MEDIUM | 無並發編輯保護 | 加入 version 欄位 + 樂觀鎖 (409 Conflict) |
| MEDIUM | Sankey nodes 名稱可能衝突 | 改用 id + layer 分組 |
| LOW | status_definition 缺時間戳 | 已補齊 created_at/updated_at |
| LOW | 前端缺 /reset-password 路由 | 已補齊 |

---

*Last updated: 2026-04-16*
