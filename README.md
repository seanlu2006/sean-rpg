# SEAN: Self-Funded

一個單檔 HTML 的人生 RPG 打卡面板。純前端、無後端，進度存在你自己的 GitHub private repo。

- **線上開啟**：GitHub Pages（見下方）
- **存檔位置**：另一個 private repo（預設 `sean-rpg-save`）裡的 `save.json`
- **程式碼**：就這個 `index.html`，純靜態、無 build step

## 運作方式

面板用瀏覽器直接打 GitHub Contents API 讀寫 `save.json`。沒設定 token 時自動降級成瀏覽器本機儲存（localStorage），連本機都不行時降級成記憶體（不存）。

## 首次設定（在面板裡做）

1. 打開部署好的網址。
2. 點右上角徽章 `● LOCAL`（或最下面「⚙ 同步設定」）。
3. 填入：
   - **owner**：你的 GitHub 帳號名
   - **repo**：存檔 repo 名稱（`sean-rpg-save`）
   - **path**：`save.json`
   - **token**：下面產生的 fine-grained PAT
4. 按「連接並同步」。右上徽章變 `● SYNCED` 就成功了。

## 產生 Token（務必自己做，token 不要給任何人／AI）

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token

- **Repository access**：Only select repositories → 只選 `sean-rpg-save`
- **Permissions**：Repository permissions → **Contents: Read and write**（其他全部 No access）
- 產生後複製 `github_pat_...`，貼進面板設定。

## 安全鐵律

- 存檔 repo **必須 private**。
- Token 用 **fine-grained、單一 repo、僅 Contents 讀寫**。不要用 classic token、不要給 `repo` 全權。
- Token 只存在你自己裝置的瀏覽器 localStorage（key: `sean_rpg_ghcfg`），**永遠不會**寫進這個 repo。
- Token 外洩時：到 GitHub 撤銷該 token 即可，損失僅限存檔 repo。
- `index.html` 可以公開，但**永遠不要**把任何含 token 的檔案或 `.env` 提交上來（已加 `.gitignore` 防呆）。

## 已知邊界

- 多裝置**同時**寫入可能 sha 衝突（後寫覆蓋前寫）。單人使用幾乎不會遇到；PUT 失敗會 fallback 寫本機，不會壞資料。
- 打勾音效用 WebAudio 合成、震動用 `navigator.vibrate`；iOS Safari 需先互動一次才會出聲，屬正常。
