# Vehicle Management System (VMS)

內部車輛管理系統。Monorepo（npm workspaces），前端 Vite + React + shadcn/ui，後端 Express + Prisma + Postgres。

---

## 一次性安裝

```bash
cp .env.example .env          # 第一次先複製出來、按需修改
docker compose up -d          # 啟 db (Postgres) + pgadmin (5050)
npm install                   # 安裝所有 workspace 依賴
npm run db:migrate            # 建立 schema
npm run seed                  # 建立第一個 admin（讀 .env 的 SEED_ADMIN_*）
npm run seed:mock             # 選用：塞 30 員工 + 50 車輛模擬資料，方便看 dashboard / 分頁
```

## 日常啟動

```bash
docker compose up -d          # 確保 db / pgadmin 在跑
npm run dev                   # 同時起 api 與 web
```

`npm run dev` 會用 `concurrently` 同時跑 `apps/api`（`tsx watch`）與 `apps/web`（`vite`）。

要停掉：在跑 `npm run dev` 的終端按 `Ctrl+C`；docker 服務則 `docker compose down`。

---

## 服務一覽

| 服務 | URL | 帳密 / 備註 |
|---|---|---|
| Web (Vite dev) | http://localhost:5174 | `apps/web/vite.config.ts` 預設 5174；被占用時 Vite 會往上找（5175、5176…），終端會印實際 port |
| API (Express) | http://localhost:3000 | `GET /api/health` 應回 `{"ok":true}` |
| Postgres | localhost:5432 | DB `vms` / user `vms` / password `vms`（見 `.env`） |
| pgAdmin (Postgres Admin 網頁) | http://localhost:5050 | 預設 `admin@example.com` / `admin`（見 `.env` 的 `PGADMIN_DEFAULT_*`） |

> **預設 admin 帳號**（用來登入 Web 的）：`admin` / `admin12345`，由 `npm run seed` 建立（讀 `.env` 的 `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`）。建議第一次登入後馬上到「員工管理」改密碼。

### Port 已被占用時怎麼辦

如果 3000、5174 已被其他程式占用，**最簡單**的做法是：
1. 改 `.env` 的 `API_PORT` 與 `WEB_ORIGIN`（兩者要對齊：例如 `API_PORT=3010` → `WEB_ORIGIN=http://localhost:5175`）。
2. 把 `apps/web/vite.config.ts` 的 `server.port` 改成同一個 port（或讓 Vite 自動 fallback，啟動時看終端印出的 `Local:` URL）。
3. 重新 `npm run dev`。

Vite 找不到 port 時會自己往上找一個能用的；但 **api 的 `WEB_ORIGIN` 要對齊 web 實際 port**，否則 CORS 會擋 cookie。

---

## 使用 pgAdmin（Postgres Admin 網頁）

### 登入 pgAdmin

1. 開 http://localhost:5050
2. 輸入：
   - Email：`admin@example.com`
   - Password：`admin`

（這兩個值定義在 `.env` 的 `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`，可自行修改）

### 連到 Postgres

**不需要手動 add server**。pgAdmin 啟動時已自動從 `infra/pgadmin/servers.json` 載入一條連線，並透過 `infra/pgadmin/pgpass` 預載密碼。登入後直接：

1. 左側 server tree 展開 **Servers → VMS local**
2. 展開 **Databases → vms → Schemas → public → Tables**
3. 可以看到 `Employee` 與 `Vehicle` 兩張表
4. 對著 table 按右鍵 → **View/Edit Data → All Rows** 即可查資料

### 如果要手動建立 Server（萬一 servers.json 沒生效）

按左側 Servers → 右鍵 → Register → Server，填：

| 分頁 | 欄位 | 值 |
|---|---|---|
| General | Name | 任意，例如 `VMS local` |
| Connection | Host name/address | **`db`**（這是 docker network 內的服務名，不是 `localhost`） |
| Connection | Port | `5432` |
| Connection | Maintenance database | `vms` |
| Connection | Username | `vms` |
| Connection | Password | `vms`（勾「Save password」省得每次再輸入） |

> 如果你是從 **host machine 直接連**（例如 `psql`、TablePlus、DBeaver），則用 `localhost:5432` / `vms` / `vms` / `vms`。`db` 這個 hostname 只在 docker compose network 內有效。

---

## 預設 Web 操作流程

1. 開 http://localhost:5174（或實際 Vite 印出的 URL）
2. 用 `admin` / `admin12345` 登入
3. Dashboard 應顯示 6 張 card + 3 張 chart（admin 視角）
4. 點左側「員工」可建立新員工（含登入帳號、角色）
5. 點左側「車輛」可建立／編輯／刪除車輛
6. 用建好的 user 帳號（在無痕視窗或別的瀏覽器）登入後：
   - 「員工」連結會消失
   - 「車輛」只看得到 `ownerId = 自己` 的車

---

## 結構

```
apps/
  api/     Express + Prisma（port 3000）
  web/     Vite + React + shadcn/ui（port 5174）
packages/
  shared/  兩邊共用的 zod schema、type、ApiError
infra/
  pgadmin/ pgAdmin 啟動時自動載入的 servers.json + pgpass
docker-compose.yml
openspec/  本專案的需求／設計／規格／任務（OpenSpec）
```

## 常用指令

```bash
npm run dev          # 同時起 api + web（concurrently）
npm test             # 跑 root + 兩個 app 的測試（jest、vitest）
npm run lint         # ESLint + 各 workspace lint
npm run db:migrate   # prisma migrate dev
npm run db:reset     # prisma migrate reset（會被 Prisma 防呆擋；輸入 y 才會跑）
npm run db:studio    # 開 prisma studio (5555)
npm run seed         # 重新建立 seed admin
npm run seed:mock    # 開發用：保留 ADMIN、清空其他資料，塞 30 員工 + 50 車輛
```

## 規格與設計

- 各 capability 目前的規格（已 sync）位於 `openspec/specs/{auth,dashboard,employees,vehicles}/spec.md`
- 歷史 change（含 proposal、design、tasks、delta specs）位於 `openspec/changes/archive/`
- 新需求請走 OpenSpec workflow（`.cursor/skills/` 與 `openspec-*` / `opsx:*` skills）開 change，不要直接手改主 specs

## 內建 Skills

`.agents/skills/` 下保留多個 OpenSpec 工作流 Skill，可用於後續 change 的提案、實作、驗證、封存。
