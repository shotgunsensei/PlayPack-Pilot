const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(process.env.PLAYPACK_SOURCE_ROOT || path.join(__dirname, '..'));
const src = path.join(root, 'artifacts/pwa-play-packager/src');
const signing = {
  keystoreFilename: 'owned-upload.keystore', keyAlias: 'owned-upload',
  sha256Fingerprint: Array(32).fill('AB').join(':'),
  storePassword: 'synthetic-store-password', keyPassword: 'synthetic-key-password',
  keystoreBase64: 'synthetic-private-keystore-material',
};
const project = {
  appName: 'Synthetic review app', shortName: 'Review', domain: 'example.com',
  baseUrl: 'https://example.com', manifestUrl: 'https://example.com/manifest.json',
  startUrl: '/', packageId: 'com.example.review', themeColor: '#112233',
  backgroundColor: '#ffffff', orientation: 'any', displayMode: 'standalone',
  launcherIconUrl: '/icon.png', monochromeIconUrl: '', versionCode: 2, versionName: '1.0.1',
};
const privateMarkers = [signing.storePassword, signing.keyPassword, signing.keystoreBase64];

function element(type, props) { return { type, props: props || {} }; }
function makeLoader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length || 0, 0);
    const module = { exports: {} }; cache.set(file, module);
    const localRequire = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
      if (name.startsWith('.') || name.startsWith('@/')) {
        let target = name.startsWith('@/') ? path.join(src, name.slice(2)) : path.resolve(path.dirname(file), name);
        if (!path.extname(target)) target += fs.existsSync(target + '.ts') ? '.ts' : '.tsx';
        return load(target);
      }
      throw new Error('Unexpected dependency in isolated source test: ' + name);
    };
    vm.runInNewContext(result.outputText, { module, exports: module.exports, require: localRequire,
      console, Blob, TextEncoder, btoa, URL, ...globals }, { filename: file });
    return module.exports;
  }
  return load;
}
const generators = () => makeLoader()(path.join(src, 'lib/generators.ts'));

function renderPage(name, state = {}, selectedShell = 'bash', moreOverrides = {}) {
  const react = { useState: value => [value === 'bash' ? selectedShell : value, () => {}],
    useMemo: fn => fn() };
  const overrides = {
    react, 'framer-motion': { motion: { div: 'motion.div' } },
    '@/lib/store': { useAppStore: () => ({ project, signing, checklist: {}, ...state }) },
    '@/components/ui/card': { Card: 'Card' }, '@/components/ui/checkbox': { Checkbox: 'Checkbox' },
    '@/components/ui/button': { Button: 'Button' }, '@/components/CommandBlock': { CommandBlock: 'CommandBlock' },
    'lucide-react': new Proxy({}, { get: (_, key) => String(key) }),
    '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
    '@/lib/export-helpers': { copyToClipboard() {}, downloadFile() {}, downloadCompleteZip() {} },
    wouter: { useLocation: () => ['', () => {}] }, ...moreOverrides,
  };
  return makeLoader(overrides)(path.join(src, 'pages', name + '.tsx')).default();
}
function nodes(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { tree.forEach(x => nodes(x, predicate, out)); return out; }
  if (predicate(tree)) out.push(tree);
  nodes(tree.props?.children, predicate, out); return out;
}
function checkNoPrivate(value) { for (const marker of privateMarkers) assert.equal(JSON.stringify(value).includes(marker), false); }

test('manifest and digital asset links preserve the selected public configuration', () => {
  const g = generators(); const m = JSON.parse(g.generateManifest(project));
  assert.equal(m.name, project.appName); assert.equal(m.start_url, '/');
  const links = JSON.parse(g.generateAssetLinks(project.packageId, signing.sha256Fingerprint));
  assert.equal(links[0].target.package_name, project.packageId);
  assert.equal(links[0].target.sha256_cert_fingerprints[0], signing.sha256Fingerprint);
});
test('workflow pins the verified hosted-runner artifact action and limits upload to the AAB', () => {
  const w = generators().generateGithubWorkflow(project);
  assert.match(w, /actions\/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9/);
  assert.match(w, /path: app\/app-release-bundle\.aab\n/);
  assert.match(w, /if-no-files-found: error\n/); assert.match(w, /include-hidden-files: false\n/);
  assert.doesNotMatch(w, /upload-artifact@v3|path:.*\*|continue-on-error/);
});
test('workflow preserves supported signing env bindings without unsupported password CLI flags or key generation', () => {
  const w = generators().generateGithubWorkflow(project);
  assert.match(w, /BUBBLEWRAP_KEYSTORE_PASSWORD: \$\{\{ secrets\.ANDROID_KEYSTORE_PASSWORD \}\}/);
  assert.match(w, /BUBBLEWRAP_KEY_PASSWORD: \$\{\{ secrets\.ANDROID_KEY_PASSWORD \}\}/);
  assert.match(w, /test -f app\/twa-manifest\.json/); assert.match(w, /test -f app\/manifest-checksum\.txt/);
  assert.match(w, /if: always\(\)/); assert.match(w, /printf '%s' "\$ANDROID_KEYSTORE_BASE64"/);
  assert.doesNotMatch(w, /--keyStorePassword|--keyPassword|--keyStore=|--alias=|bubblewrap init|genkeypair/);
  checkNoPrivate(w);
});

test('generated project preflight accepts a matching reviewed manifest and rejects changed manifests and signing identity', () => {
  const w = generators().generateGithubWorkflow(project);
  const script = w.match(/          node <<'NODE'\n([\s\S]*?)          NODE\n/)[1].replace(/^          /gm, '');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'playpack-preflight-'));
  try {
    fs.mkdirSync(path.join(temp, 'app'));
    const run = (config, checksumOverride, alias = signing.keyAlias) => {
      const manifest = JSON.stringify(config);
      fs.writeFileSync(path.join(temp, 'app/twa-manifest.json'), manifest);
      fs.writeFileSync(path.join(temp, 'app/manifest-checksum.txt'), checksumOverride ?? crypto.createHash('sha1').update(manifest).digest('hex'));
      return spawnSync(process.execPath, ['-e', script], { cwd: temp, encoding: 'utf8', env: { ...process.env, ANDROID_KEY_ALIAS: alias } });
    };
    const config = { signingKey: { path: '../android.keystore', alias: signing.keyAlias } };
    assert.equal(run(config).status, 0);
    assert.notEqual(run(config, 'stale-checksum').status, 0);
    assert.notEqual(run({ signingKey: { ...config.signingKey, path: 'unexpected.keystore' } }).status, 0);
    assert.notEqual(run(config, undefined, 'wrong-alias').status, 0);
    assert.notEqual(run(config, undefined, '').status, 0);
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('playpack-preflight-'));
    fs.rmSync(temp, { recursive: true });
  }
});
test('untrusted project text cannot become workflow YAML, GitHub expressions or shell commands', () => {
  const malicious = 'https://example.com/"; printf injected\n${{secrets.ANDROID_KEY_PASSWORD}}$(printf injected)`printf injected`';
  const g = generators(); assert.equal(g.generateGithubWorkflow({ ...project, manifestUrl: malicious }), g.generateGithubWorkflow(project));
});
test('checklist and deployment guide replace the removed PWA score with manual device acceptance', () => {
  const g = generators(); const c = g.generateReleaseChecklist(); const sop = g.generateDeploymentSop(project, signing);
  assert.doesNotMatch(c + sop, /Lighthouse PWA (score is passing|check passes|audit and ensure passing score)/);
  assert.match(c, /Installed in supported Chrome/); assert.match(c, /Offline fallback, reconnect, and service-worker update/);
  assert.match(c, /manual acceptance/i); assert.match(sop, /https:\/\/www\.npmjs\.com\/package\/@bubblewrap\/cli/);
  assert.doesNotMatch(sop, /@nickersk/);
});
test('release notes do not claim offline functionality supplied merely by packaging', () => {
  const notes = generators().generateReleaseNotes(project);
  assert.doesNotMatch(notes, /Full offline support|with full offline support|works even when you're offline/);
  assert.match(notes, /Packaging alone does not add offline support/);
});

test('exported Markdown keeps adversarial command text inside a single code fence', () => {
  const weird = "https://example.com/a'\n```\n$(printf injected);`printf injected`";
  const g = generators();
  const readme = g.generateReadme({ ...project, manifestUrl: weird });
  const body = readme.slice(readme.indexOf('````bash\n') + '````bash\n'.length, readme.lastIndexOf('\n````'));
  assert.match(readme, /````bash\n[\s\S]*\n````/);
  assert.equal((readme.match(/^````/gm) || []).length, 2);
  const commands = makeLoader()(path.join(src, 'lib/build-commands.ts')).generateLocalBuildSteps({ ...project, manifestUrl: weird }, signing);
  assert.ok(body.includes(commands[1].bash));
  assert.doesNotMatch(JSON.stringify(g.generateReleaseKitFiles(project, signing)), /genkeypair/);
});
test('retired and unknown checklist keys cannot mark current manual checks complete', () => {
  const tree = renderPage('ReleaseChecklist', { checklist: { 'pwa-lighthouse': true, unknown: true, 'pwa-manifest': 'true' } });
  const progress = nodes(tree, n => Array.isArray(n.props?.children) && n.props.children[1] === '% Complete');
  assert.equal(progress.length, 1); assert.equal(progress[0].props.children[0], 0);
  const checkboxes = nodes(tree, n => n.type === 'Checkbox'); assert.equal(checkboxes.filter(n => n.props.checked).length, 0);
});
test('all current checks complete exactly 100 percent while imported extra keys have no effect', () => {
  const g = makeLoader()(path.join(src, 'lib/release-checklist.ts'));
  const checklist = Object.fromEntries(g.releaseChecklistGroups.flatMap(x => x.items).map(x => [x.id, true]));
  checklist.unknown = true; checklist['pwa-lighthouse'] = true;
  const result = g.getReleaseChecklistProgress(checklist); assert.equal(result.progress, 100);
  assert.equal(result.completedItems, result.totalItems);
});
for (const shell of ['bash', 'powershell']) {
  test(`actual ${shell} UI commands preserve quotes, newlines and metacharacters as literal arguments`, {
    skip: shell === 'powershell' && process.platform !== 'win32' ? 'Windows PowerShell is not available on this platform' : false,
  }, () => {
    const weird = `https://example.com/a'"\n$(printf injected)\x60printf injected\x60;$([string]::Join('', 'x', 'y'))`;
    const tree = renderPage('BubblewrapBuild', { project: { ...project, manifestUrl: weird }, signing: { ...signing, keystoreFilename: weird, keyAlias: weird } }, shell);
    const commands = nodes(tree, n => n.type === 'CommandBlock').map(n => n.props.command);
    assert.equal(commands.length, 5);
    if (shell === 'bash') {
      const prelude = 'bubblewrap() { printf "%s\\0" "$@"; }; keytool() { printf "%s\\0" "$@"; }; jarsigner() { printf "%s\\0" "$@"; };\n';
      const result = spawnSync(process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash', ['--noprofile', '--norc', '-c', prelude + commands[1] + '\n' + commands[4]], { encoding: 'utf8' });
      assert.equal(result.status, 0); assert.deepEqual(result.stdout.split('\0').filter(Boolean), ['init', '--manifest=' + weird, '-list', '-v', '-keystore', weird, '-alias', weird]);
    } else {
      const prelude = 'function bubblewrap { ConvertTo-Json -InputObject @($args) -Compress }; function keytool { ConvertTo-Json -InputObject @($args) -Compress }; function jarsigner { ConvertTo-Json -InputObject @($args) -Compress };\n';
      const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', prelude + commands[1] + '\n' + commands[4]], { encoding: 'utf8' });
      assert.equal(result.status, 0);
      assert.deepEqual(result.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line)), [['init', '--manifest=' + weird], ['-list', '-v', '-keystore', weird, '-alias', weird]]);
    }
    checkNoPrivate(commands);
  });
}
test('release kit files omit passwords and unknown signing material but retain public metadata', () => {
  const files = generators().generateReleaseKitFiles(project, signing);
  assert.equal(Object.keys(files).length, 10); checkNoPrivate(files);
  const config = JSON.parse(files['pwa-packager-config.json']);
  assert.deepEqual(Object.keys(config.signing).sort(), ['keyAlias', 'keystoreFilename', 'sha256Fingerprint']);
  assert.equal(config.signing.sha256Fingerprint, signing.sha256Fingerprint);
  assert.match(files['.github/workflows/android-build.yml'], /if-no-files-found: error/);
});
test('actual ZIP export passes exactly the reviewed file map to its archive writer', async () => {
  let archive; let downloaded = false;
  class ZipRecorder {
    constructor() { archive = this; this.entries = {}; }
    file(name, content) { this.entries[name] = content; return this; }
    folder(name) { return { file: (file, content) => this.file(name + '/' + file, content) }; }
    async generateAsync(options) { assert.equal(options.type, 'blob'); return new Blob(['synthetic archive writer']); }
  }
  const load = makeLoader({ jszip: { __esModule: true, default: ZipRecorder } }, {
    URL: { createObjectURL() { return 'blob:synthetic'; }, revokeObjectURL() {} },
    document: { createElement() { return { click() { downloaded = true; } }; }, body: { appendChild() {}, removeChild() {} } },
  });
  await load(path.join(src, 'lib/export-helpers.ts')).downloadCompleteZip(project, signing);
  const expected = generators().generateReleaseKitFiles(project, signing);
  assert.deepEqual(JSON.parse(JSON.stringify(archive.entries)), JSON.parse(JSON.stringify(expected)));
  checkNoPrivate(archive.entries); assert.equal(downloaded, true);
});
test('individual config download excludes passwords and unknown signing material', () => {
  let downloaded;
  const tree = renderPage('FileExport', { isProUser: true }, 'bash', {
    '@/lib/export-helpers': { downloadFile: (name, content) => { downloaded = { name, content }; } },
  });
  const button = nodes(tree, n => n.props?.['data-testid'] === 'button-download-pwa-packager-config.json')[0];
  button.props.onClick(); checkNoPrivate(downloaded);
  assert.equal(JSON.parse(downloaded.content).signing.keystoreFilename, signing.keystoreFilename);
});
test('baseline store persistence and project export continue removing the two named password fields', () => {
  const effects = []; let persisted;
  const data = { _version: 2, user: null, activeProjectId: 'synthetic', preferences: {},
    projects: [{ id: 'synthetic', project, signing, checklist: {} }] };
  const react = { createContext: () => ({ Provider: 'Provider' }), useContext() {},
    useState: init => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: effect => effects.push(effect), useCallback: fn => fn };
  const load = makeLoader({ react: { ...react, __esModule: true, default: react } }, {
    localStorage: { getItem: () => JSON.stringify(data), setItem: (_, value) => { persisted = value; } },
  });
  const provider = load(path.join(src, 'lib/store.tsx')).AppProvider({ children: null });
  const exported = provider.props.value.exportProject('synthetic'); effects.forEach(fn => fn());
  for (const marker of [signing.storePassword, signing.keyPassword]) {
    assert.equal(exported.includes(marker), false);
    assert.equal(persisted.includes(marker), false);
  }
  assert.equal(JSON.parse(exported).signing.keystoreFilename, signing.keystoreFilename);
});
