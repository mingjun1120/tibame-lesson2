---
name: Git Branch Name
description: 根據目前 git 變更內容，設計符合 kebab-case 命名規則的 feature branch 名稱並建立與 checkout 該 branch。當使用者提到「開分支」、「建立 branch」、「新 branch」、「feature branch」、「branch 命名」時觸發此 Skill。
---

# Git Branch Name — 依變更內容命名並建立分支

依據當前 git 變更（staged + unstaged + untracked）分析功能意圖，產出符合 `<type>/<kebab-case-description>` 的 feature branch 名稱，經使用者確認後建立並 checkout 該 branch。

---

## 流程

### 1. 檢查前置狀態

先確認目前 git 狀態與所在 branch：

```bash
git branch --show-current
git status --short
```

**檢查事項：**

- **當前 branch 是否為 feature branch**：若當前已在一個非 `main` / `master` / `develop` 的 branch，提醒使用者「目前已在 `<branch>`，是否仍要從此處開新分支？」並等待確認。
- **是否有未提交變更可供分析**：若 `git status --short` 為空，告知使用者「目前沒有變更可供推測 branch 名稱，請提供 branch 的目的」並等待使用者描述。
- **是否存在衝突 / merge 中狀態**：若有，請使用者先處理，不繼續後續流程。

---

### 2. 蒐集變更資訊

取得完整的變更內容作為命名依據：

```bash
# 變更檔案清單
git status --short

# 已提交到 index 與工作區的 diff
git diff
git diff --cached

# 若有 untracked 新檔，列出內容輔助判斷
git ls-files --others --exclude-standard
```

---

### 3. 分析變更意圖

從 diff 中歸納出 **最核心的一個** 變更目的（不是多個）：

- 涉及的主要模組 / 元件 / 功能名稱
- 若變更分散在多個功能，挑出 **改動量最大或最主要** 的那一項作為 branch 主題，其餘於確認階段提示使用者可能需要拆分

---

### 4. 產生 Branch 名稱

#### 命名格式

```
<type>/<kebab-case-description>
```

#### type 規則

- **預設一律使用 `feature`**，不論變更為新增、重構、樣式、文件或雜務。
- **僅當使用者明確指示這是修 bug**（例如提到「bug」、「bugfix」、「修 bug」、「修復」）時，才使用 `bugfix`。
- **不自行從 diff 判斷要用 `bugfix`**，即使看起來像是修正，仍預設 `feature`，除非使用者點名。

| type | 使用時機 |
|------|---------|
| `feature` | 預設值，所有情況 |
| `bugfix` | 使用者明確指示為修 bug 時 |

#### description 規則（kebab-case）

- **全小寫**：所有字母轉為小寫
- **英文單字**：使用英文描述，不使用中文拼音或中文字
- **連字號分隔**：空白、底線、駝峰一律轉為 `-`
- **長度限制**：description 部分 3 ~ 6 個單字，整體 branch 名稱建議 ≤ 50 字元
- **禁止字元**：不得出現 `/`（type 之後除外）、空白、`_`、底線、中文、標點符號
- **動詞開頭**：以動詞開頭描述動作，例如 `add-`、`fix-`、`update-`、`remove-`、`refactor-`
- **聚焦功能**：描述「做什麼」而非「改哪個檔案」，例如 `feat/add-login-form` 而非 `feat/update-login-jsx`

#### 範例

| 變更內容 | 使用者是否指示修 bug | Branch 名稱 |
|---------|--------------------|------------|
| 新增登入表單元件 | 否 | `feature/add-login-form` |
| 重構 API 請求邏輯 | 否 | `feature/extract-api-client` |
| 調整首頁 Hero 間距 | 否 | `feature/tweak-hero-spacing` |
| 升級 Vite 與相關設定 | 否 | `feature/upgrade-vite` |
| 補充 README 安裝步驟 | 否 | `feature/add-install-guide` |
| 修復 Navbar 在手機版溢出 | 是（使用者提到 bugfix） | `bugfix/navbar-mobile-overflow` |

---

### 5. 確認與衝突檢查

在執行任何 git 操作之前，先列出提案讓使用者確認：

```
🌿 Branch 命名提案

  建議名稱：feature/add-login-form
  類型：feature（預設）
  依據：src/components/LoginForm.jsx、src/pages/Login.jsx 等新增檔案

確認建立並 checkout？(Y/n) 或輸入替代名稱
```

#### 衝突檢查

在使用者確認前，檢查該 branch 名稱是否已存在：

```bash
git rev-parse --verify <proposed-branch> 2>/dev/null
```

若已存在：

- 告知使用者該 branch 已存在
- 詢問是否改用其他名稱，或直接 `checkout` 既有 branch

---

### 6. 建立並 Checkout

使用者確認後執行：

```bash
git checkout -b <branch-name>
```

完成後執行：

```bash
git branch --show-current
```

將結果回報使用者，確認已切換至新 branch。

---

## 邊界情況處理

- **沒有任何變更**：請使用者口頭描述 branch 目的後，依描述產生 kebab-case 名稱，不自動推測。
- **變更跨多個功能**：提示使用者此 branch 主題可能過廣，建議先用 `git-smart-commit` 拆分，再分別開分支。
- **使用者直接提供名稱**：若使用者已指定完整 branch 名稱，僅做 kebab-case 與字元合法性校驗，不自行覆寫語意。
- **存在未提交變更且切換 branch**：`git checkout -b` 會帶著工作區變更一起切過去，先告知使用者此行為，避免誤解。
- **當前 branch 非 main/master/develop**：先確認使用者是要從當前 branch 再分支，或應先切回主分支再開。
