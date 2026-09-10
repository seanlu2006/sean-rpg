# 自給修行 · SEAN: Self-Funded

一個單檔 HTML 的每日打卡面板，做成日本道場的樣子。追蹤的不是「今天做了幾件事」，而是一個具體數字：**生活費自給率**——我自己賺到的錢，佔我生活開銷的百分之幾。

**線上版：https://sean-rpg.pages.dev**（PWA，可加到手機主畫面，離線也開得起來）

---

## 為什麼做這個

市面上的習慣 App 我用不久，問題不在功能，在**打卡本身會失去意義**。它們用點數和連續天數推著你走，撐三週後你會發現自己是為了不讓數字斷掉才做事的，然後某天想通「點數又不能幹嘛」，就再也不開了。

所以這個面板把重心放在**動作本身**，而不是分數。完成一件事就蓋一枚朱印：按下去有頓挫、有聲音、蓋了不能取消。三十枚印排成一片，那個累積本身就是證據。

面板裡還是有 EXP 和連續天數（老實說，要完全戒掉這套機制我沒做到），但它們刻意被壓在視覺後面——EXP 用漢字數字寫（「參拾伍」而不是「35」），不做成跳動的大數字。真正放在最上面、字最大的是自給率，因為那才是我想看的東西。

另一半原因是我在練交易，需要一個地方逼自己每天記錄「這筆是照規則做的，還是憑盤感」。這種事沒有現成工具，只好自己寫。

## 核心功能

- **自給率進度條**：0→100% 的主線目標，面板真正在等的那個數字
- **日課 / 週課 / 主線**：七件每日任務、三件每週任務、跨月的長期目標；七印齊落就是「完美的一天」
- **連印卷軸與墨 K 線**：近三十日的完美日紀錄，加上近七日落印數的走勢圖
- **收盤儀式**：按下「封存」後，當天的紀錄**真的轉成唯讀**，不是只變灰——不能事後補打卡
- **成就印譜**：六枚成就。三枚達標自動觸發，三枚要手動——滑鼠／觸控需長按 800 毫秒再確認，不能順手點到
- **寅時換日**：凌晨 04:00 才算新的一天。熬夜到兩點做完的事算前一天
- **三段降級儲存**：雲端 → 本機 → 記憶體，任何一層掛掉都不會讓你打不了卡

## 快速開始

沒有 build step，也沒有 `package.json`。

**只想看看長什麼樣**（不需要任何工具，存檔會走 localStorage）：

```bash
git clone https://github.com/seanlu2006/sean-rpg.git
cd sean-rpg/public
python3 -m http.server 8000    # 開 http://localhost:8000
```

**要連同 API 和資料庫一起跑**（需要 Node）：

```bash
# 1. 建立本機資料表（--local 是本機模擬的 D1，不會碰到線上資料）
npx wrangler d1 execute sean-rpg-db --local --file=db/schema.sql

# 2. 設定本機通行碼。.dev.vars 已列入 .gitignore
echo 'RPG_KEY="至少十二個字元的通行碼"' > .dev.vars

# 3. 啟動。不要加目錄參數——wrangler.toml 的 pages_build_output_dir 已經指定了
npx wrangler pages dev          # http://localhost:8788
```

**部署**：Cloudflare Pages 已接上這個 repo 的 `master` 分支，push 就自動部署，約 20 秒。線上的 `RPG_KEY` 設在 Pages 後台 Settings → Variables and secrets，型別選 Secret；**改完 secret 要重跑一次部署才生效**。

重建整個環境時才需要的一次性步驟：

```bash
npx wrangler login
npx wrangler d1 create sean-rpg-db      # 把回傳的 database_id 填進 wrangler.toml
npx wrangler d1 execute sean-rpg-db --remote --file=db/schema.sql
```

## 技術架構

前端 1 個 HTML 檔，後端 1 個 function，資料庫 1 張表。整包沒有依賴、沒有打包工具。

| 層 | 用什麼 | 為什麼 |
|---|---|---|
| 前端 | 單檔 HTML（CSS/JS 全內嵌） | 沒有 toolchain 就沒有 toolchain 會爛掉。兩年後打開還是能跑 |
| 部署 | Cloudflare Pages | 靜態站免費、push 即部署 |
| API | Pages Functions（`/api/save`） | 跟前端同源，不用處理 CORS |
| 資料庫 | Cloudflare D1（SQLite） | 單人面板，一張表一列就夠 |
| 離線 | Service Worker + PWA manifest | 手機當 App 用，沒網路也開得起來 |

### 資料怎麼流

整份狀態是瀏覽器裡的一個 JS 物件，同步時原封不動變成一個 JSON 字串。

```
瀏覽器 (public/index.html)
   │  fetch，帶 X-RPG-Key 標頭
   ▼
/api/save  (functions/api/save.js)
   │  比對 env.RPG_KEY（Cloudflare secret）
   ▼
D1 資料表 saves，固定一列 id='sean'
```

- **讀**：開頁時若本機存有通行碼 → `GET /api/save`，成功就進雲端模式
- **寫**：任何操作後 debounce 1.5 秒 → `PUT /api/save`。寫失敗會退而寫進 localStorage（只有雲端模式會 debounce，本機模式是同步寫）
- **降級**：沒設通行碼就直接用 localStorage；連 localStorage 都不能用（無痕模式等）就退到記憶體

任務 id（`trade`、`iron`、`m_boss`…）是存檔相容的關鍵：**改文案可以，改 id 會讓舊紀錄對不上**。

### 兩個值得說的決定

**一、只部署 `public/`，其餘留在 repo 但不上線**

`wrangler.toml` 裡 `pages_build_output_dir = "public"`，所以 CDN 上只有面板本身和 PWA 資源。`db/*.sql`、`wrangler.toml`、README 都留在 repo 裡（這是公開 repo，GitHub 上讀得到），但**不會被線上站台提供出去**。理由是部署出去的東西應該只有跑起來需要的檔案——`db/seed-save.sql` 裡是我真的存檔內容，它沒有理由出現在 CDN 上。

`functions/` 是唯一的例外：它得留在 **repo 根目錄**，因為 Pages 是從專案根目錄偵測它，不是從輸出目錄。這點踩過一次坑。

可以自己驗證：`curl https://sean-rpg.pages.dev/db/schema.sql` 回的是 `index.html`，不是那份 SQL。

**二、存檔後端從 GitHub private repo 搬到 D1**

舊版把存檔 commit 進另一個 private repo（`sean-rpg-save`），靠一組 GitHub fine-grained token 讀寫。問題是 **token 得存在每一台裝置的 localStorage**：換裝置要重貼九十幾個字元，token 過期還得每台重換一次，而且憑證就這樣躺在瀏覽器裡。

現在憑證只活在伺服器端——`RPG_KEY` 是 Cloudflare secret，裝置上只留一組我自己記得住的通行碼。要撤銷所有裝置的存取，改一次 secret 就好。

比對通行碼時用的是逐字元 XOR 累加的 `safeEqual`，不是 `===`。老實說在 JS runtime 加一個網路來回的情境下，`===` 的時間差幾乎不可能被實際利用，這比較像是「習慣養成」而不是必要的防護；而且它會先比長度再比內容，所以通行碼長度還是會外洩。

`sean-rpg-save` 那個 repo 還在，但只當歷史備份，面板已經不再讀寫它。

### 壞掉時怎麼判斷

```bash
curl -i https://sean-rpg.pages.dev/api/save
```

回 `401` 代表 Functions 有跑起來、路由有接上。**但 401 只能證明這件事**——`authed()` 在碰資料庫之前就先擋掉了，所以「D1 綁定掉了」和「`RPG_KEY` 根本沒設」這兩種情況，從外面看都一樣是 401。要分辨得帶正確的通行碼再打一次，或直接看 Pages 後台的 Functions log。

## 專案結構

```
sean-rpg/
├─ public/                 ← 只有這裡會被部署上線
│   ├─ index.html          面板本體：CSS + JS 全內嵌，單檔
│   ├─ sw.js               Service Worker，只快取同源資源
│   ├─ manifest.json       PWA 設定
│   └─ icon-192.png, icon-512.png, apple-touch-icon.png
├─ functions/api/save.js   GET/PUT 存檔（必須放在 repo 根目錄）
├─ db/
│   ├─ schema.sql          建表
│   ├─ seed-save.sql       舊存檔匯入（一次性，已執行過）
│   └─ repair.sql          修補某個 bug 造成的髒資料（一次性，已執行過）
└─ wrangler.toml           Pages / D1 設定
```

## 已知限制

這些是設計上的取捨，不是待修的東西：

- **單人使用，寫死的**。D1 裡固定一列 `id='sean'`，沒有使用者系統。要多人用得改資料模型。
- **多裝置同時寫入是最後寫的贏**。沒有衝突偵測——`updated_at` 有存，但目前純粹是擺著，前端拿到就丟掉。單人使用幾乎遇不到，兩台同時開著改就會踩到。
- **一組共用通行碼就是全部的認證**。API 端點是公開的。README 和 UI 都寫「12 字元以上」，但**這只是慣例，程式沒有真的擋**——前端只檢查非空，後端沒有長度下限。自用工具夠了，不是能拿去正式產品用的認證方式。
- **存檔上限 512K**，超過回 413。實作是 `text.length > 512*1024`，比的是 UTF-16 字元數不是位元組，所以常數名 `MAX_BYTES` 取錯了；對這個全中文的存檔來說，實際上限接近 1.5 MB 的 UTF-8。前端沒有針對 413 的處理，使用者只會看到同步失敗的標記。
- **iOS Safari 要先互動一次才有聲音**，這是瀏覽器的自動播放限制。顯示偏好（晝／夜）只存 localStorage，不進雲端——手機用夜間、桌機用日間應該各自獨立。

## 待修的問題

寫這份 README 時對照原始碼查出來的，還沒修：

- **Service Worker 會快取 `GET /api/save`**。`sw.js` 只跳過跨源請求，但 `/api/save` 是同源的，所以它落進「快取優先」那一路——存檔讀取可能拿到快取裡的舊資料。前端的 `cache:'no-store'` 管的是 HTTP 快取，繞不過 Service Worker。修法是在 fetch handler 開頭加一行跳過 `/api/`。
- **離線時的本機備份，回到線上後會被默默丟掉**。PUT 失敗會把狀態寫進 localStorage，但 `backendLoad()` 在雲端 GET 成功時是直接回傳遠端資料、從不讀那份備份。所以「離線改了東西 → 回到線上」會載入較舊的遠端存檔，然後把本機那份蓋掉。
- **鍵盤可以繞過成就的長按閘門**。手動成就用滑鼠要長按 800 毫秒，但 Space／Enter 的 handler 直接進確認對話框，沒有長按這關。
- **`rollover()` 自動頒發的成就不會馬上存檔**。`checkAutoAch()` 沒有呼叫 `scheduleSave()`，所以那枚印要等使用者做別的動作才會被存下來。

## 設計原則

視覺上刻意守幾條規矩，記在這裡是因為它們最容易被自己違反：

- **朱紅色只代表「你做到了」**，不能拿來當裝飾或標題強調。未完成的一律是墨的深淺。
- **金色全站只有一處**：印譜裡的最高成就。出現第二次就是違規。
- **常駐動效要壓到最少**：原則上只留香的火點和卷軸的今日格，其餘一律由使用者的動作觸發。（目前還有第三個沒清掉：自給率接近里程碑時，筆尖會呼吸。）
- 無 emoji、無等寬字、無浮起陰影卡片。層次靠邊線、留白和字距。
- 蓋印的頓挫感（動畫 + 震動 + 低頻音效）是整個產品的手感之錨，不要改成淡入或打勾。

## License

尚未指定。目前保留所有權利；要引用或改作請先開 issue 問一聲。

---

> 這是給自己用的工具，任務內容、公案、語錄都是我的。要拿去改的話，資料都寫在 `public/index.html` 最上面的常數區（`DAILY`、`WEEKLY`、`MAIN`、`ACH`）。
