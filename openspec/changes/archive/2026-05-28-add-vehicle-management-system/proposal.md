## Why（動機）

公司需要一個可由管理者集中維護、現場員工自助查閱的車輛 asset (資產) 管理工具。目前車輛資訊散落在 Excel 與個人記事中，無法統計、無法即時看到狀態，也無法把車輛責任掛在特定員工身上。本次以一個整合性的 MVP (Minimum Viable Product，最小可行產品) 一次補齊基礎能力，建立後續延伸功能（保養提醒、保險到期、報表）的骨架。

## What Changes（變更內容）

- 建立 Monorepo (單一程式碼庫) 骨架（`apps/web`、`apps/api`、`packages/shared`）並導入 npm workspaces。
- 新增登入頁與 JWT (JSON Web Token) 認證流程，採 admin (管理者) / user (一般使用者) 兩種 role (角色)；**不開放自助註冊 (self-service registration)**，帳號只能由 admin 在員工管理頁建立。
- 新增首頁 dashboard (儀表板)：6 張關鍵數據 card (卡片) + 3 張 chart (圖表)（pie chart 圓餅、bar chart 長條、12 個月 line chart 折線）；資料具 role-aware (角色感知) 能力，user 只看自己負責的車輛統計。
- 新增車輛管理頁：列表（pagination 分頁／搜尋／篩選）＋ 新增、編輯、刪除（hard delete，硬刪除）。admin 可看全公司，user 僅可檢視自己 `ownerId` 對應的車輛。
- 新增員工管理頁：列表 + 新增、編輯、重設密碼；離職僅將 `status` 切換為 `INACTIVE`（不執行 hard delete）；整個頁面與相關 API 僅 admin 可存取。
- 導入 Postgres + Prisma，並提供 docker-compose 讓本地開發可一鍵啟動：包含 `db` (Postgres) 與 `pgadmin` (pgAdmin4，Postgres 管理網頁) 兩個 service (服務)，方便檢視資料、執行 query (查詢) 與除錯。
- 統一 API 錯誤格式 `{ error: { code, message, details? } }`，並建立 401／403／404 的 middleware (中介層) 慣例。

## Capabilities（能力清單）

### New Capabilities

- `auth`：帳號密碼登入、JWT 簽發與驗證、目前使用者查詢、登出、bcrypt 密碼 hashing (雜湊) 與基本 brute-force (暴力破解) 防護。
- `vehicles`：車輛 entity (實體) 的 CRUD (Create/Read/Update/Delete)、依角色過濾的查詢、列表搜尋與分頁、與員工的責任關聯。
- `employees`：員工資料維護、登入帳號與角色建立、離職狀態切換、密碼重設；僅 admin 可存取。
- `dashboard`：角色感知的彙整統計 API（6 卡 + 3 圖）與對應前端視圖。

### Modified Capabilities

（無，這是專案的首個 change，目前沒有既有 spec。）

## Impact（影響範圍）

- **新檔案／結構**：`apps/web/`、`apps/api/`、`packages/shared/`、`apps/api/prisma/schema.prisma`、`docker-compose.yml`。
- **依賴新增**
  - api：`express`、`@prisma/client`、`prisma`、`bcrypt`、`jsonwebtoken`、`zod`、`cookie-parser`、`cors`、`helmet`、`pino`、`jest`、`supertest`、`ts-node-dev`、`typescript`、`tsx`。
  - web：`react`、`react-dom`、`react-router-dom`、`@tanstack/react-query`、`@tanstack/react-table`、`zustand`、`react-hook-form`、`zod`、`@hookform/resolvers`、`recharts`、`tailwindcss`、`shadcn/ui` 元件、`vitest`、`@testing-library/react`。
  - shared：`zod`。
- **環境變數**：`DATABASE_URL`、`JWT_SECRET`、`JWT_EXPIRES_IN`、`COOKIE_SECRET`、`WEB_ORIGIN`、`API_PORT`、`SEED_ADMIN_USERNAME`、`SEED_ADMIN_PASSWORD`、`PGADMIN_DEFAULT_EMAIL`、`PGADMIN_DEFAULT_PASSWORD`。
- **本地服務**：docker-compose 提供 `db`（Postgres 16，port 5432）與 `pgadmin`（pgAdmin4，web UI 預設 port 5050）兩個 service，並透過預載的 `servers.json` 自動連到 `db`。
- **資料庫**：新增 `employees`、`vehicles` 兩張資料表與三個 enum (`Role`、`VehicleStatus`、`EmployeeStatus`)；提供 seed (種子) 腳本建立第一個 admin。
- **API**：新增 `/api/auth/*`、`/api/vehicles*`、`/api/employees*`、`/api/dashboard/summary` 四組路由前綴。
- **前端路由**：`/login`、`/`（dashboard）、`/vehicles`、`/employees`（admin 限定）。
- **測試**：api 用 Jest + supertest 覆蓋認證與權限關鍵路徑；web 用 Vitest + React Testing Library 覆蓋登入頁、車輛列表過濾、admin-only route guard。
- **Non-goals (不在本 change 範圍)**：multi-tenant (多租戶)、保養／保險到期提醒、頭像上傳、第三方 OAuth、i18n (國際化)、production (生產環境) 部署設定。
