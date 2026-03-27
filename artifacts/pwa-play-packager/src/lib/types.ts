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

export type PlanTier = 'free' | 'pro';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  plan: PlanTier;
  role: UserRole;
  createdAt: string;
}

export interface SavedProject {
  id: string;
  name: string;
  project: ProjectConfig;
  signing: SigningConfig;
  checklist: ChecklistState;
  preset?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  shellType: 'bash' | 'powershell';
  defaultDocsBranding: boolean;
  theme: 'dark' | 'light';
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  id: string;
  label: string;
  severity: ValidationSeverity;
  message: string;
  passed: boolean;
  group: string;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  project: Partial<ProjectConfig>;
}
