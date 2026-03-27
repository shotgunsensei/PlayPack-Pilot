import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ArrowLeft,
  FileJson, FolderTree, Cpu, Image, FileCode, File as FileIcon, Info, Package, Layers
} from 'lucide-react';
import { analyzeZip, buildRepoAnalysis } from '@/services/repoAnalysisService';
import type { AnalysisResult, RepoAnalysisResult, RepoFile } from '@/lib/analysis-types';

const categoryIcons: Record<string, typeof FileJson> = {
  manifest: FileJson,
  config: FileCode,
  package: Package,
  icon: Image,
  'service-worker': Cpu,
  readme: FileIcon,
};

const categoryLabels: Record<string, string> = {
  manifest: 'Web Manifest',
  config: 'Build Config',
  package: 'Package Config',
  icon: 'App Icon',
  'service-worker': 'Service Worker',
  readme: 'Documentation',
};

function groupByCategory(files: RepoFile[]): Record<string, RepoFile[]> {
  const groups: Record<string, RepoFile[]> = {};
  for (const f of files) {
    const cat = f.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  }
  return groups;
}

export default function RepoAnalysis() {
  const [, setLocation] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [repoResult, setRepoResult] = useState<RepoAnalysisResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setAnalyzing(true);
    setError(null);
    setRepoResult(null);
    setAnalysisResult(null);
    setFileName(file.name);

    try {
      const repo = await analyzeZip(file);
      setRepoResult(repo);
      const analysis = buildRepoAnalysis(repo);
      setAnalysisResult(analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not read the ZIP file');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip')) {
      processFile(file);
    } else {
      setError('Only .zip files are supported.');
    }
  };

  const goToReview = () => {
    if (analysisResult) {
      sessionStorage.setItem('playpack_analysis', JSON.stringify(analysisResult));
      setLocation('/analyze/review');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const relevantFiles = repoResult?.files.filter(f => f.relevant) || [];
  const grouped = groupByCategory(relevantFiles);
  const categoryOrder = ['manifest', 'package', 'config', 'service-worker', 'icon', 'readme', 'other'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <button onClick={() => setLocation('/intake')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to options
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          Analyze a Project ZIP
        </h1>
        <p className="text-muted-foreground">
          Upload a ZIP of your web project. We will scan the file tree for manifest files, framework configs, icons, and service workers.
          Files are analyzed in your browser and never uploaded to a server.
        </p>
      </div>

      <Card
        className={`p-10 mb-6 border-2 border-dashed transition-all text-center cursor-pointer ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/50 hover:border-primary/40 hover:bg-muted/5'}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
        {analyzing ? (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Analyzing {fileName}...</p>
            <p className="text-sm text-muted-foreground">Extracting files and scanning for PWA assets</p>
          </>
        ) : fileName && repoResult ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">{fileName}</p>
            <p className="text-sm text-muted-foreground">Analysis complete. Drop a different file to re-analyze.</p>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Drop a ZIP file here, or click to browse</p>
            <p className="text-sm text-muted-foreground">.zip files up to 50 MB</p>
          </>
        )}
      </Card>

      {error && (
        <Card className="p-6 mb-6 border-red-500/20 bg-red-500/[0.02]">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Analysis failed</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {repoResult && analysisResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Project Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-muted/30 p-3.5 text-center">
                  <Layers className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-foreground">{repoResult.totalFiles.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">files scanned</div>
                </div>
                <div className="rounded-xl bg-muted/30 p-3.5 text-center">
                  <Package className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-foreground">{formatSize(repoResult.totalSize)}</div>
                  <div className="text-[11px] text-muted-foreground">total size</div>
                </div>
                <div className="rounded-xl bg-muted/30 p-3.5 text-center">
                  <Cpu className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-foreground truncate px-1">{repoResult.detectedFramework || 'Unknown'}</div>
                  <div className="text-[11px] text-muted-foreground">framework {repoResult.detectedFramework ? `(${repoResult.frameworkConfidence})` : ''}</div>
                </div>
                <div className="rounded-xl bg-muted/30 p-3.5 text-center">
                  <FolderTree className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-foreground">{relevantFiles.length}</div>
                  <div className="text-[11px] text-muted-foreground">relevant files</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Discovered Files</h3>
              <p className="text-xs text-muted-foreground/60 mb-4">Files related to PWA packaging found in the archive</p>
              {relevantFiles.length === 0 ? (
                <div className="py-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No PWA-related files were found in this archive.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">We looked for: manifest.json, package.json, icons, service workers, and framework configs.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => (
                    <div key={cat}>
                      <div className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        {(() => { const Icon = categoryIcons[cat] || FileIcon; return <Icon className="w-3 h-3" />; })()}
                        {categoryLabels[cat] || cat} ({grouped[cat].length})
                      </div>
                      <div className="space-y-0.5">
                        {grouped[cat].map(file => (
                          <div key={file.path} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-muted/20 text-sm transition-colors">
                            <span className="text-foreground/80 font-mono text-xs flex-1 truncate">{file.path}</span>
                            <span className="text-[11px] text-muted-foreground/50 tabular-nums">{formatSize(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Readiness Checks</h3>
              <p className="text-xs text-muted-foreground/60 mb-4">Based on file analysis only, not runtime behavior</p>
              <div className="space-y-1">
                {analysisResult.readinessItems.map(item => (
                  <div key={item.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
                    {item.status === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> :
                     item.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> :
                     <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground/70 mt-0.5">{item.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {analysisResult.recommendations.length > 0 && (
              <Card className="p-6 mb-6 border-amber-500/15 bg-amber-500/[0.02]">
                <h3 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> What you can improve
                </h3>
                <ul className="space-y-2.5">
                  {analysisResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-muted-foreground/50 max-w-xs">
                No project has been created yet. Review the extracted values on the next screen.
              </p>
              <Button onClick={goToReview} className="h-12 px-8 bg-gradient-to-r from-primary to-accent font-medium">
                Review Findings <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
