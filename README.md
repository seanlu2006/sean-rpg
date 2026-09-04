# SEAN: Self-Funded

一個單檔 HTML 的人生 RPG 打卡面板。前端純靜態，存檔放在自己的 Cloudflare D1。

- **前端**：`index.html`（單檔，無 build step）
- **後端**：`functions/api/save.js`（Cloudflare Pages Functions）
- **資料庫**：Cloudflare D1（`schema.sql`）
- **PWA**：可加到主畫面、離線開啟（`manifest.json` + `sw.js`）

## 架構

```
Cloudflare Pages（同源）
  ├─ index.html            面板本體
  └─ functions/api/save.js  GET/PUT 存檔
        └─ D1  saves 資料表
```

面板打自家的 `/api/save`，帶一個 `X-RPG-Key` 標頭。伺服器拿它跟 Cloudflare 上的密鑰 `RPG_KEY` 比對。

**為什麼從 GitHub 搬過來**：舊版把 GitHub fine-grained token 存在每一台裝置的 localStorage，換裝置就得重貼一次 90 幾字元的 token，token 過期還要每台重換。現在改成「**憑證留在伺服器，裝置只記一組你背得起來的通行碼**」——換裝置只要再打一次同一組碼。

## 沒設定通行碼時

自動降級成 localStorage 本機儲存；連 localStorage 都不可用時降級成記憶體（不存）。這段邏輯已寫好。

## 部署

需要先 `npx wrangler login`（互動式，要在你自己的終端機跑）。

```bash
# 1. 建 D1，把回傳的 database_id 填進 wrangler.toml
npx wrangler d1 create sean-rpg-db

# 2. 建表
npx wrangler d1 execute sean-rpg-db --remote --file=schema.sql

# 3. 匯入舊存檔（可選，只做一次）
npx wrangler d1 execute sean-rpg-db --remote --file=seed-save.sql

# 4. 部署
npx wrangler pages deploy .

# 5. 設定通行碼（互動輸入，不會留在指令歷史）
npx wrangler pages secret put RPG_KEY --project-name sean-rpg
```

改完前端重跑第 4 步即可。

## 安全鐵律

- **通行碼建議 12 字元以上。** API 端點是公開的，太短的碼會被暴力猜。
- `RPG_KEY` 只放 Cloudflare secret，**不要**寫進 `wrangler.toml` 或任何檔案。
- 面板本身不含任何密鑰，`index.html` 可以公開。
- `.dev.vars`、`.wrangler/` 已在 `.gitignore` 裡，不要提交。
- 想撤銷所有裝置的存取：重設 `RPG_KEY` 即可，每台裝置需重新輸入新碼。

## 已知邊界

- 多裝置**同時**寫入是最後寫的贏（單人使用幾乎不會遇到）。PUT 失敗會 fallback 寫本機，不會壞資料。
- 打勾音效用 WebAudio 合成、震動用 `navigator.vibrate`；iOS Safari 需先互動一次才會出聲，屬正常。

## 舊版

`sean-rpg-save` 這個 private repo 是舊的 GitHub 存檔後端，遷移完成後可以留著當歷史備份，面板已不再讀寫它。
