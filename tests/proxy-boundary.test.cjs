const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { EventEmitter, getEventListeners } = require('node:events');
const { Readable } = require('node:stream');
const http = require('node:http');
const net = require('node:net');
const zlib = require('node:zlib');
const ts = require('typescript');

const root = path.resolve(process.env.PLAYPACK_SOURCE_ROOT || path.join(__dirname, '..'));
const helperFile = path.join(root, 'artifacts/api-server/src/lib/proxy-fetch.ts');
const routeFile = path.join(root, 'artifacts/api-server/src/routes/proxy.ts');
const baseline = !fs.existsSync(helperFile);
const PUBLIC_V4 = '93.184.216.34';
const PUBLIC_V6 = '2606:4700::1111';
const LIMIT = 2 * 1024 * 1024;
const compiled = new Map();
const tick = () => new Promise(resolve => setImmediate(resolve));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const plain = value => JSON.parse(JSON.stringify(value));

function compile(file, append = '') {
  const key = file + append;
  if (!compiled.has(key)) {
    const result = ts.transpileModule(fs.readFileSync(file, 'utf8') + append, {
      fileName: file, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    compiled.set(key, result.outputText);
  }
  return compiled.get(key);
}

// Only DNS/transport/time and unrelated Express/Cheerio seams are replaced.
// The security policy, connection lookup callback and streaming implementation are actual source.
function harness(config = {}) {
  const stats = { lookups: [], requests: [], responses: [], readChunks: 0, connections: [], signals: [] };
  const timers = new Set();
  const controllers = [];
  let route;
  const addresses = config.addresses || [{ address: PUBLIC_V4, family: 4 }];
  const dns = {
    async lookup(host, options) {
      stats.lookups.push({ host, options });
      if (config.lookup) return config.lookup(host, options);
      if (config.dnsError) throw new Error('synthetic DNS error');
      return addresses;
    },
    async resolve4() {
      if (config.legacyDnsDelay) await delay(config.legacyDnsDelay);
      if (config.dnsError) throw new Error('synthetic DNS error');
      return addresses.filter(a => a.family === 4).map(a => a.address);
    },
    async resolve6() {
      if (config.dnsError) throw new Error('synthetic DNS error');
      return addresses.filter(a => a.family === 6).map(a => a.address);
    },
  };
  function timer(fn, _ms) {
    assert.equal(_ms, 10000);
    const handle = setTimeout(fn, config.deadlineMs || 5000);
    if (!config.keepDeadlineAlive) handle.unref();
    timers.add(handle);
    return handle;
  }
  class RecordedAbortController extends AbortController {
    constructor() { super(); controllers.push(this); stats.signals.push(this.signal); }
  }
  const signalApi = {
    timeout(ms) {
      const controller = new RecordedAbortController();
      timer(() => controller.abort(new Error('synthetic deadline')), ms);
      return controller.signal;
    },
  };
  function fixture(url) {
    return config.response ? config.response(url, stats.requests.length) : { body: Buffer.from('<title>Public fixture</title>') };
  }
  function responseStream(spec) {
    const chunks = spec.chunks || [spec.body || Buffer.alloc(0)];
    const response = Readable.from((async function* () {
      if (spec.bodyDelay) await delay(spec.bodyDelay);
      for (const chunk of chunks) {
        if (spec.chunkDelay && stats.readChunks > 0) await delay(spec.chunkDelay);
        stats.readChunks++; yield chunk;
      }
    })());
    response.statusCode = spec.status || 200;
    response.headers = Object.fromEntries(Object.entries(spec.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    response.on('error', () => {});
    stats.responses.push(response);
    return response;
  }
  function pinned(options, url) {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(hostname)) return Promise.resolve([{ address: hostname, family: net.isIP(hostname) }]);
    return new Promise((resolve, reject) => {
      assert.equal(typeof options.lookup, 'function');
      options.lookup(hostname, { all: true, family: 0 }, (error, all) => error ? reject(error) : resolve(all));
    });
  }
  function request(url, options, callback) {
    url = new URL(url);
    stats.requests.push({ url: url.href, options });
    if (config.localPort) {
      assert.equal(url.protocol, 'http:');
      assert.equal(Number(url.port), config.localPort);
      const originalLookup = options.lookup;
      // Test-only transport adaptation AFTER the real production policy and pinned callback.
      // No policy mock or production private-network opt-in is used.
      return http.request(url, { ...options, lookup(host, opts, cb) {
        originalLookup(host, opts, (error, result, family) => {
          if (error) return cb(error);
          const all = Array.isArray(result) ? result : [{ address: result, family }];
          assert.ok(all.every(a => a.address === PUBLIC_V4));
          stats.connections.push(...all);
          if (opts.all) cb(null, [{ address: '127.0.0.1', family: 4 }]);
          else cb(null, '127.0.0.1', 4);
        });
      } }, callback);
    }
    const outgoing = new EventEmitter();
    outgoing.destroyed = false;
    let active;
    const onAbort = () => outgoing.destroy(new Error('synthetic abort'));
    function cleanup() { options.signal.removeEventListener('abort', onAbort); }
    outgoing.destroy = error => {
      if (outgoing.destroyed) return outgoing;
      outgoing.destroyed = true; active?.destroy(); cleanup();
      if (error) outgoing.emit('error', error);
      queueMicrotask(() => outgoing.emit('close'));
      return outgoing;
    };
    outgoing.end = () => queueMicrotask(async () => {
      try {
        if (options.signal.aborted) return onAbort();
        options.signal.addEventListener('abort', onAbort, { once: true });
        const all = await pinned(options, url);
        stats.connections.push(...all);
        const spec = fixture(url);
        if (spec.headerDelay) await delay(spec.headerDelay);
        if (outgoing.destroyed) return;
        if (spec.error) return outgoing.destroy(new Error(spec.error));
        if (spec.upgrade) {
          const socket = { destroyed: false, destroy() { this.destroyed = true; } };
          stats.upgradeSocket = socket;
          outgoing.emit('upgrade', { statusCode: 101 }, socket);
          return;
        }
        active = responseStream(spec);
        active.once('close', () => outgoing.destroy());
        callback(active);
      } catch (error) { outgoing.destroy(error); }
    });
    return outgoing;
  }
  async function legacyFetch(url, options) {
    url = new URL(url);
    stats.requests.push({ url: url.href, options });
    // These tested ports are rejected by native Fetch before a socket is opened.
    if (['0', '22', '25', '53', '2049', '6000', '6667', '10080'].includes(url.port)) throw new Error('synthetic native Fetch bad port');
    stats.connections.push({ address: config.connectionAddress || PUBLIC_V4, family: 4 });
    if (config.localPort) {
      assert.equal(url.protocol, 'http:');
      assert.equal(Number(url.port), config.localPort);
      const originalHost = url.host;
      url.hostname = '127.0.0.1';
      return fetch(url, { ...options, headers: { ...options.headers, Host: originalHost } });
    }
    const spec = fixture(url);
    if (spec.headerDelay) await delay(spec.headerDelay);
    if (options.signal.aborted) throw new Error('synthetic abort');
    if (spec.error) throw new Error(spec.error);
    if (spec.upgrade || url.username || url.password) throw new Error('synthetic native fetch rejection');
    const headers = Object.fromEntries(Object.entries(spec.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const nullBody = [204, 205, 304].includes(spec.status);
    const bodyStream = { destroyed: nullBody, async cancel() { this.destroyed = true; } };
    stats.responses.push(bodyStream);
    return { ok: (spec.status || 200) < 300, status: spec.status || 200,
      body: bodyStream,
      headers: { get: name => headers[name.toLowerCase()] || null },
      async text() {
        if (nullBody) return '';
        if (spec.bodyDelay) await delay(spec.bodyDelay);
        if (options.signal.aborted) throw new Error('synthetic abort');
        const chunks = spec.chunks || [spec.body || Buffer.alloc(0)];
        stats.readChunks += chunks.length;
        let body = Buffer.concat(chunks);
        const encodings = (headers['content-encoding'] || 'identity').split(',').map(s => s.trim().toLowerCase());
        if (encodings.length > 5) throw new Error('synthetic native Fetch encoding count');
        if (encodings.every(s => ['gzip', 'x-gzip', 'deflate', 'br', 'zstd'].includes(s))) {
          for (const encoding of encodings.reverse()) {
            const options = { flush: zlib.constants.Z_SYNC_FLUSH, finishFlush: zlib.constants.Z_SYNC_FLUSH };
            if (['gzip', 'x-gzip'].includes(encoding)) body = zlib.gunzipSync(body, options);
            else if (encoding === 'deflate') body = (body[0] & 15) === 8 ? zlib.inflateSync(body, options) : zlib.inflateRawSync(body, options);
            else if (encoding === 'br') body = zlib.brotliDecompressSync(body, { finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH });
            else if (encoding === 'zstd') body = zlib.zstdDecompressSync(body);
          }
        }
        return new TextDecoder().decode(body);
      },
    };
  }
  const fakeCheerio = { load() {
    return selector => ({ first() { return this; }, text: () => selector === 'title' ? 'Public fixture' : '',
      attr: name => selector === 'link[rel="manifest"]' && name === 'href' ? config.manifestLink : undefined,
      each() {} });
  } };
  const cache = new Map();
  function load(file, append = '') {
    const module = { exports: {} }; cache.set(file, module);
    const requireSource = name => {
      if (name === 'node:dns/promises') return { lookup: dns.lookup };
      if (name === 'dns') return { promises: dns };
      if (name === 'node:http') return { request };
      if (name === 'node:https') return { request };
      if (name === 'express') return { Router: () => ({ post: (_path, handler) => { route = handler; } }) };
      if (name === 'cheerio') return fakeCheerio;
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(file), name + '.ts');
        return cache.has(target) ? cache.get(target).exports : load(target);
      }
      assert.ok(['node:net', 'node:stream', 'node:stream/promises', 'node:util', 'node:zlib'].includes(name), name);
      return require(name);
    };
    vm.runInNewContext(compile(file, append), { module, exports: module.exports, require: requireSource,
      Buffer, URL, TextDecoder, AbortController: RecordedAbortController, AbortSignal: signalApi,
      fetch: legacyFetch, setTimeout: timer, clearTimeout, console }, { filename: file });
    return module.exports;
  }
  const api = baseline ? load(routeFile, '\nexport { normalizeUrl, safeFetch, isPrivateIP };') : load(helperFile);
  if (baseline) {
    api.createProxyFetch = () => api.safeFetch;
    api.isPublicProxyAddress = address => !api.isPrivateIP(address);
  }
  return { api, stats,
    loadRoute() { if (!route) load(routeFile); return route; },
    abort() { controllers.forEach(c => c.abort(new Error('synthetic deadline'))); },
    dispose() { timers.forEach(clearTimeout); },
  };
}

function setup(t, config) { const h = harness(config); t.after(() => h.dispose()); return h; }

test('real address policy blocks nonpublic IPv4, IPv6, mapped and alternate URL forms', t => {
  const { api } = setup(t);
  for (const address of ['0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.2', '169.254.1.1',
    '172.31.0.1', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', 'fc01::1', 'fd00::1', 'fe81::1', 'fec0::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a00:1', '64:ff9b::7f00:1', '2002:7f00:1::']) {
    assert.equal(api.isPublicProxyAddress(address), false, address);
  }
  for (const target of ['http://2130706433', 'http://0x7f000001', 'http://0177.0.0.1',
    'http://127.1', 'http://[::ffff:127.0.0.1]', 'http://[fc01::1]', 'http://[fe81::1]', 'http://localhost.']) {
    assert.equal(api.normalizeUrl(target), null, target);
  }
});

test('legitimate public IPv4, IPv6, mapped addresses and explicit ports remain accepted', t => {
  const { api } = setup(t);
  for (const address of [PUBLIC_V4, PUBLIC_V6, '::ffff:5db8:d822']) assert.equal(api.isPublicProxyAddress(address), true);
  assert.equal(api.normalizeUrl(' example.com/path?q=1 '), 'https://example.com/path?q=1');
  assert.equal(api.normalizeUrl('http://example.com:8080/path?q=1'), 'http://example.com:8080/path?q=1');
});

test('userinfo cannot introduce Basic authentication when changing transport', t => {
  const { api } = setup(t);
  assert.equal(api.normalizeUrl('https://synthetic-user:synthetic-password@example.com'), null);
});

for (const config of [{ dnsError: true }, { addresses: [] }, { addresses: [
  { address: PUBLIC_V4, family: 4 }, { address: 'fc01::1', family: 6 },
] }]) test('DNS errors, empty or mixed public/private answers fail closed: ' + JSON.stringify(config), async t => {
  const h = setup(t, config); const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.equal(h.stats.requests.length, 0);
});

test('one vetted DNS result set supplies both socket lookup callback forms and retains HTTPS identity defaults', async t => {
  const h = setup(t, { addresses: [{ address: PUBLIC_V4, family: 4 }, { address: PUBLIC_V6, family: 6 }] });
  const result = await h.api.createProxyFetch()('https://public.fixture.test:8443/path?q=1');
  assert.equal(result.ok, true); assert.equal(h.stats.lookups.length, 1);
  const { url, options } = h.stats.requests[0];
  assert.equal(url, 'https://public.fixture.test:8443/path?q=1'); assert.equal(options.agent, false);
  assert.equal(options.rejectUnauthorized, true); assert.equal(options.checkServerIdentity, undefined);
  assert.equal(options.auth, undefined); assert.equal(options.headers.Authorization, undefined);
  const single = await new Promise((resolve, reject) => options.lookup('public.fixture.test', {}, (err, address, family) => err ? reject(err) : resolve({ address, family })));
  assert.deepEqual(plain(single), { address: PUBLIC_V4, family: 4 });
  const all = await new Promise((resolve, reject) => options.lookup('public.fixture.test', { all: true }, (err, value) => err ? reject(err) : resolve(value)));
  assert.deepEqual(plain(all), [{ address: PUBLIC_V4, family: 4 }, { address: PUBLIC_V6, family: 6 }]);
  assert.equal(h.stats.lookups.length, 1);
  await tick(); assert.equal(getEventListeners(h.stats.signals[0], 'abort').length, 0);
});

test('a second resolver result cannot replace the validated socket addresses', async t => {
  let calls = 0;
  const h = setup(t, { connectionAddress: '127.0.0.1', lookup: async () => {
    calls++; return [{ address: calls === 1 ? PUBLIC_V4 : '127.0.0.1', family: 4 }];
  } });
  assert.equal((await h.api.createProxyFetch()('http://public.fixture.test/')).ok, true);
  assert.ok(h.stats.connections.every(a => a.address === PUBLIC_V4));
});

test('IPv6-only public hosts do not require an A record', async t => {
  const h = setup(t, { addresses: [{ address: PUBLIC_V6, family: 6 }] });
  assert.equal((await h.api.createProxyFetch()('https://v6.fixture.test/')).ok, true);
});

test('late DNS completion after deadline cannot start a request', async t => {
  let complete;
  const h = setup(t, { deadlineMs: 20, keepDeadlineAlive: true, legacyDnsDelay: 120, lookup: () => new Promise(resolve => { complete = resolve; }) });
  const result = await h.api.createProxyFetch()('https://slow-dns.fixture.test/');
  assert.equal(result.ok, false); assert.match(result.error, /timed out/);
  complete([{ address: PUBLIC_V4, family: 4 }]); await tick();
  assert.equal(h.stats.requests.length, 0);
  assert.equal(getEventListeners(h.stats.signals[0], 'abort').length, 0);
});

for (const target of ['data:text/plain,synthetic', 'file:///synthetic', 'http://[::ffff:7f00:1]/', 'https://synthetic:synthetic@example.com/']) {
  test('every redirect target uses the shared URL policy: ' + target, async t => {
    const h = setup(t, { response: (_url, count) => count === 1 ?
      { status: 302, headers: { location: target }, chunks: [Buffer.alloc(LIMIT + 1)] } :
      { body: Buffer.from('finite baseline fixture escape') } });
    const result = await h.api.createProxyFetch()('http://public.fixture.test/');
    assert.equal(result.ok, false); assert.equal(h.stats.requests.length, 1);
    assert.ok(h.stats.responses.every(r => r.destroyed)); assert.equal(h.stats.readChunks, 0);
  });
}

test('relative redirects remain supported and redirect bodies are discarded', async t => {
  const h = setup(t, { response: url => url.pathname === '/start' ?
    { status: 302, headers: { location: '/finish' }, body: Buffer.alloc(LIMIT + 1) } : { body: Buffer.from('public final') } });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/start');
  assert.equal(result.ok, true); assert.equal(result.text, 'public final');
  assert.equal(h.stats.requests[1].url, 'https://public.fixture.test/finish');
  assert.ok(h.stats.responses[0].destroyed); assert.equal(h.stats.readChunks, 1);
});

test('redirect loops stop after at most five followed redirects', async t => {
  const h = setup(t, { response: (_url, count) => count > 8 ? { body: Buffer.from('baseline fixture escape') } :
    { status: 302, headers: { location: '/loop' } } });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/loop');
  assert.equal(result.ok, false); assert.match(result.error, /redirects/);
  assert.equal(h.stats.requests.length, 6);
});

test('one scan deadline remains in force for the second resource', async t => {
  const h = setup(t); const fetchResource = h.api.createProxyFetch();
  assert.equal((await fetchResource('https://public.fixture.test/html')).ok, true);
  h.abort(); const result = await fetchResource('https://manifest.fixture.test/app.webmanifest');
  assert.equal(result.ok, false); assert.match(result.error, /timed out/); assert.equal(h.stats.requests.length, 1);
});

test('redirects cannot restart the overall deadline', async t => {
  const h = setup(t, { deadlineMs: 40, keepDeadlineAlive: true,
    response: (_url, count) => count < 3 ? { status: 302, headers: { location: '/again' }, headerDelay: 25 } :
      { body: Buffer.from('late final'), headerDelay: 25 } });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/start');
  assert.equal(result.ok, false); assert.match(result.error, /timed out/);
});

test('body completion is covered by the deadline after headers arrive', async t => {
  const h = setup(t, { deadlineMs: 20, keepDeadlineAlive: true, response: () => ({ body: Buffer.from('late'), bodyDelay: 120 }) });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.match(result.error, /timed out/);
  assert.ok(h.stats.responses.every(r => r.destroyed));
});

test('chunked wire overflow is rejected during streaming without consuming the remaining chunks', async t => {
  const chunks = [...Array(8)].map(() => Buffer.alloc(512 * 1024, 'x'));
  const h = setup(t, { response: () => ({ chunks }) });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.match(result.error, /too large/);
  assert.ok(h.stats.readChunks < chunks.length); assert.ok(h.stats.responses[0].destroyed);
});

test('UTF8 decoded bytes, rather than UTF16 string length, enforce the response limit', async t => {
  const body = Buffer.from('é'.repeat(LIMIT / 2 + 1));
  const h = setup(t, { response: () => ({ body }) });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.match(result.error, /too large/);
});

for (const [encoding, compress] of [['gzip', zlib.gzipSync], ['deflate', zlib.deflateSync], ['br', zlib.brotliCompressSync], ['zstd', zlib.zstdCompressSync]]) {
  test('bounded ' + encoding + ' public responses retain decoded UTF8/BOM behavior', async t => {
    const body = compress(Buffer.from('\ufeffpublic café'));
    const h = setup(t, { response: () => ({ body, headers: { 'content-encoding': encoding, 'content-length': String(body.length) } }) });
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.ok, true); assert.equal(result.text, 'public café');
  });
  test(encoding + ' decoded overflow is rejected even with a small declared wire size', async t => {
    const body = compress(Buffer.from('é'.repeat(LIMIT / 2 + 1)));
    const h = setup(t, { response: () => ({ body, headers: { 'content-encoding': encoding, 'content-length': String(body.length) } }) });
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.ok, false); assert.match(result.error, /too large/);
  });
}

test('stacked standard compression stays bounded and preserves decoding order', async t => {
  const body = zlib.brotliCompressSync(zlib.gzipSync(Buffer.from('public stacked')));
  const h = setup(t, { response: () => ({ body, headers: { 'content-encoding': 'gzip, br' } }) });
  assert.equal((await h.api.createProxyFetch()('https://public.fixture.test/')).text, 'public stacked');
});

test('raw deflate, truncated gzip and empty encoded responses preserve native Fetch decoding', async t => {
  for (const spec of [
    { body: zlib.deflateRawSync(Buffer.from('public raw')), headers: { 'content-encoding': 'deflate' }, expected: 'public raw' },
    { body: zlib.gzipSync(Buffer.from('public truncated')).subarray(0, -4), headers: { 'content-encoding': 'gzip' }, expected: 'public truncated' },
    { body: Buffer.alloc(0), headers: { 'content-encoding': 'gzip' }, expected: '' },
    { body: Buffer.alloc(0), headers: { 'content-encoding': 'deflate' }, expected: '' },
  ]) {
    const h = setup(t, { response: () => spec });
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.ok, true); assert.equal(result.text, spec.expected);
  }
});

test('unknown coding disables the whole decoding chain as in native Fetch', async t => {
  for (const encoding of ['unknown', 'gzip, unknown', 'gzip, identity']) {
    const h = setup(t, { response: () => ({ body: Buffer.from('public undecoded'), headers: { 'content-encoding': encoding } }) });
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.ok, true); assert.equal(result.text, 'public undecoded');
  }
});

test('raw deflate overflow and stalled decoder input stay within stream and deadline limits', async t => {
  for (const config of [
    { response: () => ({ body: zlib.deflateRawSync(Buffer.alloc(LIMIT + 1)), headers: { 'content-encoding': 'deflate' } }) },
    { deadlineMs: 20, keepDeadlineAlive: true, response: () => ({ body: zlib.deflateRawSync(Buffer.from('late')), bodyDelay: 120, headers: { 'content-encoding': 'deflate' } }) },
    { deadlineMs: 20, keepDeadlineAlive: true, response: () => ({ chunks: [Buffer.from([0xcb]), Buffer.from([0x01, 0])], chunkDelay: 120, headers: { 'content-encoding': 'deflate' } }) },
  ]) {
    const h = setup(t, config);
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.ok, false); assert.match(result.error, /too large|timed out/);
    assert.ok(h.stats.responses.every(r => r.destroyed));
  }
});

test('an oversized intermediate compression representation is rejected even if final text is small', async t => {
  const gzipWithPadding = Buffer.concat([zlib.gzipSync(Buffer.from('small final')), Buffer.alloc(LIMIT + 1)]);
  assert.equal(zlib.gunzipSync(gzipWithPadding).toString(), 'small final');
  const body = zlib.brotliCompressSync(gzipWithPadding);
  const h = setup(t, { response: () => ({ body, headers: { 'content-encoding': 'gzip, br' } }) });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.match(result.error, /too large/);
});

test('malformed compressed bodies fail and clean up streams and abort listeners', async t => {
  for (const encoding of ['gzip', 'deflate', 'br']) {
    const h = setup(t, { response: () => ({ body: Buffer.from('malformed compressed fixture'), headers: { 'content-encoding': encoding } }) });
    assert.equal((await h.api.createProxyFetch()('https://public.fixture.test/')).ok, false);
    assert.ok(h.stats.responses.every(r => r.destroyed));
    await tick(); assert.equal(getEventListeners(h.stats.signals[0], 'abort').length, 0);
  }
});

test('oversized declared responses, excessive encoding layers and protocol upgrades are closed', async t => {
  for (const spec of [{ headers: { 'content-length': String(LIMIT + 1) } },
    { headers: { 'content-encoding': Array(6).fill('gzip').join(',') } }, { upgrade: true }]) {
    const h = setup(t, { response: () => spec });
    assert.equal((await h.api.createProxyFetch()('https://public.fixture.test/')).ok, false);
    assert.ok(h.stats.responses.every(r => r.destroyed));
    if (h.stats.upgradeSocket) assert.equal(h.stats.upgradeSocket.destroyed, true);
  }
});

test('HTTP failure status remains a diagnostic result and listeners are cleaned up', async t => {
  const h = setup(t, { response: () => ({ status: 404, body: Buffer.from('not found') }) });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.equal(result.status, 404); assert.equal(result.text, 'not found');
  await tick(); assert.equal(getEventListeners(h.stats.signals[0], 'abort').length, 0);
});

test('Fetch blocked service ports remain blocked without rejecting ordinary public web ports', async t => {
  const h = setup(t);
  for (const port of [0, 22, 25, 53, 2049, 6000, 6667, 10080]) {
    const result = await h.api.createProxyFetch()(`https://public.fixture.test:${port}/`);
    assert.equal(result.ok, false, String(port));
  }
  assert.equal(h.stats.connections.length, 0);
  assert.equal((await h.api.createProxyFetch()('http://public.fixture.test:8080/')).ok, true);
});

test('DNS is revalidated for redirected hostnames before another connection', async t => {
  const h = setup(t, { lookup: async host => [{ address: host === 'public.fixture.test' ? PUBLIC_V4 : 'fc01::1', family: host === 'public.fixture.test' ? 4 : 6 }],
    response: (_url, count) => count === 1 ? { status: 302, headers: { location: 'https://redirect.fixture.test/' } } : { body: Buffer.from('finite baseline fixture escape') } });
  const result = await h.api.createProxyFetch()('https://public.fixture.test/');
  assert.equal(result.ok, false); assert.equal(h.stats.requests.length, 1);
});

test('malformed or excessively large DNS answer sets do not reach a transport', async t => {
  for (const addresses of [[{ address: PUBLIC_V4, family: 6 }], Array(65).fill({ address: PUBLIC_V4, family: 4 })]) {
    const h = setup(t, { addresses });
    assert.equal((await h.api.createProxyFetch()('https://public.fixture.test/')).ok, false);
    assert.equal(h.stats.requests.length, 0);
  }
});

test('null-body HTTP statuses retain empty text without attempting decompression', async t => {
  for (const status of [204, 205, 304]) {
    const h = setup(t, { response: () => ({ status, headers: { 'content-encoding': 'gzip' } }) });
    const result = await h.api.createProxyFetch()('https://public.fixture.test/');
    assert.equal(result.status, status); assert.equal(result.text, ''); assert.equal(result.ok, status < 300);
    assert.ok(h.stats.responses.every(r => r.destroyed));
  }
});

test('actual route preserves HTML success when an unsafe cross-origin manifest fails', async t => {
  const h = setup(t, { manifestLink: 'http://[::ffff:127.0.0.1]/manifest.json' });
  const response = { status(code) { this.code = code; return this; }, json(value) { this.data = value; } };
  await h.loadRoute()({ body: { url: 'https://public.fixture.test/start' } }, response);
  assert.equal(response.data.success, true); assert.equal(response.data.manifest.found, false);
  assert.ok(response.data.manifest.error); assert.equal(h.stats.requests.length, 1);
  assert.equal(response.data.finalUrl, 'https://public.fixture.test/start');
});

test('actual route retains cross-origin public manifests and existing output shape', async t => {
  const h = setup(t, { manifestLink: 'https://manifest.fixture.test/app.webmanifest',
    response: url => ({ body: Buffer.from(url.hostname === 'manifest.fixture.test' ?
      JSON.stringify({ name: 'Fixture app', short_name: 'Fixture', start_url: '/', display: 'standalone' }) : '<title>Public fixture</title>') }) });
  const response = { status(code) { this.code = code; return this; }, json(value) { this.data = value; } };
  await h.loadRoute()({ body: { url: 'https://public.fixture.test/path?q=1' } }, response);
  assert.equal(response.data.success, true); assert.equal(response.data.manifest.found, true);
  assert.equal(response.data.manifest.data.name, 'Fixture app'); assert.equal(h.stats.requests.length, 2);
  assert.deepEqual(Object.keys(response.data).sort(), ['analysis', 'finalUrl', 'html', 'manifest', 'success', 'url']);
  assert.equal(response.data.analysis.domain, 'public.fixture.test');
});

test('actual route treats absent or null request bodies as missing URLs', async t => {
  const h = setup(t);
  for (const body of [undefined, null, {}, { url: 42 }]) {
    const response = { status(code) { this.code = code; return this; }, json(value) { this.data = value; } };
    await h.loadRoute()({ body }, response);
    assert.equal(response.code, 400); assert.equal(response.data.error, 'URL is required');
  }
  assert.equal(h.stats.requests.length, 0);
});

test('owned HTTP fixture uses the actual Node socket lookup and preserves Host, port, query and gzip decoding', async t => {
  let observed;
  const server = http.createServer((req, res) => {
    observed = { host: req.headers.host, url: req.url };
    res.writeHead(200, { 'content-encoding': 'gzip' });
    res.end(zlib.gzipSync(Buffer.from('owned local fixture')));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const port = server.address().port;
  const h = setup(t, { localPort: port });
  const result = await h.api.createProxyFetch()(`http://public.fixture.test:${port}/path?q=1`);
  assert.equal(result.ok, true); assert.equal(result.text, 'owned local fixture');
  assert.deepEqual(observed, { host: `public.fixture.test:${port}`, url: '/path?q=1' });
  if (!baseline) assert.deepEqual(plain(h.stats.connections), [{ address: PUBLIC_V4, family: 4 }]);
});

test('owned HTTP responses confirm native Fetch and the replacement agree on coding compatibility', async t => {
  const cases = [
    ['deflate', zlib.deflateRawSync(Buffer.from('raw fixture')), 'raw fixture'],
    ['gzip', zlib.gzipSync(Buffer.from('truncated fixture')).subarray(0, -4), 'truncated fixture'],
    ['gzip', Buffer.alloc(0), ''],
    ['gzip, unknown', Buffer.from('raw unknown fixture'), 'raw unknown fixture'],
    ['zstd', zlib.zstdCompressSync(Buffer.from('zstd fixture')), 'zstd fixture'],
  ];
  const server = http.createServer((req, res) => {
    const [encoding, body] = cases[Number(req.url.slice(1))];
    res.writeHead(200, { 'content-encoding': encoding }); res.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const port = server.address().port;
  for (let i = 0; i < cases.length; i++) {
    const native = await fetch(`http://127.0.0.1:${port}/${i}`);
    assert.equal(await native.text(), cases[i][2]);
    const h = setup(t, { localPort: port });
    const result = await h.api.createProxyFetch()(`http://public.fixture.test:${port}/${i}`);
    assert.equal(result.ok, true); assert.equal(result.text, cases[i][2]);
  }
});
