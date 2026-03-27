import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  FileJson, FolderTree, Cpu, Image, FileCode, File as FileIcon
} from 'lucide-react';
import { analyzeZip, buildRepoAnalysis } from '@/services/repoAnalysisService';
import type { AnalysisResult, RepoAnalysisResult } from '@/lib/analysis-types';

const categoryIcons: Record<string, typeof FileJson> = {
  manifest: FileJson,
  config: FileCode,
  package: FileJson,
  icon: Image,
  'service-worker': Cpu,
  readme: FileIcon,
};

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
      setError(err instanceof Error ? err.message : 'Failed to analyze file');
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
      setError('Please upload a .zip file');
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          Repository Analysis
        </h1>
        <p className="text-muted-foreground">Upload a ZIP of your web app project to detect framework, manifest, icons, and PWA configuration.</p>
      </div>

      <Card
        className={`p-10 mb-6 border-2 border-dashed transition-colors text-center cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
        <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-foreground font-medium mb-1">
          {fileName ? fileName : 'Drop a ZIP file here or click to browse'}
        </p>
        <p className="text-sm text-muted-foreground">Supports .zip files up to 50MB</p>
      </Card>

      {analyzing && (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-foreground">Analyzing {fileName}...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6 mb-6 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Analysis Failed</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {repoResult && analysisResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{repoResult.totalFiles}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Files</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{formatSize(repoResult.totalSize)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Size</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{repoResult.detectedFramework || '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">Framework</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{relevantFiles.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Relevant Files</div>
              </Card>
            </div>

            <Card className="p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderTree className="w-4 h-4" /> Discovered Files
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {relevantFiles.map(file => {
                  const Icon = (file.category && categoryIcons[file.category]) || FileIcon;
                  return (
                    <div key={file.path} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-mono text-xs flex-1 truncate">{file.path}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                      {file.category && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{file.category}</span>
                      )}
                    </div>
                  );
                })}
                {relevantFiles.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No relevant PWA-related files detected in the archive.</p>
                )}
              </div>
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Readiness Check</h3>
              <div className="space-y-2">
                {analysisResult.readinessItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    {item.status === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> :
                     item.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
                     <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span className="text-sm font-medium text-foreground w-44 shrink-0">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.message}</span>
                  </div>
                ))}
              </div>
            </Card>

            {analysisResult.recommendations.length > 0 && (
              <Card className="p-6 mb-6 border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={goToReview} className="h-12 px-8 bg-gradient-to-r from-primary to-accent">
                Review & Apply Findings <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
