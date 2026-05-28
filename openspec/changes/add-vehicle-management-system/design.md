## Context（背景）

本專案目前只有空的 OpenSpec 設定與 Node.js + ESLint + Jest 的初始骨架，沒有任何前端、API、資料庫或實際 capability (能力)。本次要在同一個 PR (Pull Request) 級別的 change 內，建立 Monorepo 骨架與四個 capability 的第一版實作。團隊規模小（單人或兩人）、現場使用者以內網方式操作、無外部使用者，因此選型偏向「工程開銷低、迭代快、能直接導出 type (型別)」。

主要 constraint (約束)：

- 一開始只跑本地與單一伺服器，不做 horizontal scaling (水平擴展)，不需 session store。
- 主要使用者是中文母語的內部員工，介面採繁體中文，無 i18n (國際化) 需求。
- 後端與前端共用 schema，避免雙邊重複定義 type。

## Goals / Non-Goals（目標／非目標）

**Goals（目標）**

- 一次定義 monorepo、auth、vehicles、employees、dashboard 的 baseline (基準)，後續可以原子化地擴充。
- 後端強制執行 role-based (角色) 與 data scope (資料範圍) authorization (授權)，不依賴前端隱藏。
- 共用 zod schema 給 web 與 api，type 與 validation (驗證) 維持單一來源 (single source of truth)。
- 提供 docker-compose 讓開發者一鍵把 Postgres 跟 pgAdmin (Postgres 管理網頁) 跑起來，並有 seed 建第一個 admin。
- 所有 list endpoint (列表端點) 預設帶 pagination (分頁)，避免拉全表。

**Non-Goals（非目標）**

- Multi-tenant (多租戶)、SSO (單一登入)、第三方登入。
- 保養／保險到期提醒、報修工單、油耗紀錄（後續可基於 vehicle entity 擴充）。
- Production (生產環境) 部署（CI/CD、IaC、TLS、CDN）。
- 大量 audit log (稽核日誌)（先以 application log 為主，未來再做 audit table）。
- i18n、WCAG (Web Content Accessibility Guidelines，無障礙合規) 強制檢測。

## Decisions（決策）

### 1. 採 npm workspaces 的 Monorepo

選 `apps/web` + `apps/api` + `packages/shared`（必要時可再加 `packages/eslint-config`）。

**理由**：type 與 zod schema 要共用，monorepo 是最低 friction (摩擦) 的做法；npm 內建 workspaces，不需要額外安裝 pnpm／turbo。

**替代方案**：pnpm workspaces（更快但團隊不熟）、Nx／Turborepo（對 MVP 過度工程，不需要 task graph）。

### 2. JWT 放 HttpOnly cookie + CSRF token

`POST /api/auth/login` 成功後 `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Secure(prod)`，同時回傳一個 `csrfToken` 給前端放在 memory／state。所有 mutating request (變更性請求，POST/PATCH/DELETE) 需要在 `X-CSRF-Token` header (標頭) 帶回該值；後端用 `JWT_SECRET` 做 HMAC 一次驗 token 與 CSRF。

**理由**：避免 localStorage XSS (Cross-Site Scripting) 風險，又能搭配 SPA (Single Page Application)。

**替代方案**：純 Authorization header（簡單但 XSS 可竊取）、Session cookie + Redis（需要額外基礎設施）。

### 3. ORM 使用 Prisma

`schema.prisma` 是 single source of truth (單一資料來源)，`prisma migrate dev` 產生 migration (遷移檔)，`@prisma/client` 提供 type。

**理由**：type 自動推導品質最佳、團隊學習門檻最低，內建 Studio 利於除錯。

**替代方案**：Drizzle（更輕但生態小、團隊不熟）、手寫 SQL + Knex（彈性高但 boilerplate 多）。

### 4. 前端資料層：TanStack Query + React Hook Form + zod

`@tanstack/react-query` 管 server state、`react-hook-form` 管表單、`zod` resolver 共用 `packages/shared` 的 schema。

**理由**：成熟、文件齊全、與 shadcn/ui 模式相容。

**替代方案**：Redux Toolkit Query（對 MVP 過度）、SWR（API 較窄）、Formik（已不活躍）。

### 5. UI：shadcn/ui + Tailwind + Recharts

shadcn/ui 用「複製到 repo」方式管理 component，避免被鎖死在版本；Recharts 與 React 模型契合度最高、文件多。

**理由**：shadcn 的 Data Table 直接整合 TanStack Table，省去自行整合。

**替代方案**：MUI（風格較重、客製成本高）、Chart.js（無 React 原生整合）、Tremor（樣板偏 Dashboard，客製較窄）。

### 6. 後端授權策略：在 service layer (服務層) 做 scope filter

例如 `vehicleService.list({ actor, query })` 內部依 `actor.role` 自動加 `where: { ownerId: actor.employeeId }`。

**理由**：避免每個 controller 都重複寫一段 `if (role === USER)`，把規則集中。

**替代方案**：Casbin／accesscontrol 套件（對 MVP 過大）、controller-level guard（容易遺漏）。

### 7. User 取不到自己沒權限的車：回 404 而不是 403

`GET /api/vehicles/:id` 若 user 不是負責員工，回 404。

**理由**：避免讓未授權者透過 403 推斷某 id 存在，造成 information leak (資訊洩漏)；admin 仍正常回 200 或 404。

**替代方案**：一律回 403（有資訊洩漏風險）。

### 8. 暴力破解 (brute-force) 防護：簡化版納入 MVP

失敗 5 次後鎖 15 分鐘；鎖定資訊記在 `employees.failedLoginCount` 與 `lockedUntil` 兩個欄位。

**理由**：實作成本低、能擋掉腳本級攻擊；不引入 Redis 等外部依賴。

**替代方案**：完全不做（不安全）、IP-based rate limit（內網意義不大）。

### 9. 刪除策略

- `vehicles`：hard delete (硬刪除)。**理由**：MVP 沒有報表稽核需求。
- `employees`：禁止 hard delete，僅切換 `status = INACTIVE`。**理由**：`vehicle.ownerId` 需保留 reference (參照)。

### 10. Dashboard 採 single endpoint (單一端點) 而非多個小 endpoint

`GET /api/dashboard/summary` 一次回傳 6 cards + 3 charts 所需的所有資料。

**理由**：MVP 流量低，省下多次 round trip (往返)；前端 cache 一個 query key 即可。

**替代方案**：每個 widget 一個 endpoint（彈性高但 boilerplate 多）。

### 11. 共用 validation schema 放 `packages/shared/src/schemas`

例如 `loginSchema`、`createVehicleSchema`。後端 controller 直接 `schema.parse(req.body)`；前端 React Hook Form 用 `zodResolver(schema)`。

**理由**：validation 規則永遠一致，type 與 runtime 同源。

### 12. 環境變數策略

`.env`（gitignored）+ `.env.example`（commit）。後端用 `dotenv` 在 api 啟動時載入；前端用 Vite 的 `import.meta.env.VITE_*`。

### 13. 測試策略

- api：Jest + supertest，重點測 authentication、ownership filter、admin-only guard、CRUD happy path。DB 連到 docker-compose 的 `vms_test` schema，每個 suite 用 `prisma migrate reset --force --skip-seed` 重置。
- web：Vitest + React Testing Library，重點測登入流程、admin-only route guard、車輛列表搜尋與篩選顯示。
- 不在 MVP 做 E2E (End-to-End) 測試（Playwright）。

### 14. 本地 DB 管理介面採 pgAdmin

`docker-compose.yml` 除了 `db` 之外，加入 `pgadmin` service，使用 `dpage/pgadmin4` image，host port 對外暴露 `5050`。透過 `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` 設定初始登入帳號；以 mount 方式預載 `infra/pgadmin/servers.json`，讓登入後就有一個指向 `db` 的 connection (連線) 設定，減少手動建立的步驟。`pgadmin` 與 `db` 都在 `vms-net` 這個 docker network (網路) 內，因此 `servers.json` 的 host 寫 `db`、port 寫 `5432`。

**理由**：pgAdmin 是 Postgres 官方相關專案，對 Postgres 專屬功能（如 explain plan、role、index 細節）支援最完整，符合需求中「Postgres 管理網頁」的描述；且 web UI 可直接從 host browser 開啟，不需要在 host 端裝 client。

**替代方案**：

- Adminer：單檔、輕量、跨 DB，但 Postgres 專屬功能不如 pgAdmin 細。
- DBeaver / TablePlus 等 desktop client：每個開發者需各自安裝，與 docker-compose 一鍵起的目標不符。

**Trade-off**：pgAdmin image 較大（約 300MB），首次 pull 比較久；可接受。

## Risks / Trade-offs（風險／取捨）

- **[單一 dashboard endpoint]** 隨資料增加會變慢 → 先用單一 SQL aggregation (聚合查詢)；下一步可加 materialized view 或 cache。
- **[Hard delete vehicles]** 一旦刪除無法回復 → UI 顯示二次確認 Dialog (對話框)；之後可加 audit log。
- **[Employees 不可刪]** 員工資料會永遠累積 → 提供 INACTIVE filter (篩選器)，列表預設只顯示在職。
- **[HttpOnly cookie + CSRF]** 跨 SPA／跨網域場景部署複雜 → MVP 部署在同網域 / 反向代理後，先不考慮跨網域。
- **[簡易 lockout]** 攻擊者切換 username 就能繞過 → 內網系統可接受；未來可加 IP-based throttle。
- **[Prisma 對 raw SQL 友善度普通]** dashboard aggregation 需 raw query → 用 `prisma.$queryRaw` 並把語句集中在 `dashboardService`。
- **[shadcn/ui 元件需 copy-paste 升級]** 升級摩擦 → MVP 階段元件量少（Button、Card、Dialog、Table、Form、Select、Input、Tabs、Sheet、Dropdown、Toast），可接受。
- **[pgAdmin image 大]** docker pull 時間較長 → 一次性成本；若團隊有人偏好輕量，可後續切換到 Adminer，不影響 spec。

## Migration Plan（部署／回復計畫）

這是專案的首個 capability change，因此沒有對外的 breaking migration。內部步驟：

1. 建立 monorepo workspace 結構與根 `package.json`。
2. `docker compose up -d` 起 Postgres 與 pgAdmin。
3. `prisma migrate dev --name init` 建立 schema。
4. 跑 seed 腳本建立第一個 admin（讀 `.env` 的 `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`）。
5. 起 api（`npm run dev --workspace apps/api`）與 web（`npm run dev --workspace apps/web`）。
6. 用 seed 出的 admin 登入，建立其他員工帳號。

**Rollback (回復)**：若需要還原，刪除 `apps/`、`packages/`、`docker-compose.yml`、`infra/`、`openspec/specs/{auth,dashboard,vehicles,employees}`、`openspec/changes/add-vehicle-management-system` 與相關 root devDeps 即可，現有 Jest skill 練習程式不受影響。

## Open Questions（待釐清議題）

- 是否需要在登入頁支援「記住我」延長 token 有效期？目前預設 8 小時 + sliding refresh，暫不做。
- `department` 欄位是自由輸入字串、還是 enum 或另一張表？MVP 採自由輸入字串（同時前端提供 `<datalist>` 收斂已用過的部門）。
- Dashboard「本月新增」以 `createdAt` 還是 `purchasedAt` 計算？採 `purchasedAt`（業務意義更明確）。
- 圖表趨勢的 12 個月是 rolling 12 (滾動 12 個月) 還是當年度 1–12 月？採 rolling（含本月）。
- 第一個 admin 的建立要不要做成 CLI command (`npm run create-admin`)，而不是 seed？暫定先 seed，後續若需要再加 CLI。
- pgAdmin 預設帳號是否要寫死、還是強制每位開發者改？`.env.example` 給範例值，但 `.env` 由各開發者自行調整。
