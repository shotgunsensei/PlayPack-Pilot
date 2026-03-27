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
        <p className="text-muted-foreground mt-1">Automate building the Android app bundle on every code push.</p>
      </div>

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
                To create the base64 keystore string on Mac/Linux:
              </p>
              <code className="block mt-2 text-[10px] bg-black/50 p-2 rounded text-green-300">
                base64 -i my.keystore | pbcopy
              </code>
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
