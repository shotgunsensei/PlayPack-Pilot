import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileCode, FileText, Package, FileType, Lock } from 'lucide-react';
import { downloadFile, downloadCompleteZip } from '@/lib/export-helpers';
import { generateAssetLinks, generateGithubWorkflow, generateReadme, generateSigningNotes, generateManifest, generateReleaseNotes, generateTroubleshooting, generateDeploymentSop, generateReleaseChecklist } from '@/lib/generators';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function FileExport() {
  const { project, signing, isProUser } = useAppStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadFile = (filename: string, content: string, type: string) => {
    downloadFile(filename, content, type);
    toast({
      title: "Download Started",
      description: `Downloading ${filename}`,
    });
  };

  const handleZipExport = async () => {
    setIsZipping(true);
    try {
      await downloadCompleteZip(project, signing);
      toast({
        title: "Export Complete",
        description: "Your complete package has been downloaded.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error generating the zip file.",
      });
    } finally {
      setIsZipping(false);
    }
  };

  const files = [
    {
      icon: <FileJson className="w-8 h-8 text-blue-400" />,
      name: 'manifest.json',
      description: 'Web app manifest template for your PWA',
      content: generateManifest(project),
      type: 'application/json',
    },
    {
      icon: <FileJson className="w-8 h-8 text-primary" />,
      name: 'assetlinks.json',
      description: 'Required for domain verification. Host at /.well-known/',
      content: generateAssetLinks(project.packageId, signing.sha256Fingerprint),
      type: 'application/json',
    },
    {
      icon: <FileCode className="w-8 h-8 text-accent" />,
      name: 'android-build.yml',
      description: 'GitHub Actions CI/CD workflow file',
      content: generateGithubWorkflow(project),
      type: 'text/yaml',
    },
    {
      icon: <FileType className="w-8 h-8 text-orange-400" />,
      name: 'pwa-packager-config.json',
      description: 'Combined project configuration (importable)',
      content: JSON.stringify({ project, signing: { keystoreFilename: signing.keystoreFilename, keyAlias: signing.keyAlias, sha256Fingerprint: signing.sha256Fingerprint } }, null, 2),
      type: 'application/json',
    },
    {
      icon: <FileText className="w-8 h-8 text-green-500" />,
      name: 'README.md',
      description: 'Project instructions and CLI commands',
      content: generateReadme(project),
      type: 'text/markdown',
    },
    {
      icon: <FileText className="w-8 h-8 text-yellow-500" />,
      name: 'release-checklist.md',
      description: 'Step-by-step release checklist',
      content: generateReleaseChecklist(),
      type: 'text/markdown',
    },
    {
      icon: <FileText className="w-8 h-8 text-red-400" />,
      name: 'signing-notes.md',
      description: 'Keystore metadata backup document',
      content: generateSigningNotes(signing),
      type: 'text/markdown',
    },
    {
      icon: <FileText className="w-8 h-8 text-purple-400" />,
      name: 'play-store-release-notes.md',
      description: 'Play Store release notes template',
      content: generateReleaseNotes(project),
      type: 'text/markdown',
    },
    {
      icon: <FileText className="w-8 h-8 text-cyan-400" />,
      name: 'troubleshooting.md',
      description: 'Common issues and solutions guide',
      content: generateTroubleshooting(project),
      type: 'text/markdown',
    },
    {
      icon: <FileText className="w-8 h-8 text-emerald-400" />,
      name: 'deployment-sop.md',
      description: 'Standard operating procedure for deployment',
      content: generateDeploymentSop(project, signing),
      type: 'text/markdown',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-export-title">File Export Center</h1>
        <p className="text-muted-foreground mt-1">Download individual config files or export the entire package.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((file) => (
            <Card key={file.name} className="glass-card p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
              <div>
                {file.icon}
                <h3 className="font-bold text-foreground mt-3">{file.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{file.description}</p>
              </div>
              <Button
                variant="secondary"
                data-testid={`button-download-${file.name}`}
                onClick={() => handleDownloadFile(file.name, file.content, file.type)}
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="glass-card p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 flex flex-col items-center text-center sticky top-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Complete Package</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Download all generated configs, GitHub Actions, asset links, and documentation in one organized ZIP file.
            </p>
            {isProUser ? (
              <Button 
                size="lg" 
                className="w-full text-md h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity border-0 shadow-lg"
                onClick={handleZipExport}
                disabled={isZipping}
                data-testid="button-download-zip"
              >
                {isZipping ? (
                  "Generating ZIP..."
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download ZIP
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full text-md h-14"
                  variant="outline"
                  onClick={() => setLocation('/pricing')}
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Upgrade to Download ZIP
                </Button>
                <p className="text-xs text-muted-foreground text-center">ZIP export is a Pro feature. You can still download individual files above.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
