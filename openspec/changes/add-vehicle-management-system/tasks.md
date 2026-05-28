## 1. Monorepo 骨架 (Monorepo Skeleton)

- [ ] 1.1 將根目錄 `package.json` 改為 workspace root，設定 `workspaces: ["apps/*", "packages/*"]`，並加入 scripts：`dev`、`build`、`lint`、`test`
- [ ] 1.2 加入根層共用 devDependencies：`typescript`、`@types/node`、`prettier`，並讓 ESLint config 沿用目前根層設定
- [ ] 1.3 建立 `packages/shared/`（TypeScript library，提供共用 type 與 zod schema），含 `src/index.ts` placeholder 與 `tsconfig.json`
- [ ] 1.4 加入 `.editorconfig`，並更新 `.gitignore`：忽略 `dist/`、`.env`、`coverage/`、`apps/api/prisma/migrations/dev.db*`
- [ ] 1.5 撰寫根 `README.md` quickstart：`docker compose up -d && npm install && npm run db:migrate && npm run seed && npm run dev`

## 2. 本地基礎建設 (Local Infrastructure)

- [ ] 2.1 在 repo 根目錄新增 `docker-compose.yml`，包含 `db` service：使用 Postgres 16、volume `vms_pgdata`、port 5432，環境變數 `POSTGRES_DB=vms`、`POSTGRES_USER=vms`、`POSTGRES_PASSWORD=vms`；附 healthcheck (`pg_isready`)
- [ ] 2.2 在同一份 `docker-compose.yml` 中新增 `pgadmin` service：使用 image `dpage/pgadmin4`、host port `5050:80`、`depends_on: { db: { condition: service_healthy } }`、volume `vms_pgadmin`，環境變數 `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` 從 `.env` 取得；兩個 service 共用 docker network `vms-net`
- [ ] 2.3 建立 `infra/pgadmin/servers.json`，預先註冊一個指向 `db:5432` 的 connection（資料庫 `vms`、user `vms`），透過 mount `/pgadmin4/servers.json` 載入；同步建立 `infra/pgadmin/pgpass`（mode 600），並設定 `PGPASS_FILE` env，讓 pgAdmin 登入後不需再輸入 DB 密碼
- [ ] 2.4 加入 `.env.example`，記錄：`DATABASE_URL`、`JWT_SECRET`、`JWT_EXPIRES_IN`、`COOKIE_SECRET`、`WEB_ORIGIN`、`API_PORT`、`SEED_ADMIN_USERNAME`、`SEED_ADMIN_PASSWORD`、`PGADMIN_DEFAULT_EMAIL`、`PGADMIN_DEFAULT_PASSWORD`
- [ ] 2.5 驗證 `docker compose up -d`：`db` 起來後 `psql` 可連 localhost:5432；瀏覽器開 `http://localhost:5050` 能登入 pgAdmin、且左側 server tree 已預先綁定到 `db` connection、可開啟 `vms` 資料庫

## 3. 資料庫 schema (Database Schema)

- [ ] 3.1 建立 `apps/api/`，安裝 `typescript`、`tsx`、`ts-node-dev`，並設定 `package.json` scripts：`dev`、`build`、`start`、`test`、`db:migrate`、`db:reset`、`db:studio`、`seed`
- [ ] 3.2 新增 `apps/api/prisma/schema.prisma`：enum (`Role`、`VehicleStatus`、`EmployeeStatus`) 與 model (`Employee`、`Vehicle`) 完整依 spec，且 `plate`、`employeeNo`、`email`、`username` 為 unique
- [ ] 3.3 執行 `prisma migrate dev --name init`，確認 migration 檔產生、`prisma generate` 成功
- [ ] 3.4 撰寫 `apps/api/src/db/seed.ts`：根據 `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` 建立第一個 admin（bcrypt-hashed）

## 4. 共用 schema (Shared Schemas)

- [ ] 4.1 在 `packages/shared` 定義 zod schema：`loginSchema`、`createEmployeeSchema`、`updateEmployeeSchema`、`resetPasswordSchema`、`createVehicleSchema`、`updateVehicleSchema`、`listQuerySchema`
- [ ] 4.2 匯出 inferred type（`type LoginInput = z.infer<typeof loginSchema>` 等）
- [ ] 4.3 定義 API error 格式 `ApiError = { error: { code, message, details? } }` 與 helper builder

## 5. API 基礎建設 (API Foundation)

- [ ] 5.1 啟動 Express app：套用 `helmet`、`cors`（origin 由環境變數帶入）、`cookie-parser`、JSON body parser、`pino-http`；註冊 global error handler，統一回傳 `ApiError` 格式
- [ ] 5.2 實作 JWT issue／verify helper（HS256、`JWT_SECRET`、`JWT_EXPIRES_IN`）、CSRF token 推導（對 JWT 做 HMAC）、cookie helper
- [ ] 5.3 實作 `requireAuth` middleware：從 auth cookie 解析 JWT、設定 `req.user = { id, role, employeeId }`，缺失或不合法時依情境回 401（`UNAUTHENTICATED` / `TOKEN_EXPIRED` / `TOKEN_INVALID`）
- [ ] 5.4 實作 `requireAdmin` middleware：非 admin 一律 403 `FORBIDDEN`
- [ ] 5.5 實作 CSRF middleware：對 POST/PATCH/PUT/DELETE 強制驗 `X-CSRF-Token`（缺失 `CSRF_TOKEN_MISSING`、不符 `CSRF_TOKEN_INVALID`），`/api/auth/login` 為例外
- [ ] 5.6 註冊 404 handler 與 `HttpError` 統一錯誤映射

## 6. auth capability（API 端）

- [ ] 6.1 實作 `POST /api/auth/login`：以 `loginSchema` 驗 body；查 employee、檢查 `lockedUntil`、驗 bcrypt；失敗時遞增 `failedLoginCount`，到 5 次設 `lockedUntil`；成功時清空計數、發 JWT cookie + `csrfToken`
- [ ] 6.2 對 `status = INACTIVE` 員工回 `ACCOUNT_INACTIVE`；對鎖定中的帳號回 `ACCOUNT_LOCKED` 並附 `details.unlockAt`
- [ ] 6.3 實作 `POST /api/auth/logout`（清 cookie、回 204），套用 `requireAuth` + CSRF
- [ ] 6.4 實作 `GET /api/auth/me`（回 `{ user }`），套用 `requireAuth`
- [ ] 6.5 確認沒有 `POST /api/auth/register` route；加 explicit catch-all 對該路徑回 404，使該 spec scenario 可驗
- [ ] 6.6 Jest 測試：成功／無效／離職／鎖定／失敗計數重置／CSRF；`/me` 在有無 cookie 兩種情境下的行為

## 7. employees capability（API 端）

- [ ] 7.1 實作 `GET /api/employees`：分頁、`search`、`department`、`status` filter（預設 ACTIVE）；套用 `requireAuth` + `requireAdmin`
- [ ] 7.2 實作 `GET /api/employees/:id`：找不到回 404
- [ ] 7.3 實作 `POST /api/employees`：使用 `createEmployeeSchema`；bcrypt-hash `initialPassword`；任一 unique 衝突回 409 並帶 `details.field`
- [ ] 7.4 實作 `PATCH /api/employees/:id`：使用 `updateEmployeeSchema`；禁改 `passwordHash`、`failedLoginCount`、`lockedUntil`；admin 對自己降級 (`role = USER`) 時回 400 `CANNOT_DEMOTE_SELF`
- [ ] 7.5 實作 `POST /api/employees/:id/reset-password`：bcrypt-hash、清 `failedLoginCount` 與 `lockedUntil`、回 204
- [ ] 7.6 明確掛上 `app.delete("/api/employees/:id", ...)`，固定回 405 `METHOD_NOT_ALLOWED`
- [ ] 7.7 統一 serializer：employee response 永遠不含 `passwordHash` / `password`
- [ ] 7.8 Jest 測試：admin-only guard、list filter、CRUD happy path、不可自降、DELETE 回 405、INACTIVE 不影響 vehicle.ownerId

## 8. vehicles capability（API 端）

- [ ] 8.1 實作 `GET /api/vehicles`：分頁、`search`、`status` filter；admin 看全部、user 強制套用 `ownerId === req.user.employeeId`（不受 client 參數影響）
- [ ] 8.2 實作 `GET /api/vehicles/:id`：user 對非自己負責的 vehicle 回 404（非 403）以避免存在性洩漏
- [ ] 8.3 實作 `POST /api/vehicles`（admin only）：套用 `createVehicleSchema`、`ownerId` 必須指向 `status = ACTIVE` 員工、plate 衝突回 409、year 範圍檢查
- [ ] 8.4 實作 `PATCH /api/vehicles/:id`（admin only）：使用 `updateVehicleSchema`
- [ ] 8.5 實作 `DELETE /api/vehicles/:id`（admin only）：hard delete、回 204
- [ ] 8.6 Jest 測試：admin vs user 列表範圍、query 篡改不可繞、detail 不洩漏、admin CRUD happy path、user 操作 mutation 回 403、plate 409、invalid owner 400

## 9. dashboard capability（API 端）

- [ ] 9.1 實作 `GET /api/dashboard/summary`：依 `req.user` 推導 `DashboardScope`（admin 無 filter、user 以 `ownerId = employeeId` 為 filter）
- [ ] 9.2 Cards：`totalVehicles`、`availableVehicles`、`maintenanceVehicles`、`retiredVehicles`、`newVehiclesThisMonth`（SQL date function 計算）；`totalEmployees` 僅 admin 回（ACTIVE only），對 user 完全 OMIT 該欄位
- [ ] 9.3 Charts：`statusDistribution`（三種 enum 全列）、`vehiclesByDepartment`（僅 admin；group by `employee.department`，`null` department 歸於「未指派」）、`vehiclesTrendLast12Months`（rolling 12 個月、長度固定 12、最後一筆為當月）
- [ ] 9.4 對於 SQL aggregation 顯著比 client side group 還省時的 chart，使用單一 `prisma.$queryRaw`；其餘走 Prisma client
- [ ] 9.5 Jest 測試：admin vs user 範圍、user 缺欄位、trend 長度與起訖、零數量 status 仍出現、INACTIVE 不計入 totalEmployees、`ownerId = null` 歸於「未指派」

## 10. 前端基礎建設 (Web Foundation)

- [ ] 10.1 在 `apps/web/` scaffold Vite + React + TypeScript；設定 Tailwind；初始化 shadcn/ui 元件：`Button`、`Card`、`Dialog`、`Input`、`Select`、`Form`、`Label`、`Table`、`Tabs`、`Sheet`、`DropdownMenu`、`Toast`、`Skeleton`
- [ ] 10.2 安裝 `react-router-dom`、`@tanstack/react-query`、`@tanstack/react-table`、`zustand`、`react-hook-form`、`@hookform/resolvers`、`zod`、`recharts`、`axios`
- [ ] 10.3 建立 `apiClient`（axios，`withCredentials: true`）：request interceptor 注入 `X-CSRF-Token`，response interceptor 將 `ApiError` 轉為可被 React Query 捕獲的 throw
- [ ] 10.4 建立 `useAuth` store（Zustand）保存 `user`、`csrfToken`；app boot 時呼叫 `GET /api/auth/me` 進行 hydration
- [ ] 10.5 實作 `<RequireAuth>` 與 `<RequireAdmin>` route guard（分別導至 `/login` 與 `/`），確保 `<RequireAdmin>` 在 user 進入時 SHALL NOT 觸發任何 `/api/employees*` request
- [ ] 10.6 App shell：上方 nav bar（品牌、目前使用者、登出）、左側 sidebar（Dashboard／車輛／員工，「員工」僅 admin 可見）；light／dark theme toggle 儲存於 localStorage

## 11. auth 前端 (auth UI)

- [ ] 11.1 `/login` 頁：React Hook Form + zod（共用 `loginSchema`），提交後呼叫 `POST /api/auth/login`，成功後寫入 store、導至 `/`
- [ ] 11.2 inline 錯誤狀態：`INVALID_CREDENTIALS`、`ACCOUNT_INACTIVE`、`ACCOUNT_LOCKED`（顯示倒數 unlockAt）分別有對應提示
- [ ] 11.3 登出按鈕：呼叫 `POST /api/auth/logout`、清空 store、導至 `/login`
- [ ] 11.4 Vitest + React Testing Library 測試：happy path、鎖定／錯密的錯誤顯示

## 12. dashboard 前端 (Dashboard UI)

- [ ] 12.1 `/` 頁：6-card responsive grid 在上、3 chart 在下；以 `useQuery(['dashboard'], …)` 取 `/api/dashboard/summary`
- [ ] 12.2 Card 對應欄位若不存在則整張不渲染（user 看不到「員工總數」）
- [ ] 12.3 Chart 對應欄位若不存在則整張不渲染（user 看不到「各部門 bar chart」）；使用 Recharts 的 `PieChart`、`BarChart`、`LineChart`
- [ ] 12.4 Loading：Skeleton placeholder；Error：inline 錯誤區塊 + 「重試」按鈕觸發 `refetch`
- [ ] 12.5 Vitest + RTL 測試：角色感知的 widget 顯示、錯誤重試

## 13. vehicles 前端 (Vehicles UI)

- [ ] 13.1 `/vehicles` 路由：TanStack Table + shadcn data table，欄位：車牌、廠牌、車型、年份、狀態、里程數、購買日期、負責員工
- [ ] 13.2 搜尋（debounce 300ms）與 status 篩選 Select；分頁控制；URL query string 與狀態同步
- [ ] 13.3 admin only 的「新增車輛」按鈕：開啟 Sheet 內含 create form（RHF + zod）；成功後 invalidate 列表 query
- [ ] 13.4 每列「編輯」開啟同形態 Sheet；「刪除」開啟 AlertDialog 確認後才呼叫 DELETE
- [ ] 13.5 mutation 按鈕（新增／編輯／刪除）僅在 `user.role === "ADMIN"` 時渲染
- [ ] 13.6 Vitest + RTL 測試：admin 看到按鈕、user 看不到；刪除確認對話框；搜尋與 status filter 來回

## 14. employees 前端 (Employees UI)

- [ ] 14.1 `/employees` 路由：包在 `<RequireAdmin>`；data table 欄位：工號、姓名、Email、部門、職位、入職日期、狀態、角色
- [ ] 14.2 篩選：搜尋、部門、狀態（預設 ACTIVE）；分頁
- [ ] 14.3 「新增員工」Sheet：create form 含 `username`、`initialPassword`（前端驗 ≥ 8）、role select
- [ ] 14.4 每列「編輯」Sheet 進行更新（**不含** password 欄位）；「重設密碼」Dialog（newPassword ≥ 8）呼叫 `POST /api/employees/:id/reset-password`
- [ ] 14.5 全頁面 SHALL 無 delete 按鈕；「離職」皆透過編輯表單中的 status 切換完成
- [ ] 14.6 Vitest + RTL 測試：user 進入時被導走；admin 看到完整 UI；reset-password 對話框驗證；409 衝突顯示

## 15. End-to-End sanity（手動）

- [ ] 15.1 從乾淨狀態執行：`docker compose up -d && npm install && npm run db:migrate && npm run seed && npm run dev`
- [ ] 15.2 確認 pgAdmin 在 `http://localhost:5050` 可登入、左側 server tree 內 `db` connection 可直接開啟並看到 `employees`、`vehicles` table
- [ ] 15.3 確認 seed admin 可登入、登出可運作；連續 5 次錯密後出現 `ACCOUNT_LOCKED`
- [ ] 15.4 以 admin 建立一名 role=USER 的員工；用另一個瀏覽器 profile 登入該 user，確認 `/employees` 被導走、`/vehicles` 為空
- [ ] 15.5 以 admin 建立一台屬於該 user 的 vehicle；切到 user 視角確認 `/vehicles` 顯示該車、dashboard 數字正確
- [ ] 15.6 以 admin 將該 user 設為 `INACTIVE`；確認其無法登入（`ACCOUNT_INACTIVE`）、admin 視角下該 vehicle 仍保有原 owner
- [ ] 15.7 執行 `openspec verify add-vehicle-management-system` 確保 spec 與實作一致
