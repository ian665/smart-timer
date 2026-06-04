const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// ==========================================
// 🚀 伺服器後端 API：直接抓取 Google News
// ==========================================
app.get('/api/news/:lang', async (req, res) => {
    const feeds = {
        'zh': 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
        'en': 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
        'jp': 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja'
    };
    const feedUrl = feeds[req.params.lang];
    if (!feedUrl) {
        res.status(400).json({ status: 'error', items: [] });
        return;
    }

    try {
        const response = await fetch(feedUrl);
        if (!response.ok) throw new Error(`News feed failed: ${response.status}`);
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
        const symbols = ['^TWII', '2330.TW', '^DJI', '^IXIC'];

        // 自訂中文名稱映射
        const nameMap = {
            '^TWII': '台灣加權指數',
            '2330.TW': '台積電 (2330)',
            '^DJI': '道瓊工業指數',
            '^IXIC': '納斯達克指數'
        };

        const result = await Promise.all(symbols.map(async (symbol) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!response.ok) throw new Error(`Stocks feed failed: ${response.status}`);

            const data = await response.json();
            const meta = data.chart?.result?.[0]?.meta;
            if (!meta) throw new Error(`Missing stock data: ${symbol}`);

            const price = meta.regularMarketPrice;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const change = price - previousClose;
            const changePercent = (change / previousClose) * 100;

            return {
                symbol,
                name: nameMap[symbol] || meta.shortName || symbol,
                price,
                change,
                changePercent
            };
        }));

        res.json({ status: 'ok', items: result });
    } catch (error) {
        res.json({ status: 'error', items: [] });
    }
});

// ==========================================
// 網頁前端介面：由 index.html 維護
// ==========================================
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, host, () => {
    console.log(`伺服器已啟動！請在瀏覽器打開 http://localhost:${port}`);
});
