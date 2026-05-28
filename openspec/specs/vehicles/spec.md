# vehicles Specification

## Purpose

本 capability 定義系統中「車輛 (vehicle)」的資料模型與管理面：包含 vehicle entity 結構（含 `plate` 唯一性、`year` 範圍、`ownerId` 必須指向 ACTIVE 員工等限制）、role-scoped 列表查詢（admin 看全部、user 僅看本人）、搜尋／篩選／分頁、detail 端點的「對無權者回 404 而非 403」隱蔽授權規則、admin-only 的變更性操作 (`POST` / `PATCH` / `DELETE`)，以及前端 `/vehicles` 頁面（依角色顯示／隱藏變更按鈕）。

## Requirements

### Requirement: vehicle entity (車輛實體) 結構 (Vehicle Entity Schema)

系統 SHALL 儲存 vehicle 並具備下列欄位：`id` (uuid)、`plate` (車牌，unique 不可重複的非空字串)、`make` (廠牌)、`model` (車型)、`year` (年份，integer，介於 1900 與「當年 + 1」之間)、`color` (顏色)、`status` (enum：`AVAILABLE` 可用、`MAINTENANCE` 維修中、`RETIRED` 報廢)、`mileage` (里程數，非負 integer，單位公里)、`purchasedAt` (購買日期)、`ownerId` (負責員工 id，可為 null，外鍵指向 employees.id)、`createdAt`、`updatedAt`。

#### Scenario: plate (車牌) 唯一性檢查 (Plate uniqueness is enforced)

- **WHEN** admin 以已存在的 `plate` 建立 vehicle
- **THEN** response SHALL 為 HTTP 409，body SHALL 為 `{ error: { code: "VEHICLE_PLATE_CONFLICT", message } }`

#### Scenario: year (年份) 驗證 (Year is validated)

- **WHEN** admin 提交 `year < 1900` 或 `year > 當年 + 1` 的 vehicle
- **THEN** response SHALL 為 HTTP 400，body SHALL 為 `{ error: { code: "VALIDATION_ERROR", message, details } }`

#### Scenario: owner (負責員工) 必須是在職員工 (Owner must reference active employee)

- **WHEN** admin 將 `ownerId` 設為一個不存在或 `status` 不為 `ACTIVE` 的員工 id
- **THEN** response SHALL 為 HTTP 400，body SHALL 為 `{ error: { code: "INVALID_OWNER", message } }`

### Requirement: 列表查詢需依角色限縮資料範圍 (Role-Scoped Vehicle Listing)

`GET /api/vehicles` SHALL 回傳分頁後的 vehicle 清單。對 admin SHALL 涵蓋所有 vehicle；對 user SHALL 僅包含 `ownerId` 等於請求者 `employeeId` 的 vehicle。此 filter SHALL 由伺服器強制執行，SHALL NOT 依賴 client 帶入的參數。

#### Scenario: admin 看到所有 vehicle (Admin sees all vehicles)

- **GIVEN** 資料庫中有 3 台分別屬於不同員工的 vehicle，以及 2 台未指派 owner 的 vehicle
- **WHEN** admin 呼叫 `GET /api/vehicles?page=1&pageSize=20`
- **THEN** response SHALL 為 HTTP 200，`items.length === 5`

#### Scenario: user 只看到自己負責的 vehicle (User sees only their own vehicles)

- **GIVEN** 資料庫中有 3 台 vehicle，其中 1 台 `ownerId = userA.employeeId`、另 2 台屬於其他員工
- **WHEN** `userA` 呼叫 `GET /api/vehicles?page=1&pageSize=20`
- **THEN** response SHALL 為 HTTP 200，`items.length === 1`
- **AND** 每一筆回傳的 item 的 `ownerId` SHALL 等於 `userA.employeeId`

#### Scenario: user 無法透過 query 參數繞過 owner filter (User cannot override owner filter)

- **WHEN** user 在 query string 帶入 `?ownerId=<其他人 employeeId>`
- **THEN** server SHALL 忽略此參數，並 STILL 只回傳屬於請求者的 vehicle

### Requirement: 列表支援搜尋與篩選 (Search and Filter on Listing)

列表 endpoint SHALL 支援下列 query 參數：`search` (對 `plate`、`make`、`model` 做不分大小寫的 substring 子字串比對)、`status` filter (列舉值之一或 `ALL`)、`page` (≥1)、`pageSize` (1–100)。預設值：`page=1`、`pageSize=20`、`status=ALL`。

#### Scenario: search 同時比對 plate / make / model (Search matches any of plate/make/model)

- **GIVEN** 資料庫含有 plate `ABC-1234`、`XYZ-9999`，與 make `Toyota`、`Honda`
- **WHEN** 請求帶 `?search=toy`
- **THEN** 僅 plate、make、model 任一含有 `toy`（不分大小寫）的 vehicle SHALL 被回傳

#### Scenario: status filter (狀態篩選) (Status filter)

- **WHEN** 請求帶 `?status=MAINTENANCE`
- **THEN** 僅 `status === "MAINTENANCE"` 的 vehicle SHALL 被回傳

#### Scenario: 分頁 metadata (Pagination metadata)

- **WHEN** 請求帶 `?page=2&pageSize=10`
- **THEN** response SHALL 為 `{ items: Vehicle[], page: 2, pageSize: 10, total: number, totalPages: number }`

### Requirement: vehicle detail (單筆查詢) 的授權規則 (Vehicle Detail Authorization)

`GET /api/vehicles/:id` SHALL 在請求者為 admin 或 為該 vehicle 的 owner 時回傳 vehicle；其餘情況 SHALL 回 HTTP 404 (而非 403)，避免向無權者洩漏 vehicle 是否存在。

#### Scenario: admin 可讀取任何 vehicle (Admin reads any vehicle)

- **WHEN** admin 呼叫 `GET /api/vehicles/<existing-id>`
- **THEN** response SHALL 為 HTTP 200，body 為該 vehicle 物件

#### Scenario: user 讀取自己的 vehicle (User reads their own vehicle)

- **GIVEN** `vehicle.ownerId === userA.employeeId`
- **WHEN** `userA` 呼叫 `GET /api/vehicles/<vehicle.id>`
- **THEN** response SHALL 為 HTTP 200，body 為該 vehicle 物件

#### Scenario: user 嘗試讀取他人 vehicle (User reads someone else's vehicle)

- **GIVEN** `vehicle.ownerId !== userA.employeeId`
- **WHEN** `userA` 呼叫 `GET /api/vehicles/<vehicle.id>`
- **THEN** response SHALL 為 HTTP 404，body SHALL 為 `{ error: { code: "VEHICLE_NOT_FOUND", message } }`

#### Scenario: 不存在的 vehicle (Non-existent vehicle)

- **WHEN** 任何登入使用者呼叫 `GET /api/vehicles/<unknown-id>`
- **THEN** response SHALL 為 HTTP 404，body SHALL 為 `{ error: { code: "VEHICLE_NOT_FOUND", message } }`

### Requirement: 變更性操作僅限 admin (Admin-Only Mutations)

`POST /api/vehicles`、`PATCH /api/vehicles/:id`、`DELETE /api/vehicles/:id` SHALL 僅供 admin 存取；非 admin 請求 SHALL 收到 HTTP 403。

#### Scenario: user 嘗試新增 (User attempts to create)

- **WHEN** user 以合法 payload 呼叫 `POST /api/vehicles`
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "FORBIDDEN", message } }`

#### Scenario: user 嘗試更新 (User attempts to update)

- **WHEN** user 對自己負責的 vehicle 呼叫 `PATCH /api/vehicles/<id>`
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "FORBIDDEN", message } }`

#### Scenario: user 嘗試刪除 (User attempts to delete)

- **WHEN** user 呼叫 `DELETE /api/vehicles/<id>`
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "FORBIDDEN", message } }`

#### Scenario: admin 新增成功 (Admin successfully creates)

- **WHEN** admin 以合法 payload 呼叫 `POST /api/vehicles`
- **THEN** response SHALL 為 HTTP 201，body 為新建的 vehicle

#### Scenario: admin 更新成功 (Admin successfully updates)

- **WHEN** admin 以合法 partial (部分) 欄位呼叫 `PATCH /api/vehicles/<id>`
- **THEN** response SHALL 為 HTTP 200，body 為更新後的 vehicle

#### Scenario: admin 刪除成功 (Admin successfully deletes)

- **WHEN** admin 呼叫 `DELETE /api/vehicles/<id>`
- **THEN** response SHALL 為 HTTP 204
- **AND** 後續對該 id 的 `GET /api/vehicles/<id>` SHALL 回 HTTP 404

### Requirement: 車輛前端頁面 (Vehicle Frontend Pages)

Web app SHALL 提供 `/vehicles` 路由，呈現具分頁與搜尋功能的 data table (資料表)。admin SHALL 看到「新增車輛」按鈕與每一列的「編輯」「刪除」操作；user SHALL NOT 看到任何 mutation (變更) 按鈕。

#### Scenario: admin 看到變更按鈕 (Admin sees mutation controls)

- **WHEN** admin 進入 `/vehicles`
- **THEN** 頁面 SHALL 顯示「新增車輛」按鈕
- **AND** 每一列 SHALL 顯示「編輯」與「刪除」按鈕

#### Scenario: user 看不到變更按鈕 (User does not see mutation controls)

- **WHEN** user 進入 `/vehicles`
- **THEN** 頁面 SHALL NOT 顯示任何新增／編輯／刪除按鈕或 menu (選單) 項目

#### Scenario: 刪除需二次確認 (Delete requires confirmation)

- **WHEN** admin 點擊某一列的「刪除」
- **THEN** SHALL 跳出 confirmation dialog (確認對話框)，使用者需明確按下確認後才會送出 `DELETE /api/vehicles/:id`
