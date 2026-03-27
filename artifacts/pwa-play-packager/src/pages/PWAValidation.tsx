import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { ValidationBadge } from '@/components/ValidationBadge';
import { validateDomain, isHttps, validatePackageId, validateUrl } from '@/lib/validators';

export default function PWAValidation() {
  const { project } = useAppStore();

  const checks = [
    {
      group: "Security",
      items: [
        { label: "Manifest uses HTTPS", valid: project.manifestUrl ? isHttps(project.manifestUrl) : null, desc: "Play Store requires HTTPS for Trusted Web Activities." }
      ]
    },
    {
      group: "Identification",
      items: [
        { label: "Valid Package ID Format", valid: project.packageId ? validatePackageId(project.packageId) : null, desc: "Must look like com.example.app (lowercase, dots)" },
        { label: "Valid Domain Format", valid: project.domain ? validateDomain(project.domain) : null, desc: "Must be a valid hostname without protocol/paths" },
        { label: "Valid Manifest URL", valid: project.manifestUrl ? validateUrl(project.manifestUrl) : null, desc: "Must be a fully qualified URL" }
      ]
    },
    {
      group: "Required Metadata",
      items: [
        { label: "App Name Present", valid: !!project.appName, desc: "Required for Play Store listing." },
        { label: "Short Name Present", valid: !!project.shortName, desc: "Required for device homescreen." },
        { label: "Launcher Icon URL", valid: project.launcherIconUrl ? validateUrl(project.launcherIconUrl) : null, desc: "Need at least one high-res icon." },
      ]
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">PWA Validation</h1>
        <p className="text-muted-foreground mt-1">Rule-based validation of your configuration before building.</p>
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
