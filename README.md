# smart-display

常駐螢幕用的智慧儀表板，包含時間、天氣、新聞、股市、鬧鐘、夜間模式、背景更換與地震資訊提醒。

## 使用方式

```bash
npm start
```

開啟瀏覽器到 `http://localhost:3000`。

## 檔案分工

- `server.js`：提供新聞、股市 API，並送出靜態網頁。
- `index.html`：主要使用者畫面與互動邏輯。
- `main.js`：舊版前端檔案，目前首頁不再載入。
