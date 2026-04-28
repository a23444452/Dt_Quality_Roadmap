# D^t Solution Roadmap User Manual

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [Permissions](#permissions)
5. [FAQ](#faq)

---

## System Overview

D^t Solution Roadmap is a quality management solution tracking system designed to manage and monitor the implementation status of D^t Solutions across different Plants and Processes.

### Key Features

- Visual process flow map for quick overview of Solution distribution across processes
- Solution Map pivot table to track implementation status across Tank Lines
- Dashboard with KPI metrics and Sankey flow diagrams
- Comprehensive data management with Excel import/export support

---

## Getting Started

### 1. Register an Account

1. Go to the system login page and click **Register**
2. Fill in the following information:
   - **Name**: Your display name
   - **Account**: Username for login
   - **Email**: Your email address
   - **Password**: At least 8 characters, including uppercase, lowercase, and a number
   - **Plant**: Select your assigned plants
   - **Process**: Select your assigned processes
3. Click **Register** to submit your application
4. Wait for admin approval before you can log in

> **Note**: After registration, your account status will be "Pending" until approved by an administrator.

### 2. Log In

1. Enter your **Account** and **Password** on the login page
2. Click **Sign In** to log in
3. Upon successful login, you will be redirected to the Process Map homepage

### 3. Forgot Password

1. Click **Forgot password?** on the login page
2. Enter your email address
3. The system will send a password reset link to your inbox

---

## Features

### Process Map (Homepage)

This is the system homepage, displaying the complete process flow visually.

**How to Use**:
- Dots on the process flow map represent each process node
- Hover over a dot to see the Station and Solution count for that process
- Click on a dot to expand the detailed D^t Solution list for that process

**List Column Descriptions**:
| Column | Description |
|--------|-------------|
| Station | Station name |
| Solution Name | D^t Solution name |
| Quality Attribute | Quality attribute |
| MP Plants | Plants with Mass Production implementation |

---

### Dashboard

Provides overall system KPI metrics and data visualization.

**Sections**:

1. **KPI Cards** - Display key performance indicators
2. **Solution Flow (Sankey Diagram)** - Shows the relationship flow: Defect Category → Defect Type → D^t Solution → Plant
3. **Plant Coverage Table** - Solution coverage statistics by plant

**Filter Options**:
- Defect Category
- Defect Type
- D^t Solution
- Plant
- Process

> All charts update in real-time when filter conditions are changed.

---

### Solution Map

Displays the implementation status of each D^t Solution across different Tank Lines in a pivot table format.

**Table Structure**:
- **Rows**: D^t Solution information (Defect Category, Quality Attribute, Station, Solution Name)
- **Columns**: Tank Lines grouped by Plant

**Status Indicators**:
- Each cell displays a status code and color
- Hover over a cell to see status details
- Status legend is shown at the bottom of the page

**Editing Status** (Editor/Admin only):
1. Hover over an editable cell (highlighted with blue background)
2. Click the cell to open the edit dialog
3. Select the new status
4. Click **Save** to save changes

> **Permission Note**: Editors can only edit cells within their assigned Plant and Process intersection.

**Filter Options**:
- Process Category
- Process
- Station
- Defect Category
- Plant
- Status

---

### Process Analysis

Provides advanced process data analysis capabilities.

---

### Data Management

Manage various master data in the system.

**Data Categories**:

| Tab | Description | Main Operations |
|-----|-------------|-----------------|
| Solutions | D^t Solution list | Add, Edit, Delete |
| Defect Categories | Defect categories | Add, Edit, Delete |
| Defect Types | Defect types | Add, Edit, Delete |
| Processes | Processes | Add, Edit, Delete |
| Stations | Stations | Add, Edit, Delete |
| Plants | Plants | Add, Edit, Delete |
| Tank Lines | Tank Lines | Add, Edit, Delete |
| Import | Import data | Upload Excel files |
| Export | Export data | Download Excel files |

**Import Function**:
1. Switch to the **Import** tab
2. Select the Excel file to import
3. The system will validate the data format
4. Click import after confirming no errors

**Export Function**:
1. Switch to the **Export** tab
2. Select the data type to export
3. Click download to get the Excel file

---

### Profile

View and manage your personal account information.

**Features**:
- View account information (Account, Name, Role, Status)
- Change password

**Password Requirements**:
- At least 8 characters
- Must contain an uppercase letter
- Must contain a lowercase letter
- Must contain a number

---

## Permissions

The system has three user roles, from lowest to highest permission level:

### Viewer

| Feature | Permission |
|---------|------------|
| Process Map | View |
| Dashboard | View |
| Solution Map | View (cannot edit) |
| Process Analysis | View |
| Data Management | View |
| Profile | View, Change password |

---

### Editor

Has all Viewer permissions, plus:

| Feature | Additional Permission |
|---------|----------------------|
| Solution Map | Edit cells within **assigned Plant and Process intersection** |
| Data Management | Edit data within **assigned scope** |

**Permission Example**:
- If an Editor is assigned Plant: `TPE` and Process: `Finishing`
- They can only edit Solution statuses related to the Finishing process at the TPE plant

---

### Admin

Has full system access:

| Feature | Permission |
|---------|------------|
| All pages | Full access |
| User Management | Approve accounts, Edit users, Disable accounts, Reset passwords |
| Admin Settings | Manage status definitions (Status Code, Colors) |

---

### Permission Summary Table

| Feature | Viewer | Editor | Admin |
|---------|--------|--------|-------|
| View Process Map | ✓ | ✓ | ✓ |
| View Dashboard | ✓ | ✓ | ✓ |
| View Solution Map | ✓ | ✓ | ✓ |
| Edit Solution Map | ✗ | Limited scope | ✓ |
| View Data Management | ✓ | ✓ | ✓ |
| Edit Data Management | ✗ | Limited scope | ✓ |
| User Management | ✗ | ✗ | ✓ |
| Admin Settings | ✗ | ✗ | ✓ |
| Change own password | ✓ | ✓ | ✓ |

---

## Admin-Only Features

### User Management

**Access Path**: Left menu → Admin → User Management

**Functions**:

#### 1. Approve New Users
When new users register, their status is `Pending`:
1. Click **Approve** to open the approval dialog
2. Set the role (Viewer / Editor / Admin)
3. Confirm or adjust Plants and Processes assignments
4. Click **Approve** to complete

#### 2. Reject Users
Click **Reject** to reject pending user applications.

#### 3. Edit Users
For Active users:
1. Click **Edit** to open the edit dialog
2. Modify role and assigned Plants / Processes
3. Click **Save** to save changes

#### 4. Disable Users
Click **Disable** to disable a user account. Disabled users cannot log in.

#### 5. Reset Password
Click **Reset PW** to reset a user's password. The system will send the new password to the user's email.

**User Status Types**:

| Status | Description | Available Actions |
|--------|-------------|-------------------|
| Pending | Awaiting approval | Approve, Reject, Reset PW |
| Active | Active account | Edit, Disable, Reset PW |
| Disabled | Disabled account | Reset PW |
| Rejected | Rejected application | Reset PW |

---

### Admin Settings

**Access Path**: Left menu → Admin → Settings

**Functions**:

#### Manage Status Definitions
Status codes and colors used in the Solution Map.

| Field | Description |
|-------|-------------|
| Code | Status code (e.g., MP, IP, NA) |
| Name | Status name |
| Color | Display color |

**Operations**:
- **Add Status**: Create a new status definition
- **Edit**: Edit existing status (Code cannot be modified)

---

## FAQ

### Q1: How long until I can log in after registering?
A: You must wait for admin approval before logging in. If urgent, please contact the system administrator.

### Q2: What if I forget my password?
A: 
1. Click **Forgot password?** on the login page
2. Enter your registered email
3. Check your inbox for the reset link
4. Or contact an administrator to reset your password

### Q3: Why can't I edit certain cells in the Solution Map?
A: Possible reasons:
- Your role is Viewer, which has no edit permissions
- The cell is not within your assigned Plant or Process scope
- Contact an administrator to adjust your permission settings

### Q4: How can I see my assigned Plants and Processes?
A: 
1. Click your username in the top right corner
2. Go to the **Profile** page
3. View the account information section

### Q5: How do I contact the system administrator?
A: 
- The **Admin Contact** email is displayed at the bottom of the login page and sidebar
- Click the email to open your email client directly

---

## Contact Information

If you have any questions or suggestions, please contact the system administrator.

Administrator contact information is displayed at:
- Bottom of the login page
- Bottom of the left sidebar

---

*Last Updated: 2026-04-28*
