import type { ScanResult, AnalysisResult, DetectedValue, IconCandidate, ReadinessItem } from '@/lib/analysis-types';

const API_BASE = '/api';

export async function scanWebsite(url: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/proxy-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

function inferPackageId(domain: string): string {
  const parts = domain.split('.').filter(p => p !== 'www');
  if (parts.length >= 2) {
    return parts.reverse().join('.').replace(/[^a-zA-Z0-9.]/g, '_');
  }
  return '';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
}

export function buildSiteAnalysis(scan: ScanResult): AnalysisResult {
  const values: DetectedValue[] = [];
  const icons: IconCandidate[] = [];
  const readiness: ReadinessItem[] = [];
  const missingCritical: string[] = [];
  const recommendations: string[] = [];

  if (scan.manifest.data?.name) {
    values.push({ field: 'appName', label: 'App Name', value: scan.manifest.data.name, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → name', approved: true });
  } else if (scan.html.title) {
    values.push({ field: 'appName', label: 'App Name', value: scan.html.title, confidence: 'medium', status: 'inferred', source: 'html-title', sourceDetail: '<title> tag', approved: true });
  } else {
    values.push({ field: 'appName', label: 'App Name', value: '', confidence: 'low', status: 'missing', source: 'manual', sourceDetail: 'Not detected', approved: false });
    missingCritical.push('App name could not be detected');
  }

  if (scan.manifest.data?.short_name) {
    values.push({ field: 'shortName', label: 'Short Name', value: scan.manifest.data.short_name, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → short_name', approved: true });
  } else if (scan.analysis.probableAppName) {
    const short = scan.analysis.probableAppName.substring(0, 12);
    values.push({ field: 'shortName', label: 'Short Name', value: short, confidence: 'low', status: 'inferred', source: 'html-title', sourceDetail: 'Truncated from app name', approved: false });
  } else {
    values.push({ field: 'shortName', label: 'Short Name', value: '', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  values.push({ field: 'domain', label: 'Domain', value: scan.analysis.domain, confidence: 'high', status: 'detected', source: 'url-inference', sourceDetail: 'From scanned URL', approved: true });
  values.push({ field: 'baseUrl', label: 'Base URL', value: '/', confidence: 'medium', status: 'inferred', source: 'url-inference', approved: true });

  if (scan.manifest.url) {
    values.push({ field: 'manifestUrl', label: 'Manifest URL', value: scan.manifest.url, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: '<link rel="manifest">', approved: true });
  } else {
    values.push({ field: 'manifestUrl', label: 'Manifest URL', value: scan.analysis.baseUrl + 'manifest.json', confidence: 'low', status: 'inferred', source: 'url-inference', sourceDetail: 'Default path assumed', approved: false });
    recommendations.push('Add a <link rel="manifest" href="/manifest.json"> to your HTML');
  }

  if (scan.manifest.data?.start_url) {
    values.push({ field: 'startUrl', label: 'Start URL', value: scan.manifest.data.start_url, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → start_url', approved: true });
  } else {
    values.push({ field: 'startUrl', label: 'Start URL', value: '/', confidence: 'medium', status: 'inferred', source: 'url-inference', approved: true });
  }

  const packageId = inferPackageId(scan.analysis.domain);
  if (packageId) {
    values.push({ field: 'packageId', label: 'Package ID', value: packageId, confidence: 'low', status: 'inferred', source: 'domain-slug', sourceDetail: `Derived from domain: ${scan.analysis.domain}`, approved: false });
  } else {
    values.push({ field: 'packageId', label: 'Package ID', value: '', confidence: 'low', status: 'missing', source: 'manual', sourceDetail: 'Must be entered manually', approved: false });
    missingCritical.push('Package ID cannot be inferred and must be entered manually');
  }

  const themeColor = scan.manifest.data?.theme_color || scan.html.themeColor;
  if (themeColor) {
    values.push({ field: 'themeColor', label: 'Theme Color', value: themeColor, confidence: scan.manifest.data?.theme_color ? 'high' : 'medium', status: scan.manifest.data?.theme_color ? 'detected' : 'inferred', source: scan.manifest.data?.theme_color ? 'manifest' : 'html-meta', sourceDetail: scan.manifest.data?.theme_color ? 'manifest.json → theme_color' : '<meta name="theme-color">', approved: true });
  } else {
    values.push({ field: 'themeColor', label: 'Theme Color', value: '#000000', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  if (scan.manifest.data?.background_color) {
    values.push({ field: 'backgroundColor', label: 'Background Color', value: scan.manifest.data.background_color, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → background_color', approved: true });
  } else {
    values.push({ field: 'backgroundColor', label: 'Background Color', value: '#ffffff', confidence: 'low', status: 'missing', source: 'manual', approved: false });
  }

  const displayMode = scan.manifest.data?.display;
  if (displayMode && ['standalone', 'fullscreen', 'minimal-ui'].includes(displayMode)) {
    values.push({ field: 'displayMode', label: 'Display Mode', value: displayMode, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: 'manifest.json → display', approved: true });
  } else {
    values.push({ field: 'displayMode', label: 'Display Mode', value: 'standalone', confidence: 'medium', status: 'inferred', source: 'manual', approved: true });
  }

  if (scan.manifest.data?.orientation) {
    values.push({ field: 'orientation', label: 'Orientation', value: scan.manifest.data.orientation, confidence: 'high', status: 'detected', source: 'manifest', approved: true });
  } else {
    values.push({ field: 'orientation', label: 'Orientation', value: 'any', confidence: 'medium', status: 'inferred', source: 'manual', approved: true });
  }

  if (scan.manifest.data?.icons) {
    for (const icon of scan.manifest.data.icons) {
      const resolved = new URL(icon.src, scan.finalUrl).href;
      icons.push({ url: resolved, sizes: icon.sizes, source: 'manifest.json' });
    }
    const largestIcon = scan.manifest.data.icons.find(i => i.sizes?.includes('512x512')) || scan.manifest.data.icons[scan.manifest.data.icons.length - 1];
    if (largestIcon) {
      values.push({ field: 'launcherIconUrl', label: 'Launcher Icon', value: new URL(largestIcon.src, scan.finalUrl).href, confidence: 'high', status: 'detected', source: 'manifest', sourceDetail: `manifest.json icon (${largestIcon.sizes || 'unknown size'})`, approved: true });
    }
  }
  for (const icon of scan.html.icons) {
    icons.push({ url: icon.href, sizes: icon.sizes, source: `<link rel="${icon.rel}">` });
  }
  for (const icon of scan.html.appleTouchIcons) {
    icons.push({ url: icon.href, sizes: icon.sizes, source: 'apple-touch-icon' });
  }

  readiness.push({
    id: 'manifest-present', label: 'Web App Manifest', category: 'manifest',
    status: scan.manifest.found ? 'pass' : 'fail',
    message: scan.manifest.found ? 'Manifest found and parsed' : 'No manifest.json detected',
  });
  readiness.push({
    id: 'manifest-name', label: 'App Name in Manifest', category: 'manifest',
    status: scan.manifest.data?.name ? 'pass' : scan.html.title ? 'warn' : 'fail',
    message: scan.manifest.data?.name ? `Name: "${scan.manifest.data.name}"` : scan.html.title ? 'Name inferred from page title' : 'No app name found',
  });
  readiness.push({
    id: 'manifest-start-url', label: 'Start URL', category: 'manifest',
    status: scan.manifest.data?.start_url ? 'pass' : 'warn',
    message: scan.manifest.data?.start_url ? `start_url: "${scan.manifest.data.start_url}"` : 'No start_url in manifest',
  });
  readiness.push({
    id: 'manifest-display', label: 'Display Mode', category: 'display',
    status: scan.manifest.data?.display && ['standalone', 'fullscreen'].includes(scan.manifest.data.display) ? 'pass' : scan.manifest.data?.display === 'minimal-ui' ? 'warn' : 'fail',
    message: scan.manifest.data?.display ? `display: "${scan.manifest.data.display}"` : 'No display mode set in manifest',
  });
  readiness.push({
    id: 'icons', label: 'App Icons', category: 'icons',
    status: icons.length > 0 ? (icons.some(i => i.sizes?.includes('512x512')) ? 'pass' : 'warn') : 'fail',
    message: icons.length > 0 ? `${icons.length} icon(s) found${icons.some(i => i.sizes?.includes('512x512')) ? ' (includes 512x512)' : ' (no 512x512)'}` : 'No icons detected',
  });
  readiness.push({
    id: 'https', label: 'HTTPS', category: 'security',
    status: scan.analysis.isHttps ? 'pass' : 'fail',
    message: scan.analysis.isHttps ? 'Site served over HTTPS' : 'Site not using HTTPS — required for PWA',
  });
  readiness.push({
    id: 'service-worker', label: 'Service Worker', category: 'service-worker',
    status: scan.html.hasServiceWorkerHint ? 'pass' : 'warn',
    message: scan.html.hasServiceWorkerHint ? 'Service worker registration hints detected' : 'No service worker evidence found in page source',
  });
  readiness.push({
    id: 'theme-color', label: 'Theme Color', category: 'metadata',
    status: themeColor ? 'pass' : 'warn',
    message: themeColor ? `Theme color: ${themeColor}` : 'No theme color set',
  });
  readiness.push({
    id: 'bg-color', label: 'Background Color', category: 'metadata',
    status: scan.manifest.data?.background_color ? 'pass' : 'warn',
    message: scan.manifest.data?.background_color ? `Background: ${scan.manifest.data.background_color}` : 'No background color in manifest',
  });

  if (!scan.manifest.found) recommendations.push('Create a manifest.json with required PWA fields');
  if (!scan.html.hasServiceWorkerHint) recommendations.push('Register a service worker for offline support');
  if (icons.length === 0) recommendations.push('Add app icons in multiple sizes (at least 192x192 and 512x512)');
  if (!scan.analysis.isHttps) recommendations.push('Serve your site over HTTPS');

  return {
    mode: 'website',
    timestamp: new Date().toISOString(),
    detectedValues: values,
    iconCandidates: icons,
    readinessItems: readiness,
    installabilityScore: scan.analysis.installabilityScore,
    scanResult: scan,
    missingCritical,
    recommendations,
  };
}
