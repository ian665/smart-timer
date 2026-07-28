const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

async function withServer(app, run) {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    try {
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
}

test('拒絕不支援的新聞語言', async () => {
    const app = createApp({ fetchImpl: async () => { throw new Error('不應呼叫上游'); } });
    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/news/jp`);
        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.status, 'error');
        assert.match(body.message, /不支援/);
    });
});

test('未設定氣象署金鑰時提供清楚錯誤且不洩漏金鑰', async () => {
    const app = createApp({ env: {}, fetchImpl: async () => { throw new Error('不應呼叫上游'); } });
    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/earthquake/latest`);
        const body = await response.json();
        assert.equal(response.status, 503);
        assert.equal(body.monitoringType, 'latest-report');
        assert.match(body.message, /尚未設定/);
        assert.equal(JSON.stringify(body).includes('Authorization'), false);
    });
});

test('新聞來源失效時回傳最近一次資料並標示過期', async () => {
    let shouldFail = false;
    const feed = '<rss><channel><item><title><![CDATA[測試新聞標題]]></title></item></channel></rss>';
    const app = createApp({
        fetchImpl: async () => {
            if (shouldFail) throw new Error('上游失效');
            return new Response(feed, { status: 200 });
        }
    });

    await withServer(app, async (baseUrl) => {
        const first = await fetch(`${baseUrl}/api/news/zh`).then(response => response.json());
        assert.equal(first.status, 'ok');
        assert.equal(first.stale, false);
        assert.deepEqual(first.items, ['測試新聞標題']);

        // 模擬快取超過正常更新時間，但仍位於 24 小時備援期限內。
        app.locals.cache.get('news:zh').updatedAt -= 60 * 60 * 1000 + 1;
        shouldFail = true;

        const second = await fetch(`${baseUrl}/api/news/zh`).then(response => response.json());
        assert.equal(second.status, 'ok');
        assert.equal(second.stale, true);
        assert.deepEqual(second.items, ['測試新聞標題']);
        assert.match(second.message, /最近一次資料/);
    });
});

test('上游完全無資料時回傳 503 與可讀訊息', async () => {
    const app = createApp({ fetchImpl: async () => { throw new Error('上游失效'); } });
    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/news/en`);
        const body = await response.json();
        assert.equal(response.status, 503);
        assert.equal(body.status, 'error');
        assert.match(body.message, /稍後再試/);
    });
});
