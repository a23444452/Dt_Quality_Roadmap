# D^t Solution Roadmap 使用者手冊

## 目錄

1. [系統簡介](#系統簡介)
2. [快速開始](#快速開始)
3. [功能說明](#功能說明)
4. [權限說明](#權限說明)
5. [常見問題](#常見問題)

---

## 系統簡介

D^t Solution Roadmap 是一個品質管理解決方案追蹤系統，用於管理和監控各工廠 (Plant) 與製程 (Process) 的 D^t Solution 導入狀態。

### 系統特色

- 視覺化製程流程圖，快速掌握各製程的 Solution 分佈
- Solution Map 樞紐分析表，追蹤各 Tank Line 的導入狀態
- Dashboard 儀表板，呈現 KPI 指標與 Sankey 流程圖
- 完整的資料管理功能，支援 Excel 匯入/匯出

---

## 快速開始

### 1. 註冊帳號

1. 進入系統登入頁面，點選 **Register**
2. 填寫以下資訊：
   - **Name**: 顯示名稱
   - **Account**: 帳號 (登入用)
   - **Email**: 電子郵件
   - **Password**: 密碼 (至少 8 字元)
   - **Plant**: 選擇您負責的工廠
   - **Process**: 選擇您負責的製程
3. 點選 **Register** 提交申請
4. 等待管理員審核通過後，即可使用帳號登入

> **注意**: 註冊後帳號狀態為「待審核 (Pending)」，需管理員核准後才能登入。

### 2. 登入系統

1. 在登入頁面輸入 **Account** 和 **Password**
2. 點選 **Sign In** 登入
3. 登入成功後會自動導向 Process Map 首頁

### 3. 忘記密碼

1. 在登入頁面點選 **Forgot password?**
2. 輸入您的電子郵件
3. 系統會寄送密碼重設連結至您的信箱

---

## 功能說明

### Process Map (製程流程圖)

這是系統首頁，以視覺化方式呈現完整製程流程。

**使用方式**:
- 製程流程圖上的圓點代表各製程節點
- 滑鼠移到圓點上可查看該製程的 Station 和 Solution 數量
- 點選圓點可展開該製程的 D^t Solution 詳細清單

**清單欄位說明**:
| 欄位 | 說明 |
|------|------|
| Station | 工站名稱 |
| Solution Name | D^t Solution 名稱 |
| Quality Attribute | 品質屬性 |
| MP Plants | 已導入 MP (Mass Production) 的工廠 |

---

### Dashboard (儀表板)

提供系統整體 KPI 指標與數據視覺化。

**功能區塊**:

1. **KPI Cards** - 顯示關鍵績效指標
2. **Solution Flow (Sankey 圖)** - 呈現 Defect Category → Defect Type → D^t Solution → Plant 的關聯流程
3. **Plant Coverage Table** - 各工廠的 Solution 覆蓋率統計

**篩選條件**:
- Defect Category
- Defect Type
- D^t Solution
- Plant
- Process

> 選擇篩選條件後，所有圖表會即時更新。

---

### Solution Map (解決方案對照表)

以樞紐分析表形式呈現各 D^t Solution 在不同 Tank Line 的導入狀態。

**表格結構**:
- **列 (Row)**: D^t Solution 資訊 (Defect Category, Quality Attribute, Station, Solution Name)
- **欄 (Column)**: 各工廠的 Tank Line，以工廠分組

**狀態說明**:
- 每個儲存格顯示狀態代碼和顏色
- 滑鼠移到儲存格可查看狀態詳情
- 頁面底部有狀態圖例說明

**編輯狀態** (Editor/Admin 限定):
1. 將滑鼠移到可編輯的儲存格 (會顯示藍色背景)
2. 點選儲存格開啟編輯視窗
3. 選擇新的狀態
4. 點選 **Save** 儲存

> **權限限制**: Editor 只能編輯被分配 Plant 和 Process 交集的儲存格。

**篩選條件**:
- Process Category
- Process
- Station
- Defect Category
- Plant
- Status

---

### Process Analysis (製程分析)

提供進階的製程數據分析功能。

---

### Data Management (資料管理)

管理系統中的各項基礎資料。

**資料類別**:

| 分頁 | 說明 | 主要操作 |
|------|------|---------|
| Solutions | D^t Solution 清單 | 新增、編輯、刪除 |
| Defect Categories | 缺陷類別 | 新增、編輯、刪除 |
| Defect Types | 缺陷類型 | 新增、編輯、刪除 |
| Processes | 製程 | 新增、編輯、刪除 |
| Stations | 工站 | 新增、編輯、刪除 |
| Plants | 工廠 | 新增、編輯、刪除 |
| Tank Lines | Tank Line | 新增、編輯、刪除 |
| Import | 匯入資料 | 上傳 Excel 檔案 |
| Export | 匯出資料 | 下載 Excel 檔案 |

**匯入功能**:
1. 切換到 **Import** 分頁
2. 選擇要匯入的 Excel 檔案
3. 系統會驗證資料格式
4. 確認無誤後點選匯入

**匯出功能**:
1. 切換到 **Export** 分頁
2. 選擇要匯出的資料類型
3. 點選下載即可取得 Excel 檔案

---

### Profile (個人資料)

查看和管理個人帳號資訊。

**功能**:
- 查看帳號資訊 (帳號、名稱、角色、狀態)
- 變更密碼

**密碼規則**:
- 至少 8 個字元
- 必須包含大寫字母
- 必須包含小寫字母
- 必須包含數字

---

## 權限說明

系統有三種使用者角色，權限由低至高：

### Viewer (檢視者)

| 功能 | 權限 |
|------|------|
| Process Map | 查看 |
| Dashboard | 查看 |
| Solution Map | 查看 (無法編輯) |
| Process Analysis | 查看 |
| Data Management | 查看 |
| Profile | 查看、變更密碼 |

---

### Editor (編輯者)

擁有 Viewer 所有權限，另外可以：

| 功能 | 額外權限 |
|------|---------|
| Solution Map | 編輯**被分配 Plant 與 Process 交集**的儲存格 |
| Data Management | 編輯**被分配範圍內**的資料 |

**權限範例**:
- 假設 Editor 被分配 Plant: `TPE`, Process: `Finishing`
- 則只能編輯 TPE 工廠中 Finishing 製程相關的 Solution 狀態

---

### Admin (管理員)

擁有系統完整存取權限：

| 功能 | 權限 |
|------|------|
| 所有頁面 | 完整存取 |
| User Management | 審核帳號、編輯使用者、停用帳號、重設密碼 |
| Admin Settings | 管理狀態定義 (Status Code、顏色) |

---

### 權限對照總表

| 功能 | Viewer | Editor | Admin |
|------|--------|--------|-------|
| 查看 Process Map | ✓ | ✓ | ✓ |
| 查看 Dashboard | ✓ | ✓ | ✓ |
| 查看 Solution Map | ✓ | ✓ | ✓ |
| 編輯 Solution Map | ✗ | 限定範圍 | ✓ |
| 查看 Data Management | ✓ | ✓ | ✓ |
| 編輯 Data Management | ✗ | 限定範圍 | ✓ |
| User Management | ✗ | ✗ | ✓ |
| Admin Settings | ✗ | ✗ | ✓ |
| 變更個人密碼 | ✓ | ✓ | ✓ |

---

## 管理員專屬功能

### User Management (使用者管理)

**存取路徑**: 左側選單 → Admin → User Management

**功能**:

#### 1. 審核新用戶
當有新用戶註冊時，狀態為 `Pending`：
1. 點選 **Approve** 開啟審核視窗
2. 設定角色 (Viewer / Editor / Admin)
3. 確認或調整 Plants 和 Processes 分配
4. 點選 **Approve** 完成核准

#### 2. 拒絕用戶
點選 **Reject** 可拒絕待審核的用戶申請。

#### 3. 編輯用戶
針對已啟用 (Active) 的用戶：
1. 點選 **Edit** 開啟編輯視窗
2. 可修改角色和分配的 Plants / Processes
3. 點選 **Save** 儲存

#### 4. 停用用戶
點選 **Disable** 可停用用戶帳號，停用後該用戶無法登入。

#### 5. 重設密碼
點選 **Reset PW** 可重設用戶密碼，系統會寄送新密碼至用戶信箱。

**使用者狀態**:

| 狀態 | 說明 | 可執行操作 |
|------|------|-----------|
| Pending | 待審核 | Approve, Reject, Reset PW |
| Active | 已啟用 | Edit, Disable, Reset PW |
| Disabled | 已停用 | Reset PW |
| Rejected | 已拒絕 | Reset PW |

---

### Admin Settings (系統設定)

**存取路徑**: 左側選單 → Admin → Settings

**功能**:

#### 管理狀態定義 (Status Definition)
Solution Map 中使用的狀態代碼和顏色。

| 欄位 | 說明 |
|------|------|
| Code | 狀態代碼 (如 MP, IP, NA) |
| Name | 狀態名稱 |
| Color | 顯示顏色 |

**操作**:
- **Add Status**: 新增狀態定義
- **Edit**: 編輯現有狀態 (Code 不可修改)

---

## 常見問題

### Q1: 註冊後多久可以登入？
A: 需等待管理員審核通過後才能登入。如果急需使用，請聯繫系統管理員。

### Q2: 忘記密碼怎麼辦？
A: 
1. 在登入頁面點選 **Forgot password?**
2. 輸入註冊時使用的 Email
3. 檢查信箱取得重設連結
4. 或聯繫管理員重設密碼

### Q3: 為什麼我無法編輯 Solution Map 的某些儲存格？
A: 可能原因：
- 您的角色是 Viewer，無編輯權限
- 該儲存格不在您被分配的 Plant 或 Process 範圍內
- 請聯繫管理員調整您的權限設定

### Q4: 如何查看我被分配的 Plant 和 Process？
A: 
1. 點選右上角的使用者名稱
2. 進入 **Profile** 頁面
3. 查看帳號資訊區塊

### Q5: 如何聯繫系統管理員？
A: 
- 登入頁面和側邊欄底部都會顯示 **Admin Contact** 的 Email
- 點選 Email 可直接開啟郵件軟體

---

## 聯絡資訊

如有任何問題或建議，請聯繫系統管理員。

管理員聯絡方式顯示於：
- 登入頁面底部
- 系統左側選單底部

---

*最後更新: 2026-04-28*
