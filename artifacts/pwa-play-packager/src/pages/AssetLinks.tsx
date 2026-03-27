import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { CommandBlock } from '@/components/CommandBlock';
import { generateAssetLinks } from '@/lib/generators';
import { ValidationBadge } from '@/components/ValidationBadge';
import { isValidFingerprint, validatePackageId, validateDomain } from '@/lib/validators';

export default function AssetLinks() {
  const { project, signing } = useAppStore();

  const assetLinksJson = useMemo(() => {
    return generateAssetLinks(project.packageId, signing.sha256Fingerprint);
  }, [project.packageId, signing.sha256Fingerprint]);

  const hasPackageId = validatePackageId(project.packageId);
  const hasFingerprint = isValidFingerprint(signing.sha256Fingerprint);
  const hasDomain = validateDomain(project.domain);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Digital Asset Links</h1>
        <p className="text-muted-foreground mt-1">Generate the JSON required to prove ownership of your domain.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Requirements</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valid Package ID</span>
                <ValidationBadge isValid={hasPackageId} label={hasPackageId ? 'Valid' : 'Invalid'} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">SHA-256 Fingerprint</span>
                <ValidationBadge isValid={hasFingerprint} label={hasFingerprint ? 'Valid' : 'Invalid'} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Domain Setup</span>
                <ValidationBadge isValid={hasDomain} label={hasDomain ? 'Valid' : 'Invalid'} />
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 bg-primary/5 border-primary/20">
            <h2 className="text-lg font-bold mb-2 text-primary">Deployment Step</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You must host this file on your server exactly at:
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 text-xs font-mono break-all text-blue-200">
              https://{project.domain || 'example.com'}/.well-known/assetlinks.json
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Without this file, the Android app will show an ugly browser address bar at the top of the screen instead of looking like a native app.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <CommandBlock command={assetLinksJson} language="json" label="assetlinks.json" />
        </div>
      </div>
    </motion.div>
  );
}
