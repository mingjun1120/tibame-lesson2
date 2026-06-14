# tibame-lesson2

這是一個 AI 課程的範例專案，提供預設的 **Agent Skills** 供學員練習如何與 AI 協作開發。

## 關於 Agent Skills

專案內建的 Skills 放置於 `.agents/skills/` 目錄下。

每個 Skill 都是一份提示詞腳本，用來擴充 AI Agent 的特定能力。如果你使用其他 AI Agent（如 GitHub Copilot、Cursor、Gemini 等），可以參考這些 Skills 的結構與邏輯，改寫成符合你的工具的格式。

## 內建 Skills

| Skill | 說明 |
|-------|------|
| `git-smart-commit` | 將雜亂的 git 變更依功能邏輯自動拆分成多個有意義的 conventional commit |
| `git-pr-description` | 根據 branch 差異自動產生 Pull Request 的 Title 與 Description |
| `gen-test-cases` | 根據選取的程式碼或功能範圍，自動產生測試案例與對應測試程式 |
| `git-branch-name` | 根據變更內容，設計符合 kebab-case 命名規則的名稱 |

## 快速開始

1. 安裝 [Claude Code](https://claude.ai/code)
2. 在專案目錄下啟動 Claude Code
3. 輸入 `/` 即可看到可用的 Skills 清單

## 自訂 Skills

每個 Skill 的核心是 `SKILL.md`，描述該 Skill 的運作流程與規則。你可以：

- 直接修改現有 Skill 的行為
- 新增自己的 Skill 目錄與 `SKILL.md`
- 將 Skill 邏輯移植到其他 AI Agent 平台

---

# 車輛管理系統 (Vehicle Management System)

一套全端範例系統：登入、儀表板、車輛管理、員工管理，並以角色（管理者 / 一般使用者）控管權限。

- **前端** `frontend/`：React + Vite + Tailwind + shadcn 風格元件 + Magic UI，圖表用 Recharts
- **後端** `backend/`：Express (ESM) + Prisma + PostgreSQL，JWT 認證、bcrypt 密碼雜湊
- **資料庫** `docker-compose.yml`：PostgreSQL + pgAdmin（網頁管理介面）

> 設計與規格放在 `openspec/changes/add-vehicle-management-system/`。
> 註：密碼雜湊使用 `bcryptjs`（純 JS，免原生編譯）；Prisma 釘選在 v6（v7 改用 driver adapter，較複雜）。

## 權限

| 動作 | 一般使用者 `user` | 管理者 `admin` |
|---|:---:|:---:|
| 登入 / 儀表板 | ✓ | ✓ |
| 車輛 — 檢視 / 新增 / 編輯 | ✓ | ✓ |
| 車輛 — 刪除 | ✗ | ✓ |
| 員工 — 檢視 / 新增 / 編輯 / 刪除 | ✗ | ✓ |

## 環境需求

- Docker Desktop（啟動 Postgres + pgAdmin）
- Node.js 20+（建議 22/24）

## 啟動步驟

```bash
# 1) 啟動資料庫與 pgAdmin
cp .env.example .env            # 第一次才需要
docker compose up -d
#   Postgres → localhost:5433   pgAdmin → http://localhost:5050
#   （pgAdmin 登入：admin@example.com / admin）

# 2) 後端
cd backend
cp .env.example .env            # 第一次才需要
npm install
npx prisma migrate dev          # 建立資料表
npm run seed                    # 建立管理者帳號與範例資料
npm run dev                     # API → http://localhost:4000

# 3) 前端（另開一個終端機）
cd frontend
cp .env.example .env            # 第一次才需要
npm install
npm run dev                     # 前端 → http://localhost:5173
```

## 預設登入帳號（由 seed 建立）

| 角色 | 帳號 | 密碼 |
|---|---|---|
| 管理者 | `admin@example.com` | `admin123` |
| 一般使用者 | `alice@example.com` | `user123` |

> Postgres 對外埠改用 **5433**，避免與本機既有的 Postgres（5432）衝突。如需改回，調整根目錄 `.env` 的 `POSTGRES_PORT` 與 `backend/.env` 的 `DATABASE_URL`。
