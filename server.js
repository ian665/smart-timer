const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>智慧儀表板 Pro (淡色明亮版)</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Roboto:wght@100;300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            /* 預設為：淡色系明亮毛玻璃 */
            --glass-bg: rgba(255, 255, 255, 0.65);
            --glass-border: rgba(255, 255, 255, 0.5);
            --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
            --theme-blue: #1976d2; /* 深一點的藍色，淺底才清楚 */
            --text-main: #2c3e50; /* 深灰黑色 */
            --text-muted: #546e7a; /* 淺灰藍色 */
            --shift-x: 0px;
            --shift-y: 0px;
        }

        /* 夜間模式時的變數 (回到深黑暖色) */
        body.night-mode {
            background: #121212 !important;
            --glass-bg: rgba(15, 15, 18, 0.85);
            --glass-border: rgba(255, 255, 255, 0.05);
            --theme-blue: #e67e22; 
            --text-main: #dcd0c0;
            --text-muted: #7a7570;
        }

        body {
            margin: 0; padding: 0; width: 100vw; height: 100vh;
            /* 預設淡色漸層背景：非常清新的淺藍到淺紫白 */
            background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%); 
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
            display: grid; grid-template-columns: 1fr 1.3fr; grid-template-rows: 1fr 1fr;
            gap: 20px; width: 100%; height: 100%;
            transform: translate(var(--shift-x), var(--shift-y));
            transition: transform 3s ease-in-out;
        }

        .glass-panel {
            background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px; box-shadow: var(--glass-shadow);
            padding: 25px; display: flex; flex-direction: column; position: relative;
            transition: all 2s ease;
        }
        
        .panel-left { grid-column: 1 / 2; grid-row: 1 / 3; justify-content: center; align-items: center; text-align: center; }
        #clock { font-family: 'Roboto'; font-weight: 300; font-size: 15vw; line-height: 1; margin-bottom: 5px; transition: color 2s ease; color: var(--text-main); }
        #date-display { font-size: 2.5vw; font-weight: 300; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 30px; transition: color 2s ease; }
        
        .status-list { font-size: 1.3vw; color: var(--text-muted); margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; text-align: left; width: 80%; transition: color 2s ease; font-weight: 500;}
        .status-list i { width: 25px; text-align: center; color: var(--theme-blue); transition: color 2s ease; }

        .auto-hide { transition: opacity 0.8s ease-in-out; opacity: 1; }
        body.idle .auto-hide { opacity: 0; pointer-events: none; }
        
        /* 按鈕在淡色模式下要有一點陰影與半透明白底 */
        .controls { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: auto; width: 100%; position: relative; z-index: 910; }
        button, .upload-btn { 
            background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(0,0,0,0.05); color: var(--text-main); 
            padding: 10px 18px; border-radius: 10px; font-size: 1.2vw; cursor: pointer; transition: 0.2s; 
            display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); font-weight: 500;
        }
        button:hover, .upload-btn:hover { background: rgba(255, 255, 255, 0.9); }
        input[type="time"] { background: rgba(255,255,255,0.6); color: var(--text-main); border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 8px; outline: none; font-family: 'Roboto'; font-weight: 500;}
        
        /* 夜間模式按鈕覆寫 */
        body.night-mode button, body.night-mode .upload-btn { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); box-shadow: none; }
        body.night-mode input[type="time"] { background: rgba(0,0,0,0.5); color: white; color-scheme: dark; border-color: rgba(255,255,255,0.1);}

        .panel-right-top { grid-column: 2 / 3; grid-row: 1 / 2; justify-content: flex-start; gap: 15px; }
        .weather-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.05); }
        body.night-mode .weather-header { border-bottom: 1px solid rgba(255,255,255,0.05); }
        
        .current-temp-block { display: flex; align-items: center; gap: 20px; }
        #current-temp { font-family: 'Roboto'; font-size: 5vw; font-weight: 400; line-height: 1; transition: color 2s ease; color: var(--text-main); }
        #current-condition { font-size: 4vw; line-height: 1; }
        
        .weather-details { font-size: 1.3vw; color: var(--text-muted); text-align: right; display: flex; flex-direction: column; gap: 5px; transition: color 2s ease; font-weight: 500;}
        .weather-details i { color: var(--theme-blue); width: 20px; text-align: center; transition: color 2s ease; }
        
        .forecast-grid { display: flex; justify-content: space-between; gap: 10px; flex: 1; }
        .forecast-item { display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 15px; flex: 1; padding: 10px 5px; gap: 8px; transition: background 2s ease; }
        body.night-mode .forecast-item { background: rgba(255,255,255,0.03); }
        .forecast-item .day { font-size: 1.1vw; color: var(--text-muted); transition: color 2s ease; font-weight: 500;}
        .forecast-item .icon { font-size: 1.8vw; }
        .forecast-item .temp { font-family: 'Roboto'; font-size: 1.2vw; font-weight: 500; transition: color 2s ease; color: var(--text-main); }
        .forecast-item .details { font-size: 0.9vw; color: var(--text-muted); text-align: center; display: flex; flex-direction: column; gap: 3px; transition: color 2s ease; font-weight: 500;}

        .panel-right-bottom { grid-column: 2 / 3; grid-row: 2 / 3; display: flex; flex-direction: column; }
        .news-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; transition: color 2s ease; }
        .news-title-area { font-size: 1.4vw; color: var(--theme-blue); font-weight: 700; display: flex; align-items: center; gap: 10px; transition: color 2s ease; }
        
        .news-lang-select { 
            background: rgba(255, 255, 255, 0.6); color: var(--text-main); 
            border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; 
            padding: 5px 12px; font-size: 1.1vw; cursor: pointer; outline: none; 
            transition: 0.2s; font-family: 'Noto Sans TC'; font-weight: 500;
        }
        body.night-mode .news-lang-select { background: rgba(0,0,0,0.5); color: white; border-color: rgba(255,255,255,0.2); }
        
        .news-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px; flex: 1; transition: opacity 0.5s ease-in-out; opacity: 1; }
        .news-card { background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 15px; font-size: 1.4vw; font-weight: 400; line-height: 1.5; color: var(--text-main); overflow: hidden; display: flex; align-items: flex-start; transition: all 2s ease; }
        body.night-mode .news-card { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.03); font-weight: 300; }
        .news-card span { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

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
                <div id="alarmStatus" style="color: #2e7d32; display: none;"><i class="fa-regular fa-bell"></i> 鬧鐘已設定</div>
                <div id="location"><i class="fa-solid fa-location-crosshairs"></i> 定位中...</div>
            </div>

            <div class="controls auto-hide">
                <button id="fullscreenBtn"><i class="fa-solid fa-expand"></i> 全螢幕</button>
                <button id="wakeBtn"><i class="fa-solid fa-bolt"></i> 恆亮</button>
                <label class="upload-btn"><i class="fa-regular fa-image"></i> 背景<input type="file" id="bgInput" accept="image/*" style="display: none;"></label>
                <button id="testNightBtn" style="color: #d35400;"><i class="fa-solid fa-moon"></i> 夜間測試</button>
                <button id="testEqBtn" style="color: var(--text-muted);"><i class="fa-solid fa-triangle-exclamation"></i> 警報</button>
                
                <div style="display: flex; gap: 5px; width: 100%; justify-content: center; margin-top: 10px;">
                    <input type="time" id="alarmTimeInput">
                    <button id="setAlarmBtn"><i class="fa-solid fa-check"></i> 設鬧鐘</button>
                    <button id="cancelAlarmBtn" style="display:none; color: #e74c3c;"><i class="fa-solid fa-xmark"></i> 取消</button>
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
            <div class="news-header">
                <div class="news-title-area">
                    <i class="fa-regular fa-newspaper"></i> <span id="news-source-title">焦點即時新聞</span>
                </div>
                <select id="newsLangSelect" class="news-lang-select auto-hide">
                    <option value="zh">中文 (PTS)</option>
                    <option value="en">English (Yahoo US)</option>
                    <option value="jp">日本語 (Yahoo JP)</option>
                </select>
            </div>
            <div class="news-grid" id="news-grid">
                <div class="news-card"><span>連線中...</span></div>
                <div class="news-card"><span>連線中...</span></div>
                <div class="news-card"><span>連線中...</span></div>
                <div class="news-card"><span>連線中...</span></div>
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

        // --- 防烙印 (Pixel Shifting) ---
        function applyPixelShift() {
            const shiftX = Math.floor(Math.random() * 9) - 4;
            const shiftY = Math.floor(Math.random() * 9) - 4;
            document.documentElement.style.setProperty('--shift-x', shiftX + 'px');
            document.documentElement.style.setProperty('--shift-y', shiftY + 'px');
        }
        setInterval(applyPixelShift, 60000);

        // --- 閒置隱藏 UI ---
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
                document.documentElement.requestFullscreen().catch(err => {});
                fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> 退出';
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> 全螢幕';
            }
        });

        // --- 時鐘、日期與 夜間模式判斷 ---
        let targetAlarmTime = null, isAlarmRinging = false, manualNightMode = false;
        function updateClock() {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock').textContent = \`\${hh}:\${mm}\`;
            document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
            
            const hour = now.getHours();
            const isNightTime = hour >= 23 || hour < 6;
            if (isNightTime || manualNightMode) document.body.classList.add('night-mode');
            else document.body.classList.remove('night-mode');

            if (targetAlarmTime === \`\${hh}:\${mm}\` && ss === '00' && !isAlarmRinging) triggerAlarm();
        }
        setInterval(updateClock, 1000); updateClock();

        document.getElementById('testNightBtn').addEventListener('click', () => { manualNightMode = !manualNightMode; updateClock(); });

        // --- 背景與鬧鐘記憶 ---
        const setAlarmBtn = document.getElementById('setAlarmBtn'), cancelAlarmBtn = document.getElementById('cancelAlarmBtn'), alarmTimeInput = document.getElementById('alarmTimeInput');
        let alarmSoundInterval;
        const savedAlarm = localStorage.getItem('smartDisplay_alarm');
        if (savedAlarm) {
            targetAlarmTime = savedAlarm;
            document.getElementById('alarmStatus').style.display = 'block'; document.getElementById('alarmStatus').innerHTML = \`<i class="fa-regular fa-bell"></i> 鬧鐘 \${targetAlarmTime}\`;
            setAlarmBtn.style.display = 'none'; cancelAlarmBtn.style.display = 'flex'; alarmTimeInput.style.display = 'none';
        }
        setAlarmBtn.addEventListener('click', () => {
            if (alarmTimeInput.value) {
                targetAlarmTime = alarmTimeInput.value; localStorage.setItem('smartDisplay_alarm', targetAlarmTime);
                document.getElementById('alarmStatus').style.display = 'block'; document.getElementById('alarmStatus').innerHTML = \`<i class="fa-regular fa-bell"></i> 鬧鐘 \${targetAlarmTime}\`;
                setAlarmBtn.style.display = 'none'; cancelAlarmBtn.style.display = 'flex'; alarmTimeInput.style.display = 'none';
            }
        });
        cancelAlarmBtn.addEventListener('click', () => {
            targetAlarmTime = null; localStorage.removeItem('smartDisplay_alarm');
            document.getElementById('alarmStatus').style.display = 'none';
            setAlarmBtn.style.display = 'flex'; cancelAlarmBtn.style.display = 'none'; alarmTimeInput.style.display = 'block'; alarmTimeInput.value = '';
        });

        const savedBg = localStorage.getItem('smartDisplay_bg');
        if (savedBg) { document.body.style.backgroundImage = \`url(\${savedBg})\`; }
        document.getElementById('bgInput').addEventListener('change', e => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => { 
                    document.body.style.backgroundImage = \`url(\${ev.target.result})\`; 
                    try { localStorage.setItem('smartDisplay_bg', ev.target.result); } catch (err) {}
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // ==========================================
        // 🌍 解決阻擋問題：改用超穩定的 Yahoo 新聞
        // ==========================================
        const newsFeeds = {
            'zh': { url: 'https://news.pts.org.tw/xml/newsfeed.xml', title: '公視即時新聞' },
            'en': { url: 'https://news.yahoo.com/rss/world', title: 'Yahoo World News' },
            'jp': { url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', title: 'Yahoo! Japan ニュース' }
        };

        let newsList = [], currentNewsPage = 0, newsInterval;
        const langSelect = document.getElementById('newsLangSelect');
        const newsSourceTitle = document.getElementById('news-source-title');

        const savedLang = localStorage.getItem('smartDisplay_newsLang') || 'zh';
        langSelect.value = savedLang;
        newsSourceTitle.textContent = newsFeeds[savedLang].title;

        async function fetchNews(lang) {
            try {
                const rssUrl = encodeURIComponent(newsFeeds[lang].url);
                const url = \`https://api.rss2json.com/v1/api.json?rss_url=\${rssUrl}&count=20\`;
                
                const res = await fetch(url); 
                const data = await res.json();
                
                if (data.status === 'ok' && data.items.length > 0) {
                    newsList = data.items.map(i => i.title);
                    currentNewsPage = 0; 
                    showNextNews();
                    
                    if(newsInterval) clearInterval(newsInterval);
                    newsInterval = setInterval(showNextNews, 10000); 
                }
            } catch (err) {
                console.log("新聞載入失敗");
            }
        }

        function showNextNews() {
            if(newsList.length === 0) return;
            const grid = document.getElementById('news-grid');
            grid.style.opacity = 0; 
            setTimeout(() => {
                grid.innerHTML = '';
                for(let i=0; i<4; i++) {
                    let index = (currentNewsPage * 4 + i) % newsList.length;
                    grid.innerHTML += \`<div class="news-card"><span>\${newsList[index]}</span></div>\`;
                }
                grid.style.opacity = 1; 
                currentNewsPage++;
            }, 500);
        }

        langSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            localStorage.setItem('smartDisplay_newsLang', lang); 
            newsSourceTitle.textContent = newsFeeds[lang].title;
            document.getElementById('news-grid').style.opacity = 0;
            setTimeout(() => fetchNews(lang), 500);
        });

        fetchNews(savedLang); 
        setInterval(() => fetchNews(langSelect.value), 60 * 60 * 1000);

        // --- 3. 天氣與定位 ---
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
                    
                    const el = document.createElement('div'); el.className = 'forecast-item';
                    el.innerHTML = \`
                        <div class="day">\${days[dateObj.getDay()]}</div>
                        <div class="icon">\${getIconHtml(data.daily.weather_code[i])}</div>
                        <div class="temp">\${minT}° - \${maxT}°</div>
                        <div class="details">
                            <span><i class="fa-solid fa-droplet"></i> \${dailyHumidity}%</span>
                            <span><i class="fa-solid fa-umbrella"></i> \${rain}%</span>
                        </div>
                    \`;
                    grid.appendChild(el);
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
                            const data = await res.json();
                            document.getElementById('location').innerHTML = \`<i class="fa-solid fa-location-dot"></i> \${data.city || data.locality}\`;
                        } catch {}
                    },
                    () => { document.getElementById('location').innerHTML = '<i class="fa-solid fa-location-dot"></i> 彰化市(預設)'; fetchWeather(24.08, 120.54); }
                );
            } else { fetchWeather(24.08, 120.54); }
        }
        initLocation(); setInterval(initLocation, 30 * 60 * 1000);

        // --- 4. 系統與音效 ---
        document.getElementById('wakeBtn').addEventListener('click', async () => {
            try { await navigator.wakeLock.request('screen'); document.getElementById('wakeStatus').innerHTML = '<span style="color:#fbc02d;"><i class="fa-solid fa-lightbulb"></i> 恆亮運作中</span>'; document.getElementById('wakeBtn').style.display = 'none'; } catch (err) {}
        });
        function playTone(type, freq, dur) {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + dur);
        }

        // --- 5. 地震 API ---
        let lastEqTime = null, eqBeepInterval;
        async function checkRealEarthquake() {
            try {
                const res = await fetch(\`https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0101-001?Authorization=\${CWA_API_KEY}&limit=1&format=JSON\`);
                const data = await res.json();
                if (data.success === 'true') {
                    const latestEq = data.records.Earthquake[0];
                    const eqTime = latestEq.EarthquakeInfo.OriginTime;
                    document.getElementById('eqStatus').innerHTML = '<span style="color:#2e7d32;"><i class="fa-solid fa-tower-broadcast"></i> 氣象署地震監控中</span>';
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