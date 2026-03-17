const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 🚀 伺服器後端 API：直接抓取 Google News
// ==========================================
app.get('/api/news/:lang', async (req, res) => {
    const feeds = {
        'zh': 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
        'en': 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
        'jp': 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja'
    };
    try {
        const response = await fetch(feeds[req.params.lang]);
        const xml = await response.text();
        const titles = [];
        const regex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/g;
        let match;
        while ((match = regex.exec(xml)) !== null && titles.length < 20) {
            let cleanTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
            titles.push(cleanTitle);
        }
        res.json({ status: 'ok', items: titles });
    } catch (error) {
        res.json({ status: 'error', items: [] });
    }
});

// ==========================================
// 📈 伺服器後端 API：抓取 Yahoo Finance 股市
// ==========================================
app.get('/api/stocks', async (req, res) => {
    try {
        // 抓取：台股大盤、台積電、道瓊、納斯達克
        const symbols = '^TWII,2330.TW,^DJI,^IXIC';
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // 自訂中文名稱映射
        const nameMap = {
            '^TWII': '台灣加權指數',
            '2330.TW': '台積電 (2330)',
            '^DJI': '道瓊工業指數',
            '^IXIC': '納斯達克指數'
        };

        const result = data.quoteResponse.result.map(q => ({
            symbol: q.symbol,
            name: nameMap[q.symbol] || q.shortName,
            price: q.regularMarketPrice,
            change: q.regularMarketChange,
            changePercent: q.regularMarketChangePercent
        }));
        res.json({ status: 'ok', items: result });
    } catch (error) {
        res.json({ status: 'error', items: [] });
    }
});

// ==========================================
// 網頁前端介面
// ==========================================
const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>智慧儀表板 Pro (極致通透版)</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Roboto:wght@100;300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            /* 深色且極致透明的玻璃質感 */
            --glass-bg: rgba(15, 20, 25, 0.35); /* 透明度調低，透出背景 */
            --glass-border: rgba(255, 255, 255, 0.15); /* 加強邊框反光感 */
            --glass-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            --theme-blue: #64b5f6;
            --text-main: #ffffff;
            --text-muted: #b0bec5;
            --shift-x: 0px;
            --shift-y: 0px;
        }

        body.night-mode {
            --glass-bg: rgba(5, 5, 8, 0.6);
            --glass-border: rgba(255, 255, 255, 0.05);
            --theme-blue: #e67e22; 
            --text-main: #e0d5c1;
            --text-muted: #8d8579;
        }

        body {
            margin: 0; padding: 0; width: 100vw; height: 100vh;
            /* 預設深色科技感漸層背景，讓透明玻璃更明顯 */
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); 
            background-size: cover; background-position: center;
            color: var(--text-main); font-family: 'Noto Sans TC', sans-serif;
            overflow: hidden; box-sizing: border-box; padding: 3vh 3vw;
            transition: background 2s ease, color 2s ease;
        }
        
        #night-filter {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 5, 0, 0.4); pointer-events: none; z-index: 900;
            opacity: 0; transition: opacity 3s ease-in-out;
        }
        body.night-mode #night-filter { opacity: 1; }
        
        .dashboard {
            display: grid; 
            grid-template-columns: 1fr 1.3fr; 
            grid-template-rows: auto 1fr; /* 右上天氣改為 auto，讓出空間給下方 */
            gap: 20px; width: 100%; height: 100%;
            transform: translate(var(--shift-x), var(--shift-y));
            transition: transform 3s ease-in-out;
        }

        /* 核心毛玻璃效果 */
        .glass-panel {
            background: var(--glass-bg); 
            backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); /* 模糊度拉高 */
            border: 1px solid var(--glass-border); 
            border-top: 1px solid rgba(255,255,255,0.3); /* 頂部高光 */
            border-left: 1px solid rgba(255,255,255,0.2); /* 左側高光 */
            border-radius: 20px; box-shadow: var(--glass-shadow);
            padding: 25px; display: flex; flex-direction: column; position: relative;
            transition: all 2s ease;
        }
        
        /* 左側：時鐘 */
        .panel-left { grid-column: 1 / 2; grid-row: 1 / 3; justify-content: center; align-items: center; text-align: center; }
        #clock { font-family: 'Roboto'; font-weight: 300; font-size: 15vw; line-height: 1; margin-bottom: 5px; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        #date-display { font-size: 2.5vw; font-weight: 300; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 30px; }
        .status-list { font-size: 1.3vw; color: var(--text-muted); margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; text-align: left; width: 80%; font-weight: 500;}
        .status-list i { width: 25px; text-align: center; color: var(--theme-blue); }

        .auto-hide { transition: opacity 0.8s ease-in-out; opacity: 1; }
        body.idle .auto-hide { opacity: 0; pointer-events: none; }
        
        /* 左側：控制列 */
        .controls { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: auto; width: 100%; position: relative; z-index: 910; }
        button, .upload-btn { 
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2); color: var(--text-main); 
            padding: 8px 15px; border-radius: 10px; font-size: 1.1vw; cursor: pointer; transition: 0.2s; 
            display: flex; align-items: center; gap: 8px; font-weight: 500;
        }
        button:hover, .upload-btn:hover { background: rgba(255, 255, 255, 0.2); }
        input[type="time"] { background: rgba(0,0,0,0.5); color: var(--text-main); color-scheme: dark; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 6px; outline: none; font-family: 'Roboto'; font-weight: 500;}
        
        /* 右上：天氣 (縮小版) */
        .panel-right-top { grid-column: 2 / 3; grid-row: 1 / 2; padding: 15px 25px; gap: 10px; }
        .weather-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .current-temp-block { display: flex; align-items: center; gap: 15px; }
        #current-temp { font-family: 'Roboto'; font-size: 4vw; font-weight: 400; line-height: 1; }
        #current-condition { font-size: 3vw; line-height: 1; }
        .weather-details { font-size: 1.1vw; color: var(--text-muted); text-align: right; display: flex; flex-direction: column; gap: 3px; font-weight: 500;}
        
        .forecast-grid { display: flex; justify-content: space-between; gap: 8px; }
        .forecast-item { display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 12px; flex: 1; padding: 8px 5px; gap: 5px; }
        .forecast-item .day { font-size: 1vw; color: var(--text-muted); font-weight: 500;}
        .forecast-item .icon { font-size: 1.5vw; }
        .forecast-item .temp { font-family: 'Roboto'; font-size: 1.1vw; font-weight: 500; }
        .forecast-item .details { font-size: 0.8vw; color: var(--text-muted); text-align: center; display: flex; flex-direction: column; gap: 2px; }

        /* 右下：新聞與股市滑動區 */
        .panel-right-bottom { grid-column: 2 / 3; grid-row: 2 / 3; display: flex; flex-direction: column; overflow: hidden; padding: 20px; }
        
        .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        
        /* 標籤切換器 (指示點) */
        .tabs { display: flex; gap: 15px; font-size: 1.4vw; font-weight: 700; color: var(--text-muted); }
        .tab { cursor: pointer; transition: 0.3s; }
        .tab.active { color: var(--theme-blue); text-shadow: 0 0 10px rgba(100,181,246,0.5); }
        
        .news-lang-select { background: rgba(0, 0, 0, 0.3); color: var(--text-main); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 4px 10px; font-size: 1vw; cursor: pointer; outline: none; transition: 0.2s; }
        
        /* 滑動軌道 */
        .slider-viewport { flex: 1; overflow: hidden; position: relative; width: 100%; cursor: grab; }
        .slider-viewport:active { cursor: grabbing; }
        .slider-track { display: flex; width: 200%; height: 100%; transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
        
        .slide-page { width: 50%; height: 100%; display: flex; flex-direction: column; padding: 0 5px; box-sizing: border-box; }
        
        /* 網格卡片共用樣式 (新聞與股市) */
        .grid-container { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px; flex: 1; }
        .data-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; color: var(--text-main); display: flex; flex-direction: column; justify-content: center; box-shadow: inset 0 0 20px rgba(255,255,255,0.02); }
        
        .news-card span { font-size: 1.3vw; font-weight: 300; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        
        /* 股市卡片特製樣式 */
        .stock-card { justify-content: space-between; }
        .stock-name { font-size: 1.2vw; color: var(--text-muted); font-weight: 500; margin-bottom: 5px; }
        .stock-price { font-family: 'Roboto'; font-size: 2.2vw; font-weight: 700; }
        .stock-change { font-family: 'Roboto'; font-size: 1.1vw; font-weight: 500; display: flex; align-items: center; gap: 5px; margin-top: 5px; }
        /* 台灣習慣：紅漲綠跌 */
        .up { color: #ff5252; }
        .down { color: #4caf50; }

        /* 警報畫面 */
        .overlay { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); text-align: center; }
        @keyframes pulseRed { 0% { background: rgba(220, 53, 69, 0.85); } 50% { background: rgba(140, 20, 30, 0.9); } 100% { background: rgba(220, 53, 69, 0.85); } }
        .eq-active { animation: pulseRed 1s infinite !important; }
        @keyframes pulseBlue { 0% { background: rgba(13, 71, 161, 0.85); } 50% { background: rgba(10, 35, 80, 0.9); } 100% { background: rgba(13, 71, 161, 0.85); } }
        .alarm-active { animation: pulseBlue 1.5s infinite !important; }
        .overlay h1 { font-size: 6vw; margin: 0 0 20px; font-weight: 700; display: flex; align-items: center; gap: 20px; color: white;}
        .overlay p { font-size: 2.5vw; margin-bottom: 40px; line-height: 1.5; color: white;}
        .overlay button { font-size: 1.8vw; padding: 15px 50px; background: white; color: black; border-radius: 50px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div id="night-filter"></div>

    <div class="dashboard">
        <div class="glass-panel panel-left">
            <div id="clock">00:00</div>
            <div id="date-display">載入中...</div>
            
            <div class="status-list">
                <div id="wakeStatus"><i class="fa-regular fa-lightbulb"></i> 恆亮未啟用</div>
                <div id="eqStatus"><i class="fa-solid fa-tower-broadcast"></i> 地震監控中...</div>
                <div id="alarmStatus" style="color: #4caf50; display: none;"><i class="fa-regular fa-bell"></i> 鬧鐘已設定</div>
                <div id="location"><i class="fa-solid fa-location-crosshairs"></i> 定位中...</div>
            </div>

            <div class="controls auto-hide">
                <button id="fullscreenBtn"><i class="fa-solid fa-expand"></i></button>
                <button id="wakeBtn"><i class="fa-solid fa-bolt"></i></button>
                <label class="upload-btn"><i class="fa-regular fa-image"></i> 背景<input type="file" id="bgInput" accept="image/*" style="display: none;"></label>
                <button id="testNightBtn" style="color: #f39c12;"><i class="fa-solid fa-moon"></i></button>
                <button id="testEqBtn" style="color: var(--text-muted);"><i class="fa-solid fa-triangle-exclamation"></i> 測</button>
                
                <div style="display: flex; gap: 5px; width: 100%; justify-content: center; margin-top: 10px;">
                    <input type="time" id="alarmTimeInput">
                    <button id="setAlarmBtn"><i class="fa-solid fa-check"></i></button>
                    <button id="cancelAlarmBtn" style="display:none; color: #ff5252;"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
        </div>

        <div class="glass-panel panel-right-top">
            <div class="weather-header">
                <div class="current-temp-block">
                    <span id="current-condition"><i class="fa-solid fa-spinner fa-spin"></i></span>
                    <span id="current-temp">--°</span>
                </div>
                <div class="weather-details">
                    <div><i class="fa-solid fa-droplet"></i> 濕度 <span id="current-humidity">--</span>%</div>
                    <div><i class="fa-solid fa-umbrella"></i> 降雨 <span id="current-rain">--</span>%</div>
                </div>
            </div>
            <div class="forecast-grid" id="forecast-grid"></div>
        </div>

        <div class="glass-panel panel-right-bottom">
            <div class="module-header">
                <div class="tabs">
                    <div class="tab active" id="tab-news" onclick="slideTo(0)"><i class="fa-regular fa-newspaper"></i> 新聞</div>
                    <div class="tab" id="tab-stocks" onclick="slideTo(1)"><i class="fa-solid fa-chart-line"></i> 股市</div>
                </div>
                <select id="newsLangSelect" class="news-lang-select auto-hide">
                    <option value="zh">台灣焦點</option>
                    <option value="en">全球國際</option>
                    <option value="jp">日本頭條</option>
                </select>
            </div>
            
            <div class="slider-viewport" id="slider-viewport">
                <div class="slider-track" id="slider-track">
                    <div class="slide-page">
                        <div class="grid-container" id="news-grid">
                            <div class="data-card news-card"><span>載入中...</span></div>
                            <div class="data-card news-card"><span>載入中...</span></div>
                            <div class="data-card news-card"><span>載入中...</span></div>
                            <div class="data-card news-card"><span>載入中...</span></div>
                        </div>
                    </div>
                    <div class="slide-page">
                        <div class="grid-container" id="stock-grid">
                            <div class="data-card stock-card"><span>股市載入中...</span></div>
                            <div class="data-card stock-card"><span>股市載入中...</span></div>
                            <div class="data-card stock-card"><span>股市載入中...</span></div>
                            <div class="data-card stock-card"><span>股市載入中...</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="eq-overlay" class="overlay">
        <h1><i class="fa-solid fa-triangle-exclamation"></i> 氣象署地震速報</h1>
        <p id="eq-info-text">連線中...</p>
        <button id="dismissEqBtn">解除警報</button>
    </div>
    <div id="alarm-overlay" class="overlay">
        <h1><i class="fa-regular fa-bell"></i> 時間到！</h1>
        <button id="dismissAlarmBtn">關閉鬧鐘</button>
    </div>

    <script>
        const CWA_API_KEY = 'CWA-847DA1DF-CF0B-4E3D-8C8F-5DE7DB24EDD8'; 
        let audioCtx;

        // --- 防烙印 ---
        function applyPixelShift() {
            document.documentElement.style.setProperty('--shift-x', (Math.floor(Math.random() * 9) - 4) + 'px');
            document.documentElement.style.setProperty('--shift-y', (Math.floor(Math.random() * 9) - 4) + 'px');
        }
        setInterval(applyPixelShift, 60000);

        // --- UI 自動隱藏 ---
        let idleTimer;
        function resetIdleTimer() {
            document.body.classList.remove('idle');
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => document.body.classList.add('idle'), 5000); 
        }
        window.addEventListener('mousemove', resetIdleTimer); window.addEventListener('touchstart', resetIdleTimer); window.addEventListener('click', resetIdleTimer);
        resetIdleTimer();

        // --- 全螢幕 ---
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(()=>{});
                fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
            }
        });

        // --- 時鐘與夜間模式 ---
        let targetAlarmTime = null, isAlarmRinging = false, manualNightMode = false;
        function updateClock() {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0'), ss = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock').textContent = \`\${hh}:\${mm}\`;
            document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
            
            const hour = now.getHours();
            if (hour >= 23 || hour < 6 || manualNightMode) document.body.classList.add('night-mode');
            else document.body.classList.remove('night-mode');

            if (targetAlarmTime === \`\${hh}:\${mm}\` && ss === '00' && !isAlarmRinging) triggerAlarm();
        }
        setInterval(updateClock, 1000); updateClock();
        document.getElementById('testNightBtn').addEventListener('click', () => { manualNightMode = !manualNightMode; updateClock(); });

        // --- 鬧鐘與背景記憶 ---
        const setAlarmBtn = document.getElementById('setAlarmBtn'), cancelAlarmBtn = document.getElementById('cancelAlarmBtn'), alarmTimeInput = document.getElementById('alarmTimeInput');
        let alarmSoundInterval;
        const savedAlarm = localStorage.getItem('smartDisplay_alarm');
        if (savedAlarm) {
            targetAlarmTime = savedAlarm; document.getElementById('alarmStatus').style.display = 'block'; document.getElementById('alarmStatus').innerHTML = \`<i class="fa-regular fa-bell"></i> \${targetAlarmTime}\`;
            setAlarmBtn.style.display = 'none'; cancelAlarmBtn.style.display = 'flex'; alarmTimeInput.style.display = 'none';
        }
        setAlarmBtn.addEventListener('click', () => {
            if (alarmTimeInput.value) {
                targetAlarmTime = alarmTimeInput.value; localStorage.setItem('smartDisplay_alarm', targetAlarmTime);
                document.getElementById('alarmStatus').style.display = 'block'; document.getElementById('alarmStatus').innerHTML = \`<i class="fa-regular fa-bell"></i> \${targetAlarmTime}\`;
                setAlarmBtn.style.display = 'none'; cancelAlarmBtn.style.display = 'flex'; alarmTimeInput.style.display = 'none';
            }
        });
        cancelAlarmBtn.addEventListener('click', () => {
            targetAlarmTime = null; localStorage.removeItem('smartDisplay_alarm'); document.getElementById('alarmStatus').style.display = 'none';
            setAlarmBtn.style.display = 'flex'; cancelAlarmBtn.style.display = 'none'; alarmTimeInput.style.display = 'block'; alarmTimeInput.value = '';
        });

        const savedBg = localStorage.getItem('smartDisplay_bg');
        if (savedBg) { document.body.style.backgroundImage = \`url(\${savedBg})\`; }
        document.getElementById('bgInput').addEventListener('change', e => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => { document.body.style.backgroundImage = \`url(\${ev.target.result})\`; try { localStorage.setItem('smartDisplay_bg', ev.target.result); } catch (err) {} };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // ==========================================
        // 👆 滑動模組邏輯 (News <-> Stocks)
        // ==========================================
        let currentSlide = 0; // 0=News, 1=Stocks
        const track = document.getElementById('slider-track');
        const tabNews = document.getElementById('tab-news');
        const tabStocks = document.getElementById('tab-stocks');
        const langSelect = document.getElementById('newsLangSelect');

        function slideTo(index) {
            currentSlide = index;
            track.style.transform = \`translateX(-\${index * 50}%)\`;
            if(index === 0) {
                tabNews.classList.add('active'); tabStocks.classList.remove('active');
                langSelect.style.display = 'block';
            } else {
                tabStocks.classList.add('active'); tabNews.classList.remove('active');
                langSelect.style.display = 'none';
            }
        }

        // 觸控滑動偵測
        let startX = 0, isDragging = false;
        const viewport = document.getElementById('slider-viewport');
        
        viewport.addEventListener('mousedown', e => { isDragging = true; startX = e.pageX; });
        viewport.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX; });
        
        window.addEventListener('mouseup', e => { if(isDragging) handleSwipe(e.pageX); isDragging = false; });
        window.addEventListener('touchend', e => { if(isDragging) handleSwipe(e.changedTouches[0].clientX); isDragging = false; });

        function handleSwipe(endX) {
            const diff = startX - endX;
            if (diff > 50 && currentSlide === 0) slideTo(1); // 左滑去股市
            else if (diff < -50 && currentSlide === 1) slideTo(0); // 右滑回新聞
        }

        // ==========================================
        // 📰 新聞 API
        // ==========================================
        let newsList = [], currentNewsPage = 0, newsInterval;
        const savedLang = localStorage.getItem('smartDisplay_newsLang') || 'zh';
        langSelect.value = savedLang;

        async function fetchNews(lang) {
            try {
                const res = await fetch(\`/api/news/\${lang}\`); const data = await res.json();
                if (data.status === 'ok' && data.items.length > 0) {
                    newsList = data.items; currentNewsPage = 0; showNextNews();
                    if(newsInterval) clearInterval(newsInterval);
                    newsInterval = setInterval(showNextNews, 10000); 
                }
            } catch (err) {}
        }
        function showNextNews() {
            if(newsList.length === 0) return;
            const grid = document.getElementById('news-grid');
            grid.style.opacity = 0; 
            setTimeout(() => {
                grid.innerHTML = '';
                for(let i=0; i<4; i++) {
                    let index = (currentNewsPage * 4 + i) % newsList.length;
                    grid.innerHTML += \`<div class="data-card news-card"><span>\${newsList[index]}</span></div>\`;
                }
                grid.style.opacity = 1; currentNewsPage++;
            }, 500);
        }
        langSelect.addEventListener('change', (e) => {
            const lang = e.target.value; localStorage.setItem('smartDisplay_newsLang', lang); 
            document.getElementById('news-grid').style.opacity = 0; setTimeout(() => fetchNews(lang), 500);
        });
        fetchNews(savedLang); setInterval(() => fetchNews(langSelect.value), 60 * 60 * 1000);

        // ==========================================
        // 📈 股市 API
        // ==========================================
        async function fetchStocks() {
            try {
                const res = await fetch('/api/stocks');
                const data = await res.json();
                if (data.status === 'ok') {
                    const grid = document.getElementById('stock-grid');
                    grid.innerHTML = '';
                    data.items.forEach(stock => {
                        // 台灣習慣：大於0紅色，小於0綠色
                        const isUp = stock.change > 0;
                        const colorClass = isUp ? 'up' : 'down';
                        const icon = isUp ? '<i class="fa-solid fa-caret-up"></i>' : '<i class="fa-solid fa-caret-down"></i>';
                        const sign = isUp ? '+' : '';
                        
                        grid.innerHTML += \`
                            <div class="data-card stock-card">
                                <div class="stock-name">\${stock.name}</div>
                                <div class="stock-price">\${stock.price.toFixed(2)}</div>
                                <div class="stock-change \${colorClass}">
                                    \${icon} \${sign}\${stock.change.toFixed(2)} (\${sign}\${stock.changePercent.toFixed(2)}%)
                                </div>
                            </div>
                        \`;
                    });
                }
            } catch (err) {}
        }
        fetchStocks(); setInterval(fetchStocks, 5 * 60 * 1000); // 每 5 分鐘更新股市

        // --- 天氣與定位 ---
        function getIconHtml(code) {
            if (code === 0) return \`<i class="fa-solid fa-sun" style="color: var(--theme-blue);"></i>\`; 
            if (code <= 3) return \`<i class="fa-solid fa-cloud-sun" style="color: var(--theme-blue);"></i>\`; 
            if (code >= 45 && code <= 48) return \`<i class="fa-solid fa-smog" style="color: var(--text-muted);"></i>\`;
            if (code >= 51 && code <= 67) return \`<i class="fa-solid fa-cloud-rain" style="color: var(--theme-blue);"></i>\`; 
            if (code >= 71 && code <= 77) return \`<i class="fa-solid fa-snowflake" style="color: var(--text-main);"></i>\`; 
            if (code >= 95) return \`<i class="fa-solid fa-cloud-bolt" style="color: #9b59b6;"></i>\`; 
            return \`<i class="fa-solid fa-cloud" style="color: var(--text-muted);"></i>\`;
        }
        async function fetchWeather(lat, lon) {
            try {
                const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=relative_humidity_2m&timezone=Asia%2FTaipei\`;
                const res = await fetch(url); const data = await res.json();
                document.getElementById('current-temp').textContent = Math.round(data.current.temperature_2m) + '°';
                document.getElementById('current-condition').innerHTML = getIconHtml(data.current.weather_code);
                document.getElementById('current-humidity').textContent = data.current.relative_humidity_2m;
                document.getElementById('current-rain').textContent = data.daily.precipitation_probability_max[0];
                const grid = document.getElementById('forecast-grid'); grid.innerHTML = '';
                const days = ['日', '一', '二', '三', '四', '五', '六'];
                for (let i = 1; i <= 5; i++) {
                    const dateObj = new Date(data.daily.time[i]);
                    const dailyHumidity = data.hourly.relative_humidity_2m[i * 24 + 12] || '--';
                    const maxT = Math.round(data.daily.temperature_2m_max[i]);
                    const minT = Math.round(data.daily.temperature_2m_min[i]);
                    const rain = data.daily.precipitation_probability_max[i];
                    grid.innerHTML += \`
                        <div class="forecast-item">
                            <div class="day">\${days[dateObj.getDay()]}</div>
                            <div class="icon">\${getIconHtml(data.daily.weather_code[i])}</div>
                            <div class="temp">\${minT}°-\${maxT}°</div>
                            <div class="details"><span><i class="fa-solid fa-droplet"></i> \${dailyHumidity}%</span><span><i class="fa-solid fa-umbrella"></i> \${rain}%</span></div>
                        </div>\`;
                }
            } catch (err) {}
        }
        function initLocation() {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const lat = pos.coords.latitude, lon = pos.coords.longitude; fetchWeather(lat, lon);
                        try {
                            const res = await fetch(\`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=\${lat}&longitude=\${lon}&localityLanguage=zh\`);
                            const data = await res.json(); document.getElementById('location').innerHTML = \`<i class="fa-solid fa-location-dot"></i> \${data.city || data.locality}\`;
                        } catch {}
                    },
                    () => { document.getElementById('location').innerHTML = '<i class="fa-solid fa-location-dot"></i> 彰化市(預設)'; fetchWeather(24.08, 120.54); }
                );
            } else { fetchWeather(24.08, 120.54); }
        }
        initLocation(); setInterval(initLocation, 30 * 60 * 1000);

        document.getElementById('wakeBtn').addEventListener('click', async () => {
            try { await navigator.wakeLock.request('screen'); document.getElementById('wakeStatus').innerHTML = '<span style="color:#fbc02d;"><i class="fa-solid fa-lightbulb"></i> 恆亮中</span>'; document.getElementById('wakeBtn').style.display = 'none'; } catch (err) {}
        });
        function playTone(type, freq, dur) {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + dur);
        }

        let lastEqTime = null, eqBeepInterval;
        async function checkRealEarthquake() {
            try {
                const res = await fetch(\`https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0101-001?Authorization=\${CWA_API_KEY}&limit=1&format=JSON\`);
                const data = await res.json();
                if (data.success === 'true') {
                    const latestEq = data.records.Earthquake[0];
                    const eqTime = latestEq.EarthquakeInfo.OriginTime;
                    document.getElementById('eqStatus').innerHTML = '<span style="color:#2e7d32;"><i class="fa-solid fa-tower-broadcast"></i> 地震監控中</span>';
                    if (!lastEqTime) { lastEqTime = eqTime; return; }
                    if (eqTime !== lastEqTime) {
                        lastEqTime = eqTime;
                        const reportContent = latestEq.ReportContent;
                        const magnitude = latestEq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue;
                        const depth = latestEq.EarthquakeInfo.FocalDepth;
                        triggerEqAlarm(\`芮氏規模：<span style="color:#e74c3c; font-weight:bold;">\${magnitude}</span><br>深度：\${depth} 公里<br><br><span style="font-size: 2.2vw;">\${reportContent}</span>\`);
                    }
                }
            } catch (err) {}
        }
        function triggerEqAlarm(infoHtml) {
            document.body.classList.add('eq-active'); document.getElementById('eq-overlay').style.display = 'flex'; document.getElementById('eq-info-text').innerHTML = infoHtml;
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            playTone('square', 800, 0.3); eqBeepInterval = setInterval(() => playTone('square', 800, 0.3), 800);
        }
        setInterval(checkRealEarthquake, 60000); setTimeout(checkRealEarthquake, 2000);
        
        document.getElementById('testEqBtn').addEventListener('click', () => { triggerEqAlarm('【模擬測試】<br>芮氏規模：<span style="color:#e74c3c; font-weight:bold;">7.2</span><br>深度：15.5 公里<br><br><span style="font-size: 2vw;">發生有感地震，請就近掩蔽。</span>'); });
        document.getElementById('dismissEqBtn').addEventListener('click', () => { document.body.classList.remove('eq-active'); document.getElementById('eq-overlay').style.display = 'none'; clearInterval(eqBeepInterval); });
        
        function triggerAlarm() {
            isAlarmRinging = true; document.body.classList.add('alarm-active'); document.getElementById('alarm-overlay').style.display = 'flex';
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            playTone('triangle', 600, 0.4); alarmSoundInterval = setInterval(() => playTone('triangle', 600, 0.4), 1000);
        }
        document.getElementById('dismissAlarmBtn').addEventListener('click', () => {
            isAlarmRinging = false; document.body.classList.remove('alarm-active'); document.getElementById('alarm-overlay').style.display = 'none'; clearInterval(alarmSoundInterval); cancelAlarmBtn.click();
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.listen(port, () => {
    console.log(`伺服器已啟動！請在瀏覽器打開 http://localhost:${port}`);
});