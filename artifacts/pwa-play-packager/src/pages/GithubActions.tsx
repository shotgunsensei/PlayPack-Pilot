import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { CommandBlock } from '@/components/CommandBlock';
import { generateGithubWorkflow } from '@/lib/generators';

export default function GithubActions() {
  const { project } = useAppStore();

  const workflowYaml = useMemo(() => {
    return generateGithubWorkflow(project);
  }, [project]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">GitHub Actions Pipeline</h1>
        <p className="text-muted-foreground mt-1">Review a GitHub.com-hosted runner template for an existing Android project. A generated workflow is not a verified build.</p>
      </div>

      <p className="text-sm text-muted-foreground">Initialize and review app/ locally first, including its checksum, Gradle wrapper and existing signing key. The template expects ../android.keystore and the matching alias; confirm Bubblewrap/SDK runner setup before use. It does not generate signing keys or publish to Google Play.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card p-6 border-accent/20">
            <h2 className="text-lg font-bold mb-4 text-accent">Required Secrets</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add these exact variables to your GitHub repository settings under <strong>Settings &gt; Secrets and variables &gt; Actions</strong>:
            </p>
            <ul className="space-y-3 font-mono text-xs">
              <li className="p-2 bg-black/30 rounded border border-white/5 break-all text-blue-200">ANDROID_KEYSTORE_BASE64</li>
              <li className="p-2 bg-black/30 rounded border border-white/5 break-all text-blue-200">ANDROID_KEYSTORE_PASSWORD</li>
              <li className="p-2 bg-black/30 rounded border border-white/5 break-all text-blue-200">ANDROID_KEY_ALIAS</li>
              <li className="p-2 bg-black/30 rounded border border-white/5 break-all text-blue-200">ANDROID_KEY_PASSWORD</li>
            </ul>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground">
                Use your approved secret-management process to encode an existing owned keystore. Base64 is not encryption; keep the output out of commits and generated packages.
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <CommandBlock command={workflowYaml} language="yaml" label=".github/workflows/android-build.yml" />
        </div>
      </div>
    </motion.div>
  );
}
