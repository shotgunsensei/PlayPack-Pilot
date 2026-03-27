export interface ProjectConfig {
  appName: string;
  shortName: string;
  domain: string;
  baseUrl: string;
  manifestUrl: string;
  startUrl: string;
  packageId: string;
  themeColor: string;
  backgroundColor: string;
  orientation: 'portrait' | 'landscape' | 'any';
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui';
  launcherIconUrl: string;
  monochromeIconUrl: string;
  versionCode: number;
  versionName: string;
}

export interface SigningConfig {
  keystoreFilename: string;
  keyAlias: string;
  storePassword?: string;
  keyPassword?: string;
  sha256Fingerprint: string;
}

export type ChecklistState = Record<string, boolean>;

export interface ScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  missingItems: string[];
}
