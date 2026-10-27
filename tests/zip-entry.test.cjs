const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '..', 'artifacts/pwa-play-packager/src');
const loaded = new Map();
function load(file) {
  if (loaded.has(file)) return loaded.get(file).exports;
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} }; loaded.set(file, module);
  const localRequire = name => name === 'jszip' ? JSZip : name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name);
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: localRequire, Uint8Array, TextDecoder, Promise }, { filename: file });
  return module.exports;
}
const { readZipEntry, assertSafeZipPath, MAX_ZIP_ENTRY_BYTES, MAX_ZIP_EXPANDED_BYTES } = load(path.join(root, 'services/zip-entry.ts'));
const { analyzeZip } = load(path.join(root, 'services/repoAnalysisService.ts'));
async function archive(files) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { createFolders: false });
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  bytes.size = bytes.length;
  return bytes;
}

test('real JSZip streams preserve UTF-8 content and actual byte size', async () => {
  const text = '{"name":"café evidence"}';
  const zip = await JSZip.loadAsync(await archive({ 'package.json': text }));
  const result = await readZipEntry(zip.file('package.json'), 1000, true);
  assert.equal(result.content, text);
  assert.equal(result.size, Buffer.byteLength(text));
});

test('text above the inspection cap is measured without retaining its content', async () => {
  const data = Buffer.alloc(512 * 1024 + 1, 65);
  const zip = await JSZip.loadAsync(await archive({ 'README.md': data }));
  const result = await readZipEntry(zip.file('README.md'), MAX_ZIP_EXPANDED_BYTES, true);
  assert.equal(result.size, data.length);
  assert.equal(result.content, undefined);
});

test('compressed entry expansion fails at the per-entry budget', async () => {
  const zip = await JSZip.loadAsync(await archive({ 'large.json': Buffer.alloc(MAX_ZIP_ENTRY_BYTES + 1, 65) }));
  await assert.rejects(readZipEntry(zip.file('large.json'), MAX_ZIP_EXPANDED_BYTES, true), /10 MiB/);
});

test('the remaining aggregate budget is checked before content accumulation', async () => {
  const zip = await JSZip.loadAsync(await archive({ 'small.txt': '12345678901' }));
  await assert.rejects(readZipEntry(zip.file('small.txt'), 10, true), /50 MiB/);
});

test('ZIP analyzer rejects sanitized traversal and unsafe absolute names', async () => {
  await assert.rejects(analyzeZip(await archive({ '../package.json': '{}' })), /unsafe file path/);
  for (const value of ['C:\\secrets.txt', '/etc/passwd', 'a/../b', 'a\\..\\b']) assert.throws(() => assertSafeZipPath(value), /unsafe file path/);
});

test('ZIP analyzer retains entry-count and compressed-file budgets', async () => {
  const files = Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [`file-${i}.txt`, '']));
  await assert.rejects(analyzeZip(await archive(files)), /Too many files/);
  await assert.rejects(analyzeZip({ size: 50 * 1024 * 1024 + 1 }), /File too large/);
});

test('unsupported and encrypted archive methods are rejected by the real reader', async () => {
  const original = await archive({ 'package.json': '{}' });
  for (const encrypted of [false, true]) {
    const bytes = Buffer.from(original);
    for (let i = 0; i < bytes.length - 12; i++) {
      const signature = bytes.readUInt32LE(i);
      if (signature === 0x04034b50 || signature === 0x02014b50) {
        const flagOffset = i + (signature === 0x04034b50 ? 6 : 8);
        const methodOffset = i + (signature === 0x04034b50 ? 8 : 10);
        if (encrypted) bytes.writeUInt16LE(bytes.readUInt16LE(flagOffset) | 1, flagOffset);
        else bytes.writeUInt16LE(99, methodOffset);
      }
    }
    bytes.size = bytes.length;
    await assert.rejects(analyzeZip(bytes), encrypted ? /Encrypted zip/ : /compression/);
  }
});

test('ordinary project analysis measures actual expanded bytes and preserves detection', async () => {
  const manifest = JSON.stringify({ name: 'Synthetic project', start_url: '/', display: 'standalone', icons: [] });
  const packageJson = '{"name":"synthetic","dependencies":{"vite":"1"}}';
  const result = await analyzeZip(await archive({ 'project/manifest.json': manifest, 'project/package.json': packageJson }));
  assert.equal(result.totalSize, Buffer.byteLength(manifest) + Buffer.byteLength(packageJson));
  assert.equal(result.manifestData.name, 'Synthetic project');
});
