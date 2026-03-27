export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DetectionStatus = 'detected' | 'inferred' | 'missing';
export type AnalysisSource = 'manifest' | 'html-meta' | 'html-title' | 'html-icon' | 'package-json' | 'repo-file' | 'url-inference' | 'domain-slug' | 'manual';

export interface DetectedValue {
  field: string;
  label: string;
  value: string;
  confidence: ConfidenceLevel;
  status: DetectionStatus;
  source: AnalysisSource;
  sourceDetail?: string;
  approved: boolean;
}

export interface IconCandidate {
  url: string;
  sizes?: string;
  source: string;
}

export interface ReadinessItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  category: 'manifest' | 'icons' | 'security' | 'service-worker' | 'display' | 'metadata';
}

export interface ScanResult {
  url: string;
  finalUrl: string;
  success: boolean;
  error?: string;
  html: {
    title?: string;
    description?: string;
    themeColor?: string;
    manifestLink?: string;
    icons: Array<{ href: string; rel: string; sizes?: string }>;
    appleTouchIcons: Array<{ href: string; sizes?: string }>;
    hasServiceWorkerHint: boolean;
    serviceWorkerHints: string[];
    ogImage?: string;
    viewport?: string;
    lang?: string;
  };
  manifest: {
    found: boolean;
    url?: string;
    data?: {
      name?: string;
      short_name?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      theme_color?: string;
      background_color?: string;
      icons?: Array<{ src: string; sizes?: string; type?: string }>;
      orientation?: string;
      description?: string;
      [key: string]: unknown;
    };
    error?: string;
  };
  analysis: {
    isHttps: boolean;
    domain: string;
    baseUrl: string;
    probableAppName?: string;
    probableShortName?: string;
    installabilityScore: number;
    installabilityNotes: string[];
  };
}

export interface RepoFile {
  path: string;
  size: number;
  isDirectory: boolean;
  content?: string;
  relevant: boolean;
  category?: 'manifest' | 'config' | 'icon' | 'service-worker' | 'readme' | 'package' | 'other';
}

export interface RepoAnalysisResult {
  files: RepoFile[];
  totalFiles: number;
  totalSize: number;
  detectedFramework?: string;
  frameworkConfidence: ConfidenceLevel;
  publicDir?: string;
  manifestFound: boolean;
  manifestData?: Record<string, unknown>;
  packageJsonFound: boolean;
  packageJsonData?: Record<string, unknown>;
  serviceWorkerFound: boolean;
  serviceWorkerPaths: string[];
  iconPaths: string[];
  readmeContent?: string;
}

export interface AnalysisResult {
  mode: 'website' | 'repo';
  timestamp: string;
  detectedValues: DetectedValue[];
  iconCandidates: IconCandidate[];
  readinessItems: ReadinessItem[];
  installabilityScore: number;
  scanResult?: ScanResult;
  repoResult?: RepoAnalysisResult;
  missingCritical: string[];
  recommendations: string[];
}
