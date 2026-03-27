import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { ValidationBadge } from '@/components/ValidationBadge';
import { validateDomain, isHttps, validatePackageId, validateUrl, extractDomain, isValidFingerprint } from '@/lib/validators';

export default function PWAValidation() {
  const { project, signing } = useAppStore();

  const startUrlMatchesDomain = () => {
    if (!project.domain || !project.startUrl) return null;
    if (project.startUrl.startsWith('/')) return true;
    try {
      const urlDomain = new URL(project.startUrl).hostname;
      return urlDomain === project.domain;
    } catch {
      return false;
    }
  };

  const manifestDomainMatch = () => {
    if (!project.manifestUrl || !project.domain) return null;
    const manifestDomain = extractDomain(project.manifestUrl);
    return manifestDomain === project.domain;
  };

  const versionCodeValid = () => {
    return project.versionCode > 0 && Number.isInteger(project.versionCode);
  };

  const versionNameValid = () => {
    if (!project.versionName) return null;
    return /^\d+\.\d+\.\d+/.test(project.versionName);
  };

  const checks = [
    {
      group: "Security & HTTPS",
      items: [
        { label: "Manifest URL uses HTTPS", valid: project.manifestUrl ? isHttps(project.manifestUrl) : null, desc: "Play Store requires HTTPS for Trusted Web Activities." },
        { label: "Launcher Icon uses HTTPS", valid: project.launcherIconUrl ? isHttps(project.launcherIconUrl) : null, desc: "Icon URLs must be served over HTTPS." },
        { label: "Monochrome Icon uses HTTPS", valid: project.monochromeIconUrl ? isHttps(project.monochromeIconUrl) : null, desc: "Optional icon URL must use HTTPS if provided." },
      ]
    },
    {
      group: "Domain & URL Consistency",
      items: [
        { label: "Valid Domain Format", valid: project.domain ? validateDomain(project.domain) : null, desc: "Must be a valid hostname without protocol or paths." },
        { label: "Valid Manifest URL", valid: project.manifestUrl ? validateUrl(project.manifestUrl) : null, desc: "Must be a fully qualified URL." },
        { label: "Manifest Domain Matches Project Domain", valid: manifestDomainMatch(), desc: "The manifest URL's domain should match the project domain." },
        { label: "Start URL Compatible with Domain", valid: startUrlMatchesDomain(), desc: "Start URL should be a relative path or match the project domain." },
      ]
    },
    {
      group: "Android Package Identification",
      items: [
        { label: "Valid Package ID Format", valid: project.packageId ? validatePackageId(project.packageId) : null, desc: "Must follow reverse-domain format (e.g., com.example.app)." },
      ]
    },
    {
      group: "Required Manifest Fields",
      items: [
        { label: "App Name Present", valid: !!project.appName, desc: "Required for Play Store listing title." },
        { label: "Short Name Present", valid: !!project.shortName, desc: "Required for device homescreen display." },
        { label: "Launcher Icon URL Set", valid: project.launcherIconUrl ? validateUrl(project.launcherIconUrl) : null, desc: "512x512 icon required for TWA." },
        { label: "Theme Color Set", valid: !!project.themeColor && project.themeColor !== '#000000', desc: "Defines the browser toolbar and splash screen color." },
        { label: "Background Color Set", valid: !!project.backgroundColor, desc: "Used for the splash screen background." },
        { label: "Display Mode Configured", valid: !!project.displayMode, desc: "Standalone, fullscreen, or minimal-ui." },
        { label: "Orientation Set", valid: !!project.orientation, desc: "Portrait, landscape, or any." },
        { label: "Start URL Defined", valid: !!project.startUrl, desc: "Entry point for the TWA app." },
      ]
    },
    {
      group: "Version Validation",
      items: [
        { label: "Version Code is Valid Integer", valid: versionCodeValid(), desc: "Must be a positive integer, incremented for each Play Store upload." },
        { label: "Version Name Format (semver)", valid: versionNameValid(), desc: "Should follow semantic versioning (e.g., 1.0.0)." },
      ]
    },
    {
      group: "Signing Readiness",
      items: [
        { label: "Keystore Filename Set", valid: !!signing.keystoreFilename, desc: "Path to the Android keystore file." },
        { label: "Key Alias Set", valid: !!signing.keyAlias, desc: "Alias for the signing key in the keystore." },
        { label: "SHA-256 Fingerprint Valid", valid: signing.sha256Fingerprint ? isValidFingerprint(signing.sha256Fingerprint) : null, desc: "Required for Digital Asset Links verification." },
      ]
    },
  ];

  const totalChecks = checks.flatMap(g => g.items);
  const passedCount = totalChecks.filter(c => c.valid === true).length;
  const failedCount = totalChecks.filter(c => c.valid === false).length;
  const pendingCount = totalChecks.filter(c => c.valid === null).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">PWA Validation</h1>
        <p className="text-muted-foreground mt-1">Comprehensive rule-based validation of your configuration before building.</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-green-400 font-medium">{passedCount} Passed</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-red-400 font-medium">{failedCount} Failed</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-sm text-yellow-400 font-medium">{pendingCount} Missing Data</span>
        </div>
      </div>

      <div className="grid gap-6">
        {checks.map((group, idx) => (
          <Card key={idx} className="glass-card p-6 overflow-hidden relative">
            <h2 className="text-xl font-bold mb-4 text-foreground">{group.group}</h2>
            <div className="space-y-4">
              {group.items.map((check, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="mb-3 sm:mb-0">
                    <p className="font-medium text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{check.desc}</p>
                  </div>
                  <div className="shrink-0">
                    <ValidationBadge isValid={check.valid} label={check.valid === null ? 'Missing Data' : check.valid ? 'Passed' : 'Failed'} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
