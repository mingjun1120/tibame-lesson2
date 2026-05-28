## ADDED Requirements

### Requirement: employee entity (員工實體) 結構 (Employee Entity Schema)

系統 SHALL 儲存 employee 並具備下列欄位：`id` (uuid)、`employeeNo` (員工編號，unique 非空字串)、`name` (姓名)、`email` (unique，須符合 RFC-5322 規範)、`department` (部門)、`position` (職位)、`hiredAt` (入職日期)、`phone` (電話)、`status` (enum：`ACTIVE` 在職 / `INACTIVE` 離職，預設 `ACTIVE`)、`username` (登入帳號，unique 非空字串)、`passwordHash`、`role` (enum：`ADMIN` / `USER`，預設 `USER`)、`failedLoginCount` (登入失敗次數，integer，預設 0)、`lockedUntil` (鎖定到期時間，timestamp，可為 null)、`createdAt`、`updatedAt`。

#### Scenario: 唯一欄位 (unique field) 檢查 (Unique fields are enforced)

- **WHEN** admin 以已存在的 `employeeNo`、`email`、或 `username` 建立 employee
- **THEN** response SHALL 為 HTTP 409，body SHALL 為 `{ error: { code: "EMPLOYEE_CONFLICT", message, details: { field } } }`

#### Scenario: email 驗證 (Email is validated)

- **WHEN** admin 提交不符合 RFC-5322 規範的 `email`
- **THEN** response SHALL 為 HTTP 400，body SHALL 為 `{ error: { code: "VALIDATION_ERROR", message, details } }`

### Requirement: 員工 API 僅限 admin 存取 (Admin-Only Access)

所有 employees 相關 endpoint (`/api/employees*`) SHALL 要求請求者具有 `role = ADMIN`；非 admin 請求 SHALL 收到 HTTP 403；未登入請求 SHALL 收到 HTTP 401。

#### Scenario: 未登入請求 (Unauthenticated request)

- **WHEN** 對 `/api/employees*` 的請求未帶有有效 auth cookie
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "UNAUTHENTICATED", message } }`

#### Scenario: user 嘗試取得員工列表 (User attempts to list employees)

- **WHEN** user 呼叫 `GET /api/employees`
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "FORBIDDEN", message } }`

#### Scenario: user 嘗試取得員工詳情 (User attempts to read employee detail)

- **WHEN** user 呼叫 `GET /api/employees/<id>`
- **THEN** response SHALL 為 HTTP 403

### Requirement: 建立員工時一併設定登入資訊 (Create Employee with Initial Credentials)

`POST /api/employees` SHALL 接收員工資料欄位以及 `username`、`initialPassword`、`role`。Server SHALL 在儲存前以 bcrypt 對 `initialPassword` 進行 hashing，且 SHALL NOT 在 response 中回傳密碼或 hash。

#### Scenario: 建立成功 (Successful creation)

- **WHEN** admin 對 `/api/employees` 送出合法 payload
- **THEN** response SHALL 為 HTTP 201，body 為新建的 employee（不包含 `password` / `passwordHash`）
- **AND** 該 employee 寫入的 `passwordHash` SHALL 為對 `initialPassword` 進行 bcrypt 後的結果

#### Scenario: 初始密碼長度檢查 (Initial password complexity)

- **WHEN** `initialPassword` 長度小於 8
- **THEN** response SHALL 為 HTTP 400，code 為 `VALIDATION_ERROR`

### Requirement: 更新與「軟下架」員工 (Update and Soft Deactivate Employee)

`PATCH /api/employees/:id` SHALL 允許更新除 `id`、`passwordHash`、`failedLoginCount`、`lockedUntil` 之外的任何欄位。將 `status` 設為 `INACTIVE` SHALL 為唯一的「軟下架 (soft delete)」方式。`DELETE /api/employees/:id` SHALL NOT 存在。

#### Scenario: 不支援 hard delete (Hard delete is not supported)

- **WHEN** admin 呼叫 `DELETE /api/employees/<id>`
- **THEN** response SHALL 為 HTTP 405，body SHALL 為 `{ error: { code: "METHOD_NOT_ALLOWED", message } }`

#### Scenario: 設為 INACTIVE 不影響 vehicle 關聯 (Deactivating preserves vehicle ownership)

- **GIVEN** employee E 是 vehicle V 的 owner (`vehicle.ownerId === E.id`)
- **WHEN** admin 對 E 送出 `{ status: "INACTIVE" }`
- **THEN** response SHALL 為 HTTP 200
- **AND** vehicle V 的 `ownerId` SHALL 仍等於 E.id

#### Scenario: admin 不可降級自己 (Cannot change own role)

- **GIVEN** 請求者是 admin A
- **WHEN** A 對自己的紀錄送出 `{ role: "USER" }`
- **THEN** response SHALL 為 HTTP 400，body SHALL 為 `{ error: { code: "CANNOT_DEMOTE_SELF", message } }`

### Requirement: 重設密碼端點 (Reset Password Endpoint)

`POST /api/employees/:id/reset-password` SHALL 允許 admin 為任何 employee 設定新密碼。新密碼 SHALL 以 bcrypt 進行 hashing 後儲存；`failedLoginCount` 與 `lockedUntil` SHALL 被一併清除。

#### Scenario: 重設成功 (Successful password reset)

- **WHEN** admin 對 `/api/employees/<id>/reset-password` 送出 `{ newPassword: "valid-new-pw" }`
- **THEN** response SHALL 為 HTTP 204
- **AND** 該 employee 的 `passwordHash` SHALL 對應到 `newPassword`
- **AND** `failedLoginCount` SHALL 為 0，`lockedUntil` SHALL 為 null

#### Scenario: 弱密碼被拒 (Weak new password rejected)

- **WHEN** `newPassword` 長度小於 8
- **THEN** response SHALL 為 HTTP 400，code 為 `VALIDATION_ERROR`

### Requirement: 員工列表支援搜尋與篩選 (Search and Filter on Listing)

`GET /api/employees` SHALL 支援分頁 (`page`、`pageSize`)、`search` (對 `name`、`employeeNo`、`email` 做不分大小寫 substring 比對)、`department` filter、`status` filter (`ACTIVE` / `INACTIVE` / `ALL`，預設 `ACTIVE`)。

#### Scenario: 預設不顯示 INACTIVE (Default excludes inactive)

- **GIVEN** 資料庫中有 3 名 ACTIVE、2 名 INACTIVE 員工
- **WHEN** admin 呼叫 `GET /api/employees` 且不帶 `status` 參數
- **THEN** response SHALL 包含 3 筆資料

#### Scenario: 明確指定 INACTIVE (Explicit INACTIVE filter)

- **WHEN** admin 呼叫 `GET /api/employees?status=INACTIVE`
- **THEN** 僅 `status === "INACTIVE"` 的 employee SHALL 被回傳

### Requirement: 員工管理前端頁面 (Employees Frontend Page)

Web app SHALL 提供 `/employees` 路由，且 SHALL 僅供 admin 存取。非 admin 進入 `/employees` SHALL 被導回 `/`，且 SHALL NOT 看到頁面內容或觸發任何對 `/api/employees*` 的 API 呼叫。

#### Scenario: admin 進入頁面 (Admin renders the page)

- **WHEN** admin 進入 `/employees`
- **THEN** 頁面 SHALL 渲染員工 data table、搜尋、篩選器與「新增員工」按鈕

#### Scenario: user 被導回首頁 (User is redirected)

- **WHEN** user 進入 `/employees`
- **THEN** client SHALL 將其導回 `/`，且 SHALL NOT 對任何 `/api/employees*` endpoint 發送請求

#### Scenario: 重設密碼 UI (Reset password UI)

- **WHEN** admin 點擊某員工列的「重設密碼」
- **THEN** SHALL 跳出 dialog 要求輸入新密碼，並 SHALL 在前端驗證長度 ≥ 8 後呼叫 `POST /api/employees/:id/reset-password`
