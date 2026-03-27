import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { CommandBlock } from '@/components/CommandBlock';
import { DownloadButton } from '@/components/DownloadButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateReadme, generateReleaseChecklist, generateSigningNotes, generateReleaseNotes, generateTroubleshooting, generateDeploymentSop } from '@/lib/generators';

export default function DocsExport() {
  const { project, signing } = useAppStore();

  const docs = useMemo(() => [
    { id: 'readme', label: 'README.md', content: generateReadme(project) },
    { id: 'checklist', label: 'release-checklist.md', content: generateReleaseChecklist() },
    { id: 'signing', label: 'signing-notes.md', content: generateSigningNotes(signing) },
    { id: 'release-notes', label: 'play-store-release-notes.md', content: generateReleaseNotes(project) },
    { id: 'troubleshooting', label: 'troubleshooting.md', content: generateTroubleshooting(project) },
    { id: 'deployment-sop', label: 'deployment-sop.md', content: generateDeploymentSop(project, signing) },
  ], [project, signing]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Documentation Preview</h1>
        <p className="text-muted-foreground mt-1">Review and download the markdown documents generated for your project repository.</p>
      </div>

      <Card className="glass-card p-2 md:p-6 bg-card/60">
        <Tabs defaultValue="readme" className="w-full">
          <TabsList className="mb-4 bg-black/40 border border-white/5 p-1 flex-wrap h-auto gap-1">
            {docs.map(doc => (
              <TabsTrigger key={doc.id} value={doc.id} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
                {doc.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {docs.map(doc => (
            <TabsContent key={doc.id} value={doc.id}>
              <div className="flex justify-end mb-3">
                <DownloadButton filename={doc.label} content={doc.content} contentType="text/markdown" label={`Download ${doc.label}`} variant="outline" size="sm" />
              </div>
              <CommandBlock command={doc.content} language="markdown" label={doc.label} />
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </motion.div>
  );
}
