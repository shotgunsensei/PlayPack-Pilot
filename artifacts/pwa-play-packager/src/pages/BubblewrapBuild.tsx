import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CommandBlock } from '@/components/CommandBlock';
import { Copy, Terminal, Monitor } from 'lucide-react';
import { copyToClipboard } from '@/lib/export-helpers';
import { useToast } from '@/hooks/use-toast';

export default function BubblewrapBuild() {
  const { project, signing } = useAppStore();
  const { toast } = useToast();
  const [shellType, setShellType] = useState<'bash' | 'powershell'>('bash');

  const manifestUrl = project.manifestUrl || 'https://example.com/manifest.json';
  
  const steps = [
    {
      title: 'Install Bubblewrap CLI',
      description: 'Ensure you have Node.js and JDK 11+ installed before running this.',
      bash: 'npm install -g @bubblewrap/cli',
      powershell: 'npm install -g @bubblewrap/cli',
    },
    {
      title: 'Initialize Project',
      description: 'This creates the Android project files locally based on your web manifest.',
      bash: `bubblewrap init --manifest="${manifestUrl}"`,
      powershell: `bubblewrap init --manifest="${manifestUrl}"`,
    },
    {
      title: 'Build the AAB',
      description: 'Compiles the project into an Android App Bundle (.aab) ready for the Play Store. You will be prompted for your keystore passwords.',
      bash: `bubblewrap build`,
      powershell: `bubblewrap build`,
    },
    {
      title: 'Verify the Output',
      description: 'Check that the AAB file was created successfully.',
      bash: `ls -la app-release-bundle.aab`,
      powershell: `Get-ChildItem app-release-bundle.aab`,
    },
    {
      title: 'Sign with Custom Keystore (Optional)',
      description: 'If you need to manually sign with a specific keystore.',
      bash: `jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\
  -keystore ${signing.keystoreFilename || 'android.keystore'} \\
  app-release-bundle.aab ${signing.keyAlias || 'android'}`,
      powershell: `jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \`
  -keystore ${signing.keystoreFilename || 'android.keystore'} \`
  app-release-bundle.aab ${signing.keyAlias || 'android'}`,
    },
  ];

  const allCommands = steps.map(s => shellType === 'bash' ? s.bash : s.powershell).join('\n\n');

  const handleCopyAll = async () => {
    const success = await copyToClipboard(allCommands);
    toast({
      title: success ? "Copied!" : "Copy Failed",
      description: success ? "All commands copied to clipboard" : "Could not copy to clipboard",
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Bubblewrap Build</h1>
          <p className="text-muted-foreground mt-1">Generate local CLI commands to build the Android AAB file.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setShellType('bash')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${shellType === 'bash' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="button-shell-bash"
            >
              <Terminal className="w-3.5 h-3.5" /> Bash
            </button>
            <button
              onClick={() => setShellType('powershell')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${shellType === 'powershell' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="button-shell-powershell"
            >
              <Monitor className="w-3.5 h-3.5" /> PowerShell
            </button>
          </div>
          <Button variant="outline" onClick={handleCopyAll} data-testid="button-copy-all-commands">
            <Copy className="w-4 h-4 mr-2" /> Copy All Commands
          </Button>
        </div>
      </div>

      <Card className="glass-card p-8">
        <div className="space-y-8">
          {steps.map((step, idx) => (
            <div key={idx} className={`relative pl-8 ${idx < steps.length - 1 ? 'border-l-2 border-primary/30' : 'border-l-2 border-transparent'} space-y-4`}>
              <div className="absolute w-6 h-6 bg-primary text-primary-foreground font-bold text-xs rounded-full flex items-center justify-center -left-[13px] top-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                {idx + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                <CommandBlock
                  command={shellType === 'bash' ? step.bash : step.powershell}
                  label={shellType === 'bash' ? 'Terminal' : 'PowerShell'}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
