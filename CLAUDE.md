# ZAHA HADID ATLAS — 專案記憶(CLAUDE.md)

## 專案概述
Zaha Hadid 致敬網站:Three.js 3D 地球儀 + 24 件建成作品(1993–2026,含淡江大橋)。
粉絲功能:留言牆(TO ZAHA)、最愛投票、朝聖護照打卡、數位明信片(1280×800 橫式 + 1080×1920 IG 限動直式)、Web Share、深度連結 `?work=N`(1-based)。

- 線上:https://zaha-atlas.netlify.app/
- 部署:push 到 main → Netlify 自動部署(無 build step,純靜態)
- 後端:Google Apps Script(`gas-backend.gs`)+ Google Sheet(messages / votes / visits 三表)

## 檔案結構
- `index.html` — 全站(HTML + CSS + JS 單檔,~165KB,含烘焙的世界地圖向量資料 LAND)
- `gas-backend.gs` — GAS Web App 後端(留言、投票、匿名打卡彙總)

## 關鍵設定
- `index.html` 內 `const GAS_ENDPOINT = '...'` ← GAS Web App URL(改 GAS 程式後必須「新增版本」重新部署才生效)。**2026-07-10 已部署並填入**,留言/投票/打卡三個功能已跟 Google Sheet 真實串接、端到端測過(curl + 瀏覽器 UI 雙重驗證)。
- OG 預覽圖:head 內有註解待啟用,需 `og.png` 放 repo 根目錄 + 填絕對網址

## 資料結構(WORKS 陣列)
```js
{en, tc, city, year, type, lat, lon,
 wiki: ['英文維基條目候選1', '候選2'],   // 執行時 API 抓圖備援
 img: 'https://commons.wikimedia.org/wiki/Special:FilePath/檔名_底線分隔?width=900',  // 策展直連,優先
 desc: '繁中介紹'}
```
照片載入順序:`img:` 直連 → Wikipedia REST API(依原圖寬度選 900px/原圖/320px 保底)→ 「影像暫時無法載入」。全部有逾時,不會卡死。

## 待辦 Backlog(依優先序)
1. **策展選圖(11 件未完成)**:薩拉戈薩橋亭、格拉斯哥河畔博物館、倫敦水上運動中心、銀河 SOHO、香港理大創新樓、安特衛普港務局、薩萊諾客運站、520 West 28th、KAPSARC、麗澤 SOHO、千博物館。
   - 標準:Wikimedia Commons 自由授權、外觀代表角度、寬度 ≥2000px、避開 interior/construction/detail
   - 已完成 13 件範例見 WORKS 內現有 `img:` 欄位(最新:謝赫扎耶德大橋 → `Shore_view.jpg`,CC BY-SA 4.0,4160×3120;長沙梅溪湖 → `Changsha_Meixihu_International_Culture_Art_Centre_202110102.jpg`,CC BY 3.0,3968×2976)
2. **og.png**:1200×630,可用明信片引擎改製(淡江大橋或摩珀斯)
3. **拆檔重構**(選配):index.html → app.js + data.js + land-data.js + styles.css;遷移後先跑穩再拆,拆完必須逐項過驗收清單
4. 未做的構想:粉絲城市光點圖層、遺作落成 email 通知(布拉格愛樂廳等)、依類型篩選

## 已知地雷(血淚史,務必遵守)
1. **字串替換必用唯一錨點**:曾因 `requestAnimationFrame(loop);` 出現兩次,把深度連結注入渲染迴圈內,造成每秒 60 次 select 風暴(全站卡死);也曾因範圍錨點誤刪整個 BIO 區塊。改碼後 grep 驗證出現次數。
2. **three.js 鎖 r128**(cdnjs):`Vector3.randomDirection()` 等 r131+ API 不存在,用前查版本。
3. **維基縮圖不可盲目放大**:要求超過原圖寬度的 thumb 會回 HTTP 400,必依 `originalimage.width` 決定尺寸。
4. **禁用 backdrop-filter 疊在 WebGL canvas 上**(每幀重算模糊,效能災難);面板底色用不透明 `#0E131D`。
5. commons.wikimedia.org 的圖用 `Special:FilePath/檔名?width=900` 直連;檔名空格轉底線、特殊字元 percent-encode。
6. 手機版面板(72vh 抽屜)開啟時會蓋住底部年表,切換作品靠「上一件/下一件」,是已知取捨。
7. **`wiki:[]` 候選標題可能 redirect 到不相關條目**:曾發生 `'Sheikh Zayed Bridge'` 沒有獨立條目、直接 redirect 到「Zaha Hadid」本人條目,導致沒填 `img:` 時抓到她的肖像照當作品照。幫剩下 11 件補 `img:` 前,先用 `en.wikipedia.org/api/rest_v1/page/summary/<title>` 查一下回傳的 `title` 是否等於自己填的候選詞——不等於就代表 redirect 錯地方,`wiki:` 該留空或換標題。標題打錯字(如少一個字母)也會直接 404、整個沒圖可退,務必跟 Commons/維基條目標題逐字核對。

## 驗收清單(每次改動後過一遍)
- [ ] 連點年表「下一件」流暢、面板即時切換
- [ ] `?work=24` 直達淡江大橋且地球仍可拖曳
- [ ] 照片:有 img 的秒載、無圖條目優雅退場、絕不卡「載入中」
- [ ] 留言送出 → Sheet 出現一列;投票 → 排行更新
- [ ] 明信片/限動圖/護照卡三種 PNG 可下載
- [ ] 手機:簡史抽屜、留言牆、分享面板正常

## 協作慣例
- 回覆與註解用繁體中文;第一性原理思考;改動小步快跑,一次一個關注點
- commit message 格式:`feat|fix|content: 簡述`(例:`content: 新增 MAXXI 策展選圖`)
