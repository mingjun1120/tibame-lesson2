## ADDED Requirements

### Requirement: 角色感知的彙整資料端點 (Role-Aware Summary Endpoint)

`GET /api/dashboard/summary` SHALL 回傳 dashboard 所需的彙整資料。回傳內容 SHALL 依角色 (role) 限縮 scope (範圍)：admin 取得全公司統計；user 取得僅針對 `ownerId` 等於請求者 `employeeId` 之 vehicle 的統計。

#### Scenario: admin 看到全公司資料 (Admin sees company-wide statistics)

- **GIVEN** 資料庫中合計有 10 台 vehicle（分布於不同員工）
- **WHEN** admin 呼叫 `GET /api/dashboard/summary`
- **THEN** response 的 `cards.totalVehicles` SHALL 等於 10

#### Scenario: user 只看到自己的資料 (User sees only their own statistics)

- **GIVEN** `userA` 負責 2 台 vehicle，其他員工共負責 8 台
- **WHEN** `userA` 呼叫 `GET /api/dashboard/summary`
- **THEN** response 的 `cards.totalVehicles` SHALL 等於 2
- **AND** 所有 aggregate (彙總) 欄位 SHALL 僅以 `userA` 負責的 vehicle 為計算來源

#### Scenario: 未登入請求 (Unauthenticated request)

- **WHEN** endpoint 被未帶有效 auth cookie 的 client 呼叫
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "UNAUTHENTICATED", message } }`

### Requirement: 6 個 summary card (彙整卡片) (Six Summary Cards)

Response SHALL 包含一個 `cards` 物件，欄位如下（皆為非負 integer）：

- `totalVehicles`（vehicle 總數）
- `availableVehicles`（status = `AVAILABLE` 的 vehicle 數）
- `maintenanceVehicles`（status = `MAINTENANCE` 的 vehicle 數）
- `retiredVehicles`（status = `RETIRED` 的 vehicle 數）
- `totalEmployees`（員工總數；僅 admin 可見，對 user OMITTED 省略）
- `newVehiclesThisMonth`（`purchasedAt` 落在當前 calendar month 當月的 vehicle 數，採 server 設定之時區）

#### Scenario: card 數值與 status breakdown 一致 (Card sums match status breakdown)

- **WHEN** 任何使用者呼叫該 endpoint
- **THEN** `cards.availableVehicles + cards.maintenanceVehicles + cards.retiredVehicles` SHALL 等於 `cards.totalVehicles`

#### Scenario: 對 user 省略 totalEmployees (totalEmployees omitted for users)

- **WHEN** user 呼叫該 endpoint
- **THEN** `cards.totalEmployees` 欄位 SHALL 不存在於 JSON payload (即「不為 0、不為 null，整個欄位不出現」)

#### Scenario: totalEmployees 只計算 ACTIVE (totalEmployees counts only ACTIVE)

- **WHEN** admin 呼叫該 endpoint
- **AND** 資料庫中有 5 名 ACTIVE、2 名 INACTIVE 員工
- **THEN** `cards.totalEmployees` SHALL 等於 5

### Requirement: 3 張 chart (圖表) (Three Charts)

Response SHALL 包含一個 `charts` 物件，內含：

- `statusDistribution`：array，元素為 `{ status: "AVAILABLE" | "MAINTENANCE" | "RETIRED", count: number }`；即使某個 status 數量為 0，仍 SHALL 出現該 key。
- `vehiclesByDepartment`：array，元素為 `{ department: string, count: number }`（僅 admin 可見，對 user OMITTED）。
- `vehiclesTrendLast12Months`：array 長度為 12，依月份 ascending 排序，元素為 `{ month: "YYYY-MM", count: number }`，代表該月 `purchasedAt` 落在區間內的 vehicle 數；最後一筆 SHALL 為當月。

#### Scenario: pie chart 包含 count 為 0 的 status (Pie chart includes zero-count statuses)

- **WHEN** admin 呼叫該 endpoint
- **AND** 沒有任何 vehicle 是 `status = RETIRED`
- **THEN** `charts.statusDistribution` SHALL 仍包含 `{ status: "RETIRED", count: 0 }`

#### Scenario: 對 user 省略 department chart (Department chart omitted for users)

- **WHEN** user 呼叫該 endpoint
- **THEN** `charts.vehiclesByDepartment` SHALL 不出現於 JSON payload

#### Scenario: trend chart 必為 12 個月且以當月結尾 (Trend chart spans exactly 12 months ending current month)

- **GIVEN** 今天為 `2026-05-28`
- **WHEN** 任何使用者呼叫該 endpoint
- **THEN** `charts.vehiclesTrendLast12Months` 的長度 SHALL 為 12
- **AND** 第一筆 SHALL 為 `{ month: "2025-06", count: ... }`
- **AND** 最後一筆 SHALL 為 `{ month: "2026-05", count: ... }`

#### Scenario: 部門 chart 依 employee.department 分組 (Department aggregation groups by employee.department)

- **GIVEN** admin scope 內，部門 A 員工合計負責 3 台、部門 B 員工合計負責 1 台、另有 2 台 `ownerId = null`
- **WHEN** admin 呼叫該 endpoint
- **THEN** `charts.vehiclesByDepartment` SHALL 包含 `{ department: "A", count: 3 }` 與 `{ department: "B", count: 1 }`
- **AND** SHALL 包含 `{ department: "未指派", count: 2 }`，用以表示未指派 owner 的 vehicle

### Requirement: dashboard 前端視圖 (Dashboard Frontend View)

Web app 的首頁路由 `/` SHALL 渲染 dashboard。Layout (版面) SHALL 將 6 個 card 以 responsive grid (響應式網格) 排列於上方、3 張 chart 排列於下方。對於因角色限縮而從 API response 缺席的 card 或 chart，前端 SHALL 完全不渲染（而非顯示空白 placeholder）。

#### Scenario: admin 看到所有 widget (Admin sees all widgets)

- **WHEN** admin 進入 `/`
- **THEN** 頁面 SHALL 顯示 6 張 card（含「員工總數」）與 3 張 chart（pie、bar、line）

#### Scenario: user 僅看到限縮後的 widget (User sees scoped widgets only)

- **WHEN** user 進入 `/`
- **THEN** 頁面 SHALL 顯示 5 張 card（不含「員工總數」）與 2 張 chart（不含部門 bar chart）

#### Scenario: loading 與 error 狀態 (Loading and error states)

- **WHEN** dashboard query 處於 loading 狀態
- **THEN** 每張 card SHALL 顯示固定尺寸的 skeleton placeholder
- **WHEN** dashboard query 失敗
- **THEN** 頁面 SHALL 顯示 inline 錯誤區塊，並提供「重試」按鈕，按下後 SHALL 重新 fetch 該 query
