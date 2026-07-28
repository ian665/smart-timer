const express = require('express');
const path = require('path');

const DEFAULT_PORT = process.env.PORT || 3000;
const CACHE_TTL = {
    news: 60 * 60 * 1000,
    stocks: 5 * 60 * 1000,
    earthquake: 60 * 1000
};
const STALE_TTL = 24 * 60 * 60 * 1000;

function createApp(options = {}) {
    const app = express();
    const fetchImpl = options.fetchImpl || global.fetch;
    const env = options.env || process.env;
    const cache = new Map();

    function getCache(key, allowStale = false) {
        const entry = cache.get(key);
        if (!entry) return null;
        const age = Date.now() - entry.updatedAt;
        if (age <= entry.ttl) return { ...entry, stale: false };
        if (allowStale && age <= STALE_TTL) return { ...entry, stale: true };
        if (age > STALE_TTL) cache.delete(key);
        return null;
    }

    function setCache(key, data, ttl) {
        const entry = { data, ttl, updatedAt: Date.now() };
        cache.set(key, entry);
        return entry;
    }

    async function fetchWithTimeout(url, init = {}, timeoutMs = 10000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(url, { ...init, signal: controller.signal });
            if (!response.ok) throw new Error(`Upstream request failed: ${response.status}`);
            return response;
        } finally {
            clearTimeout(timer);
        }
    }

    async function cachedResponse(res, key, ttl, loader) {
        const fresh = getCache(key);
        if (fresh && !fresh.stale) {
            return res.json({ status: 'ok', items: fresh.data, stale: false, updatedAt: new Date(fresh.updatedAt).toISOString() });
        }

        try {
            const data = await loader();
            const entry = setCache(key, data, ttl);
            return res.json({ status: 'ok', items: data, stale: false, updatedAt: new Date(entry.updatedAt).toISOString() });
        } catch (error) {
            const stale = getCache(key, true);
            if (stale) {
                return res.json({
                    status: 'ok',
                    items: stale.data,
                    stale: true,
                    updatedAt: new Date(stale.updatedAt).toISOString(),
                    message: '資料來源暫時無法連線，正在顯示最近一次資料'
                });
            }
            return res.status(503).json({
                status: 'error',
                items: [],
                message: '資料來源暫時無法連線，請稍後再試'
            });
        }
    }

    app.get('/api/news/:lang', async (req, res) => {
        const feeds = {
            zh: 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
            en: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'
        };
        const feedUrl = feeds[req.params.lang];
        if (!feedUrl) return res.status(400).json({ status: 'error', items: [], message: '不支援的新聞語言' });

        return cachedResponse(res, `news:${req.params.lang}`, CACHE_TTL.news, async () => {
            const response = await fetchWithTimeout(feedUrl);
            const xml = await response.text();
            const titles = [];
            const regex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/g;
            let match;
            while ((match = regex.exec(xml)) !== null && titles.length < 20) {
                titles.push(match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&'));
            }
            if (!titles.length) throw new Error('News feed is empty');
            return titles;
        });
    });

    app.get('/api/stocks', async (_req, res) => {
        const symbols = ['^TWII', '2330.TW', '^DJI', '^IXIC'];
        const nameMap = {
            '^TWII': '台灣加權指數',
            '2330.TW': '台積電 (2330)',
            '^DJI': '道瓊工業指數',
            '^IXIC': '納斯達克指數'
        };

        return cachedResponse(res, 'stocks', CACHE_TTL.stocks, async () => Promise.all(symbols.map(async (symbol) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
            const response = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const data = await response.json();
            const meta = data.chart?.result?.[0]?.meta;
            if (!meta || !Number.isFinite(meta.regularMarketPrice)) throw new Error(`Missing stock data: ${symbol}`);
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            return {
                symbol,
                name: nameMap[symbol] || meta.shortName || symbol,
                price: meta.regularMarketPrice,
                change: meta.regularMarketPrice - previousClose,
                changePercent: ((meta.regularMarketPrice - previousClose) / previousClose) * 100
            };
        })));
    });

    app.get('/api/earthquake/latest', async (_req, res) => {
        const apiKey = env.CWA_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                status: 'error',
                message: '地震資訊服務尚未設定',
                monitoringType: 'latest-report'
            });
        }

        const key = 'earthquake:latest';
        const fresh = getCache(key);
        if (fresh && !fresh.stale) {
            return res.json({ status: 'ok', item: fresh.data, stale: false, updatedAt: new Date(fresh.updatedAt).toISOString(), monitoringType: 'latest-report' });
        }

        try {
            const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0101-001?Authorization=${encodeURIComponent(apiKey)}&limit=1&format=JSON`;
            const response = await fetchWithTimeout(url);
            const data = await response.json();
            const latest = data.records?.Earthquake?.[0];
            if (data.success !== 'true' || !latest) throw new Error('Invalid earthquake response');
            const item = {
                originTime: latest.EarthquakeInfo?.OriginTime,
                magnitude: latest.EarthquakeInfo?.EarthquakeMagnitude?.MagnitudeValue,
                depth: latest.EarthquakeInfo?.FocalDepth,
                reportContent: latest.ReportContent
            };
            const entry = setCache(key, item, CACHE_TTL.earthquake);
            return res.json({ status: 'ok', item, stale: false, updatedAt: new Date(entry.updatedAt).toISOString(), monitoringType: 'latest-report' });
        } catch (error) {
            const stale = getCache(key, true);
            if (stale) {
                return res.json({
                    status: 'ok',
                    item: stale.data,
                    stale: true,
                    updatedAt: new Date(stale.updatedAt).toISOString(),
                    message: '氣象署暫時無法連線，顯示最近一次地震報告',
                    monitoringType: 'latest-report'
                });
            }
            return res.status(503).json({
                status: 'error',
                message: '暫時無法取得氣象署地震報告',
                monitoringType: 'latest-report'
            });
        }
    });

    // 定期移除超過備援期限的快取，避免常駐服務無限制累積記憶體。
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
            if (now - entry.updatedAt > STALE_TTL) cache.delete(key);
        }
    }, 30 * 60 * 1000);
    cleanupTimer.unref();

    app.use(express.static(__dirname));
    app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

    app.locals.cache = cache;
    app.locals.cleanupTimer = cleanupTimer;
    return app;
}

if (require.main === module) {
    const app = createApp();
    app.listen(DEFAULT_PORT, '0.0.0.0', () => {
        console.log(`伺服器已啟動！請在瀏覽器打開 http://localhost:${DEFAULT_PORT}`);
    });
}

module.exports = { createApp };
