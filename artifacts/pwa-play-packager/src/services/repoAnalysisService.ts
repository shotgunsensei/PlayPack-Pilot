import JSZip from 'jszip';
import type { RepoAnalysisResult, RepoFile, AnalysisResult, DetectedValue, IconCandidate, ReadinessItem } from '@/lib/analysis-types';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 5000;
const TEXT_EXTENSIONS = ['.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.md', '.txt', '.yml', '.yaml', '.xml', '.toml', '.env', '.config', '.mjs', '.cjs'];
const ICON_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];

const RELEVANT_PATTERNS: Array<{ pattern: RegExp; category: RepoFile['category'] }> = [
  { pattern: /manifest\.json$/i, category: 'manifest' },
  { pattern: /manifest\.webmanifest$/i, category: 'manifest' },
  { pattern: /package\.json$/i, category: 'package' },
  { pattern: /vite\.config\./i, category: 'config' },
  { pattern: /next\.config\./i, category: 'config' },
  { pattern: /nuxt\.config\./i, category: 'config' },
  { pattern: /webpack\.config\./i, category: 'config' },
  { pattern: /angular\.json$/i, category: 'config' },
  { pattern: /service[-_]?worker/i, category: 'service-worker' },
  { pattern: /sw\.(js|ts)$/i, category: 'service-worker' },
  { pattern: /workbox/i, category: 'service-worker' },
  { pattern: /readme/i, category: 'readme' },
  { pattern: /\.(png|jpg|jpeg|svg|ico|webp)$/i, category: 'icon' },
];

const FRAMEWORK_DETECTORS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: 'Next.js', patterns: [/next\.config/, /next\//, /"next"/] },
  { name: 'Vite + React', patterns: [/vite\.config/, /"@vitejs\/plugin-react"/] },
  { name: 'Create React App', patterns: [/"react-scripts"/, /react-app-rewired/] },
  { name: 'Vue (Vite)', patterns: [/vite\.config/, /"@vitejs\/plugin-vue"/] },
  { name: 'Nuxt', patterns: [/nuxt\.config/, /"nuxt"/] },
  { name: 'Angular', patterns: [/angular\.json/, /"@angular\/core"/] },
  { name: 'SvelteKit', patterns: [/svelte\.config/, /"@sveltejs\/kit"/] },
  { name: 'Remix', patterns: [/"@remix-run\//, /remix\.config/] },
  { name: 'Gatsby', patterns: [/gatsby-config/, /"gatsby"/] },
];

function isIconPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (!ICON_EXTENSIONS.some(ext => lower.endsWith(ext))) return false;
  return /icon|logo|favicon|touch|launcher/i.test(lower) || /public\//i.test(lower);
}

export async function analyzeZip(file: File): Promise<RepoAnalysisResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 50MB.`);
  }

  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files);

  if (entries.length > MAX_FILES) {
    throw new Error(`Too many files (${entries.length}). Maximum is ${MAX_FILES}.`);
  }

  const repoFiles: RepoFile[] = [];
  let totalSize = 0;
  let manifestData: Record<string, unknown> | undefined;
  let packageJsonData: Record<string, unknown> | undefined;
  let readmeContent: string | undefined;
  const serviceWorkerPaths: string[] = [];
  const iconPaths: string[] = [];

  let rootPrefix = '';
  const allPaths = entries.map(([p]) => p);
  const topDirs = new Set(allPaths.map(p => p.split('/')[0]));
  if (topDirs.size === 1) {
    const single = [...topDirs][0];
    if (entries.some(([p]) => p.startsWith(single + '/'))) {
      rootPrefix = single + '/';
    }
  }

  for (const [path, zipEntry] of entries) {
    if (zipEntry.dir) continue;

    const relativePath = rootPrefix ? path.replace(rootPrefix, '') : path;
    if (!relativePath || relativePath.startsWith('.git/') || relativePath.includes('node_modules/')) continue;

    const size = zipEntry._data?.uncompressedSize || 0;
    totalSize += size;

    const matchedCategory = RELEVANT_PATTERNS.find(p => p.pattern.test(relativePath));
    const relevant = !!matchedCategory || isIconPath(relativePath);

    const repoFile: RepoFile = {
      path: relativePath,
      size,
      isDirectory: false,
      relevant,
      category: matchedCategory?.category || (isIconPath(relativePath) ? 'icon' : undefined),
    };

    if (relevant && TEXT_EXTENSIONS.some(ext => relativePath.toLowerCase().endsWith(ext)) && size < 512 * 1024) {
      try {
        repoFile.content = await zipEntry.async('string');
      } catch {}
    }

    repoFiles.push(repoFile);

    if (/service[-_]?worker|sw\.(js|ts)$/i.test(relativePath)) {
      serviceWorkerPaths.push(relativePath);
    }
    if (isIconPath(relativePath)) {
      iconPaths.push(relativePath);
    }
  }

  const manifestFile = repoFiles.find(f => f.category === 'manifest' && f.content);
  if (manifestFile?.content) {
    try {
      manifestData = JSON.parse(manifestFile.content);
    } catch {}
  }

  const packageFile = repoFiles.find(f => f.path === 'package.json' && f.content);
  if (packageFile?.content) {
    try {
      packageJsonData = JSON.parse(packageFile.content);
    } catch {}
  }

  const readmeFile = repoFiles.find(f => f.category === 'readme' && f.content);
  if (readmeFile?.content) {
    readmeContent = readmeFile.content.substring(0, 2000);
  }

  let detectedFramework: string | undefined;
  let frameworkConfidence: 'high' | 'medium' | 'low' = 'low';
  const allContent = repoFiles.filter(f => f.content).map(f => f.content).join('\n');
  for (const detector of FRAMEWORK_DETECTORS) {
    const matches = detector.patterns.filter(p => p.test(allContent)).length;
    if (matches >= 2) {
      detectedFramework = detector.name;
      frameworkConfidence = 'high';
      break;
    } else if (matches === 1 && !detectedFramework) {
      detectedFramework = detector.name;
      frameworkConfidence = 'medium';
    }
  }

  let publicDir: string | undefined;
  const publicDirCandidates = ['public/', 'static/', 'dist/', 'build/', 'src/assets/'];
  for (const dir of publicDirCandidates) {
    if (repoFiles.some(f => f.path.startsWith(dir))) {
      publicDir = dir.replace(/\/$/, '');
      break;
    }
  }

  return {
    files: repoFiles,
    totalFiles: repoFiles.length,
    totalSize,
    detectedFramework,
    frameworkConfidence,
    publicDir,
    manifestFound: !!manifestData,
    manifestData,
    packageJsonFound: !!packageJsonData,
    packageJsonData,
    serviceWorkerFound: serviceWorkerPaths.length > 0,
    serviceWorkerPaths,
    iconPaths,
    readmeContent,
  };
}

export function buildRepoAnalysis(repo: RepoAnalysisResult): AnalysisResult {
  const values: DetectedValue[] = [];
  const icons: IconCandidate[] = [];
  const readiness: ReadinessItem[] = [];
  const missingCritical: string[] = [];
  const recommendations: string[] = [];

  const manifest = repo.manifestData as Record<string, unknown> | undefined;
  const pkg = repo.packageJsonData as Record<string, unknown> | undefined;

  const appName = (manifest?.name as string) || (pkg?.name as string) || '';
  if (manifest?.name) {
    values.push({ field: 'appName', label: 'App Name', value: manifest.name as string, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → name', approved: true });
  } else if (pkg?.name) {
    values.push({ field: 'appName', label: 'App Name', value: pkg.name as string, confidence: 'medium', status: 'inferred', source: 'package-json', sourceDetail: 'package.json → name', approved: true });
  } else {
    values.push({ field: 'appName', label: 'App Name', value: '', confidence: 'low', status: 'missing', source: 'manual', approved: false });
    missingCritical.push('App name not found in manifest or package.json');
  }

  if (manifest?.short_name) {
    values.push({ field: 'shortName', label: 'Short Name', value: manifest.short_name as string, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else if (appName) {
    values.push({ field: 'shortName', label: 'Short Name', value: appName.substring(0, 12), confidence: 'low', status: 'inferred', source: 'package-json', sourceDetail: 'Truncated from app name', approved: false });
  } else {
    values.push({ field: 'shortName', label: 'Short Name', value: '', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  const homepage = (pkg?.homepage as string) || '';
  if (homepage) {
    try {
      const url = new URL(homepage);
      values.push({ field: 'domain', label: 'Domain', value: url.hostname, confidence: 'medium', status: 'inferred', source: 'package-json', sourceDetail: 'package.json → homepage', approved: true });
    } catch {
      values.push({ field: 'domain', label: 'Domain', value: '', confidence: 'low', status: 'missing', source: 'manual', approved: false });
    }
  } else {
    values.push({ field: 'domain', label: 'Domain', value: '', confidence: 'low', status: 'missing', source: 'manual', sourceDetail: 'No homepage in package.json', approved: false });
    missingCritical.push('Domain could not be detected');
  }

  values.push({ field: 'baseUrl', label: 'Base URL', value: '/', confidence: 'medium', status: 'inferred', source: 'repo-file', approved: true });

  if (manifest?.start_url) {
    values.push({ field: 'startUrl', label: 'Start URL', value: manifest.start_url as string, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else {
    values.push({ field: 'startUrl', label: 'Start URL', value: '/', confidence: 'medium', status: 'inferred', source: 'manual', approved: true });
  }

  values.push({ field: 'packageId', label: 'Package ID', value: '', confidence: 'low', status: 'missing', source: 'manual', sourceDetail: 'Must be entered manually', approved: false });
  missingCritical.push('Package ID must be entered manually');

  if (manifest?.theme_color) {
    values.push({ field: 'themeColor', label: 'Theme Color', value: manifest.theme_color as string, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else {
    values.push({ field: 'themeColor', label: 'Theme Color', value: '#000000', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  if (manifest?.background_color) {
    values.push({ field: 'backgroundColor', label: 'Background Color', value: manifest.background_color as string, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else {
    values.push({ field: 'backgroundColor', label: 'Background Color', value: '#ffffff', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  const display = (manifest?.display as string) || '';
  if (display && ['standalone', 'fullscreen', 'minimal-ui'].includes(display)) {
    values.push({ field: 'displayMode', label: 'Display Mode', value: display, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else {
    values.push({ field: 'displayMode', label: 'Display Mode', value: 'standalone', confidence: 'medium', status: 'inferred', source: 'manual', approved: true });
  }

  values.push({ field: 'orientation', label: 'Orientation', value: (manifest?.orientation as string) || 'any', confidence: manifest?.orientation ? 'high' : 'medium', status: manifest?.orientation ? 'detected' : 'inferred', source: manifest?.orientation ? 'manifest' : 'manual', approved: true });

  if (manifest?.icons && Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons as Array<{ src: string; sizes?: string }>) {
      icons.push({ url: icon.src, sizes: icon.sizes, source: 'manifest.json' });
    }
  }
  for (const path of repo.iconPaths) {
    icons.push({ url: path, source: `repo: ${path}` });
  }

  readiness.push({
    id: 'manifest-present', label: 'Web App Manifest', category: 'manifest',
    status: repo.manifestFound ? 'pass' : 'fail',
    message: repo.manifestFound ? 'manifest.json found in project' : 'No manifest.json found',
  });
  readiness.push({
    id: 'package-json', label: 'Package Configuration', category: 'manifest',
    status: repo.packageJsonFound ? 'pass' : 'warn',
    message: repo.packageJsonFound ? 'package.json found' : 'No package.json found',
  });
  readiness.push({
    id: 'framework', label: 'Framework Detection', category: 'manifest',
    status: repo.detectedFramework ? 'pass' : 'warn',
    message: repo.detectedFramework ? `Detected: ${repo.detectedFramework} (${repo.frameworkConfidence} confidence)` : 'Could not determine framework',
  });
  readiness.push({
    id: 'service-worker', label: 'Service Worker', category: 'service-worker',
    status: repo.serviceWorkerFound ? 'pass' : 'warn',
    message: repo.serviceWorkerFound ? `Found: ${repo.serviceWorkerPaths.join(', ')}` : 'No service worker files detected',
  });
  readiness.push({
    id: 'icons', label: 'App Icons', category: 'icons',
    status: repo.iconPaths.length > 0 ? 'pass' : 'warn',
    message: repo.iconPaths.length > 0 ? `${repo.iconPaths.length} icon file(s) found` : 'No icon files detected in project',
  });

  if (!repo.manifestFound) recommendations.push('Create a manifest.json in your public directory');
  if (!repo.serviceWorkerFound) recommendations.push('Add a service worker for offline capability');
  if (repo.iconPaths.length === 0) recommendations.push('Add app icons (192x192 and 512x512 PNG)');

  return {
    mode: 'repo',
    timestamp: new Date().toISOString(),
    detectedValues: values,
    iconCandidates: icons,
    readinessItems: readiness,
    installabilityScore: readiness.filter(r => r.status === 'pass').length * 20,
    repoResult: repo,
    missingCritical,
    recommendations,
  };
}
