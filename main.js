// ==========================================
// 🔑 核心設定區：請填入你的氣象署 API 授權碼
// ==========================================
const CWA_API_KEY = 'CWA-847DA1DF-CF0B-4E3D-8C8F-5DE7DB24EDD8'; 

let audioCtx;

// --- 1. 時鐘與日期 ---
function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('clock').textContent = `${hh}:${mm}`;
    document.getElementById('date-display').textContent = now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
}
setInterval(updateClock, 1000); 
updateClock();


// --- 2. 新聞區域 (更換為不阻擋 API 的穩定來源) ---
const rssFeeds = {
    international: 'https://news.ltn.com.tw/rss/world.xml', // 自由時報國際新聞
    japan: 'https://www.nhk.or.jp/rss/news/cat0.xml',        // NHK 日本主要新聞
    taiwan: 'https://news.pts.org.tw/xml/newsfeed.xml'       // 公視新聞 (穩定)
};
let currentCategory = 'international';

async function fetchNews(category = currentCategory) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '<div style="color: #aaa; padding: 20px;">新聞載入中...</div>';

    try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeeds[category])}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.status === 'ok' && data.items.length > 0) {
            grid.innerHTML = ''; 
            
            let sourceName = "綜合新聞";
            if (category === 'international') sourceName = "自由國際";
            if (category === 'japan') sourceName = "NHK 新聞";
            if (category === 'taiwan') sourceName = "公視新聞";

            data.items.slice(0, 4).forEach(item => {
                grid.innerHTML += `
                    <a href="${item.link}" target="_blank" class="news-card">
                        <div class="news-card-text">${item.title}</div>
                        <div class="news-source">
                            <span class="material-symbols-rounded" style="font-size:1vw;">article</span> ${sourceName}
                        </div>
                    </a>
                `;
            });
        } else {
            grid.innerHTML = `<div style="color: #ff7675; padding: 20px;">無法取得新聞，請稍後再試。</div>`;
        }
    } catch (err) {
        console.error("新聞載入失敗", err);
        grid.innerHTML = `<div style="color: #ff7675; padding: 20px;">網路連線錯誤，無法載入新聞。</div>`;
    }
}
fetchNews(); 
setInterval(() => fetchNews(currentCategory), 15 * 60 * 1000); 

document.querySelectorAll('.news-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        fetchNews(currentCategory);
    });
});


// --- 3. 天氣與定位 ---
function getMaterialIcon(code) {
    if (code === 0) return 'clear_day'; 
    if (code <= 3) return 'partly_cloudy_day'; 
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy'; 
    if (code >= 71 && code <= 77) return 'weather_snowy'; 
    if (code >= 95) return 'thunderstorm'; 
    return 'cloud';
}

async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,windspeed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const res = await fetch(url); 
        const data = await res.json();
        
        // 更新當前天氣詳細情報
        document.getElementById('current-temp').textContent = Math.round(data.current.temperature_2m) + '°';
        document.getElementById('current-icon').textContent = getMaterialIcon(data.current.weather_code);
        document.getElementById('current-humidity').textContent = data.current.relative_humidity_2m;
        document.getElementById('current-rain').textContent = data.daily.precipitation_probability_max[0];
        document.getElementById('current-feels-like').textContent = Math.round(data.current.apparent_temperature);
        document.getElementById('current-wind').textContent = Math.round(data.current.windspeed_10m);
        
        // 更新未來 5 天預報 (加入最低溫與降雨機率)
        const grid = document.getElementById('forecast-grid'); 
        grid.innerHTML = '';
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        
        for (let i = 1; i <= 5; i++) {
            const dateObj = new Date(data.daily.time[i]);
            const minTemp = Math.round(data.daily.temperature_2m_min[i]);
            const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
            const rainProb = data.daily.precipitation_probability_max[i];

            grid.innerHTML += `
                <div class="forecast-card">
                    <div class="day" style="font-weight: 500;">${days[dateObj.getDay()]}</div>
                    <span class="material-symbols-rounded icon" style="font-size: 2.2vw; margin: 5px 0;">${getMaterialIcon(data.daily.weather_code[i])}</span>
                    <div class="temp" style="font-size: 1.1vw;">
                        <span style="color: #4fc3f7;">${minTemp}°</span> 
                        <span style="color: #888; font-size: 0.9vw; margin: 0 2px;">/</span> 
                        <span style="color: #ff7675;">${maxTemp}°</span>
                    </div>
                    <div style="font-size: 0.9vw; color: #aaa; margin-top: 5px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-rounded" style="font-size: 1vw; color: #4fc3f7;">water_drop</span> ${rainProb}%
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error("天氣載入失敗", err);
    }
}

function initLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude, lon = pos.coords.longitude;
                fetchWeather(lat, lon);
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                    const data = await res.json();
                    document.getElementById('location').textContent = data.city || data.locality || "未知地點";
                } catch {}
            },
            () => { 
                document.getElementById('location').textContent = '京都市'; 
                fetchWeather(35.01, 135.76); 
            }
        );
    } else { 
        document.getElementById('location').textContent = '京都市'; 
        fetchWeather(35.01, 135.76); 
    }
}
initLocation(); 
setInterval(initLocation, 30 * 60 * 1000);


// --- 4. 系統功能與音效 ---
document.getElementById('bgInput').addEventListener('change', e => {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = ev => { document.body.style.backgroundImage = `url(${ev.target.result})`; };
        reader.readAsDataURL(e.target.files[0]);
    }
});

document.getElementById('wakeBtn').addEventListener('click', async () => {
    try { 
        await navigator.wakeLock.request('screen'); 
        const wakeStat = document.getElementById('wakeStat');
        wakeStat.classList.add('active');
        document.getElementById('wakeStatus').textContent = '螢幕恆亮：運作中'; 
        document.getElementById('wakeBtn').style.display = 'none'; 
    } catch (err) {
        console.error("無法啟用恆亮", err);
    }
});

function playTone(type, freq, dur) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
}


// --- 5. 真實 CWA 地震警報系統 ---
let lastEqTime = null;
let eqBeepInterval;

async function checkRealEarthquake() {
    if (CWA_API_KEY.includes('YOUR_CWA')) {
        document.getElementById('eqStatus').textContent = '⚠️ 未輸入 API 金鑰';
        document.getElementById('eqStat').classList.remove('active');
        return;
    }

    try {
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0101-001?Authorization=${CWA_API_KEY}&limit=1&format=JSON`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success === 'true') {
            const latestEq = data.records.Earthquake[0];
            const eqTime = latestEq.EarthquakeInfo.OriginTime;
            
            document.getElementById('eqStatus').textContent = '地震防護：監控中';
            document.getElementById('eqStat').classList.add('active');

            if (!lastEqTime) {
                lastEqTime = eqTime;
                return;
            }

            if (eqTime !== lastEqTime) {
                lastEqTime = eqTime; 
                
                const reportContent = latestEq.ReportContent;
                const magnitude = latestEq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue;
                const depth = latestEq.EarthquakeInfo.FocalDepth;

                const infoHtml = `芮氏規模：<span style="color:#ff4757; font-weight:bold;">${magnitude}</span><br>深度：${depth} 公里<br><br><span style="font-size: 2.2vw;">${reportContent}</span>`;
                
                triggerEqAlarm(infoHtml);
            }
        }
    } catch (err) {
        console.error("地震 API 抓取失敗", err);
    }
}

function triggerEqAlarm(infoHtml) {
    document.body.classList.add('eq-active'); 
    document.getElementById('eq-overlay').style.display = 'flex';
    document.getElementById('eq-info-text').innerHTML = infoHtml;
    
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    playTone('square', 800, 0.3); 
    eqBeepInterval = setInterval(() => playTone('square', 800, 0.3), 800);
}

document.getElementById('dismissEqBtn').addEventListener('click', () => {
    document.body.classList.remove('eq-active'); 
    document.getElementById('eq-overlay').style.display = 'none';
    clearInterval(eqBeepInterval);
});

setInterval(checkRealEarthquake, 60000); 
setTimeout(checkRealEarthquake, 2000);