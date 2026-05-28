## ADDED Requirements

### Requirement: 帳號建立僅限 admin (Account Provisioning Is Admin-Only)

系統 SHALL NOT 對外提供任何 self-service registration (自助註冊) 端點。所有帳號 MUST 由已登入的 admin 透過 employees capability 建立。

#### Scenario: 不存在公開註冊端點 (No public registration endpoint)

- **WHEN** 未登入的 client 對 `POST /api/auth/register`（或任何類似路徑）發送請求
- **THEN** API SHALL 回應 HTTP 404
- **AND** 不會建立任何帳號

#### Scenario: admin 透過 employees API 建立帳號 (Admin creates an account via employees API)

- **WHEN** 已登入的 admin 成功以 `username`、`initialPassword`、`role` 建立一名 employee
- **THEN** 該 employee SHALL 可立即使用該 credential (帳密) 進行登入

### Requirement: 密碼使用 bcrypt 儲存 (Password Storage Uses Bcrypt)

密碼 MUST 以 bcrypt hash (雜湊) 形式儲存（cost factor ≥ 10），且 MUST NOT 在任何 API response 中回傳。

#### Scenario: 建立時即進行 hashing (Password is hashed on creation)

- **WHEN** 以 `initialPassword` 建立一名 employee
- **THEN** 寫入 DB 的 `employees.passwordHash` SHALL 為 bcrypt hash
- **AND** 原始密碼 SHALL NOT 出現在任何儲存位置

#### Scenario: 密碼欄位不會出現在 response (Password fields are stripped from responses)

- **WHEN** 任何 endpoint 回傳一個 employee 物件
- **THEN** response 內 SHALL NOT 包含 `password` 或 `passwordHash` 欄位

### Requirement: 登入發出 JWT 並寫入 HttpOnly cookie (Login Issues JWT in HttpOnly Cookie)

`POST /api/auth/login` SHALL 接收 `{ username, password }`；成功時 SHALL 設定一個含 JWT 的 HttpOnly、SameSite=Lax cookie（使用 HS256 演算法簽章），並在 response body 回傳一個 CSRF token。

#### Scenario: 登入成功 (Successful login)

- **WHEN** client 以正確的 `{ username, password }` 呼叫 `/api/auth/login`
- **THEN** response SHALL 為 HTTP 200，body 結構 SHALL 為 `{ user: { id, name, role, employeeId }, csrfToken: string }`
- **AND** response 的 `Set-Cookie` header SHALL 帶有 auth token，並含 `HttpOnly` 與 `SameSite=Lax` 屬性

#### Scenario: 帳密錯誤 (Invalid credentials)

- **WHEN** `username` 不存在 OR 密碼與儲存的 hash 不符
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "INVALID_CREDENTIALS", message } }`
- **AND** 不會設定 auth cookie

#### Scenario: 已離職 (status = INACTIVE) 的員工無法登入 (Inactive employee cannot log in)

- **WHEN** `status = INACTIVE` 的員工以正確帳密登入
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "ACCOUNT_INACTIVE", message } }`

### Requirement: 變更性請求須通過 CSRF 防護 (CSRF Protection on Mutating Requests)

除 `/api/auth/login` 之外，所有 `POST`、`PATCH`、`PUT`、`DELETE` 請求 SHALL 要求帶有有效的 `X-CSRF-Token` header，其值 MUST 與登入時發出的 token 一致。

#### Scenario: 缺少 CSRF token (Missing CSRF token)

- **WHEN** 已登入的 client 在沒有 `X-CSRF-Token` header 的情況下呼叫 `POST /api/vehicles`
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "CSRF_TOKEN_MISSING", message } }`

#### Scenario: CSRF token 不正確 (Invalid CSRF token)

- **WHEN** 已登入的 client 以與發出值不符的 `X-CSRF-Token` 呼叫變更性 endpoint
- **THEN** response SHALL 為 HTTP 403，body SHALL 為 `{ error: { code: "CSRF_TOKEN_INVALID", message } }`

### Requirement: 登出會清除 session (Logout Clears Session)

`POST /api/auth/logout` SHALL 清除 auth cookie，並使當前 session 的 CSRF token 失效。

#### Scenario: 登出成功 (Successful logout)

- **WHEN** 已登入的 client 帶著有效的 CSRF token 呼叫 `/api/auth/logout`
- **THEN** response SHALL 為 HTTP 204
- **AND** response 的 `Set-Cookie` header SHALL 將 auth cookie 清除（值為空、`Max-Age=0`）

### Requirement: 取得當前使用者端點 (Current User Endpoint)

`GET /api/auth/me` SHALL 回傳當前已登入使用者的 profile (個人資料)；若未登入則 SHALL 回 HTTP 401。

#### Scenario: 已登入的請求 (Authenticated request)

- **WHEN** 帶有有效 auth cookie 的 client 呼叫 `GET /api/auth/me`
- **THEN** response SHALL 為 HTTP 200，body SHALL 為 `{ user: { id, name, role, employeeId, email } }`

#### Scenario: 未登入的請求 (Unauthenticated request)

- **WHEN** 沒有 auth cookie 的 client 呼叫 `GET /api/auth/me`
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "UNAUTHENTICATED", message } }`

### Requirement: brute-force (暴力破解) 鎖定機制 (Brute Force Lockout)

同一個 `username` 連續登入失敗 5 次後，帳號 SHALL 被鎖定 15 分鐘；登入成功 SHALL 重置失敗計數。

#### Scenario: 第 5 次失敗後鎖定 (Lockout after 5 failures)

- **GIVEN** 某 employee 最近 15 分鐘內已有連續 4 次登入失敗
- **WHEN** 第 5 次失敗發生
- **THEN** response SHALL 為 HTTP 401，code 為 `INVALID_CREDENTIALS`
- **AND** `employees.lockedUntil` SHALL 被設為 `now + 15 minutes`

#### Scenario: 鎖定中的帳號即使密碼正確也拒絕 (Locked account refuses correct password)

- **GIVEN** 一名 employee 的 `lockedUntil` 仍在未來
- **WHEN** 該 employee 提交正確的帳密
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "ACCOUNT_LOCKED", message, details: { unlockAt } } }`

#### Scenario: 登入成功後重置計數 (Counter resets on successful login)

- **GIVEN** 某 employee 先前累積 3 次失敗、且目前未處於 lock 狀態
- **WHEN** 該 employee 提交正確帳密
- **THEN** response SHALL 為 HTTP 200
- **AND** `employees.failedLoginCount` SHALL 被重置為 0

### Requirement: 認證 middleware (Authentication Middleware)

API SHALL 提供一個 middleware (中介層)，能從 auth cookie 解析 JWT 並 populate (填入) `req.user`。受保護的 route SHALL 在 cookie 缺失或 JWT 不合法／過期時回 HTTP 401。

#### Scenario: token 過期 (Expired token)

- **WHEN** client 帶著已過期的 JWT cookie 發送請求
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "TOKEN_EXPIRED", message } }`

#### Scenario: token 被竄改 (Tampered token)

- **WHEN** client 帶著 signature (簽章) 驗證失敗的 JWT 發送請求
- **THEN** response SHALL 為 HTTP 401，body SHALL 為 `{ error: { code: "TOKEN_INVALID", message } }`
