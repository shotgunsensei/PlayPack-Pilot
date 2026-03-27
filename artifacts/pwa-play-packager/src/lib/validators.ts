import { ProjectConfig, SigningConfig } from './types';

export const isHttps = (url: string) => url.startsWith('https://');

export const validatePackageId = (id: string) => {
  const regex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i;
  return regex.test(id) && id.length > 3;
};

export const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDomain = (domain: string) => {
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return regex.test(domain);
};

export const extractDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

export const isValidFingerprint = (fp: string) => {
  const regex = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
  return regex.test(fp);
};

export function calculateReadiness(project: ProjectConfig, signing: SigningConfig) {
  const pwa: string[] = [];
  const meta: string[] = [];
  const signingItems: string[] = [];
  const verify: string[] = [];
  const release: string[] = [];

  if (!project.manifestUrl) pwa.push("Manifest URL missing");
  else if (!isHttps(project.manifestUrl)) pwa.push("Manifest URL must be HTTPS");
  if (!project.domain) pwa.push("Domain missing");
  else if (!validateDomain(project.domain)) pwa.push("Invalid domain format");
  if (!project.startUrl) pwa.push("Start URL missing");
  if (!project.displayMode) pwa.push("Display mode not set");

  if (!project.appName) meta.push("App Name missing");
  if (!project.shortName) meta.push("Short Name missing");
  if (!project.packageId) meta.push("Package ID missing");
  else if (!validatePackageId(project.packageId)) meta.push("Invalid Package ID format");
  if (!project.launcherIconUrl) meta.push("Launcher Icon URL missing");
  if (!project.themeColor) meta.push("Theme Color missing");

  if (!signing.keystoreFilename) signingItems.push("Keystore filename missing");
  if (!signing.keyAlias) signingItems.push("Key alias missing");
  if (!signing.sha256Fingerprint) signingItems.push("SHA-256 Fingerprint missing");
  else if (!isValidFingerprint(signing.sha256Fingerprint)) signingItems.push("Invalid SHA-256 format");

  if (!signing.sha256Fingerprint) verify.push("Cannot generate assetlinks without fingerprint");
  if (!project.packageId) verify.push("Cannot generate assetlinks without Package ID");
  if (!project.domain) verify.push("Cannot verify without domain");

  if (!project.versionCode || project.versionCode < 1) release.push("Invalid Version Code");
  if (!project.versionName) release.push("Version Name missing");
  if (!project.appName) release.push("App Name needed for store listing");

  const scores = [
    {
      label: "PWA Setup",
      score: Math.max(0, 4 - pwa.length),
      maxScore: 4,
      percentage: Math.max(0, ((4 - pwa.length) / 4) * 100),
      missingItems: pwa
    },
    {
      label: "Android Metadata",
      score: Math.max(0, 5 - meta.length),
      maxScore: 5,
      percentage: Math.max(0, ((5 - meta.length) / 5) * 100),
      missingItems: meta
    },
    {
      label: "Signing Inputs",
      score: Math.max(0, 3 - signingItems.length),
      maxScore: 3,
      percentage: Math.max(0, ((3 - signingItems.length) / 3) * 100),
      missingItems: signingItems
    },
    {
      label: "Verification",
      score: Math.max(0, 3 - verify.length),
      maxScore: 3,
      percentage: Math.max(0, ((3 - verify.length) / 3) * 100),
      missingItems: verify
    },
    {
      label: "Release Prep",
      score: Math.max(0, 3 - release.length),
      maxScore: 3,
      percentage: Math.max(0, ((3 - release.length) / 3) * 100),
      missingItems: release
    }
  ];

  const totalScore = scores.reduce((acc, curr) => acc + curr.score, 0);
  const totalMax = scores.reduce((acc, curr) => acc + curr.maxScore, 0);
  
  return {
    scores,
    overallPercentage: Math.round((totalScore / totalMax) * 100)
  };
}
