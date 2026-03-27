import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Search, CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight, ExternalLink, Shield, FileJson, Image, Wifi } from 'lucide-react';
import { scanWebsite, buildSiteAnalysis } from '@/services/siteAnalysisService';
import type { AnalysisResult, ScanResult } from '@/lib/analysis-types';

type ScanStep = { id: string; label: string; status: 'pending' | 'active' | 'done' | 'error'; detail?: string };

const initialSteps: ScanStep[] = [
  { id: 'validate', label: 'Validating URL', status: 'pending' },
  { id: 'fetch', label: 'Fetching page HTML', status: 'pending' },
  { id: 'parse', label: 'Parsing metadata & tags', status: 'pending' },
  { id: 'manifest', label: 'Looking for manifest.json', status: 'pending' },
  { id: 'icons', label: 'Detecting icons', status: 'pending' },
  { id: 'sw', label: 'Checking for service worker', status: 'pending' },
  { id: 'analyze', label: 'Building analysis report', status: 'pending' },
];

export default function SiteAnalysis() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [steps, setSteps] = useState<ScanStep[]>(initialSteps);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (id: string, update: Partial<ScanStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
  };

  const simulateDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleScan = useCallback(async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' })));

    try {
      updateStep('validate', { status: 'active' });
      await simulateDelay(400);
      updateStep('validate', { status: 'done', detail: 'URL validated' });

      updateStep('fetch', { status: 'active' });
      let scanResult: ScanResult;
      try {
        scanResult = await scanWebsite(url.trim());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to scan';
        updateStep('fetch', { status: 'error', detail: msg });
        setError(msg);
        setScanning(false);
        return;
      }

      if (!scanResult.success) {
        updateStep('fetch', { status: 'error', detail: scanResult.error || 'Could not fetch page' });
        setError(scanResult.error || 'Could not fetch the website. It may be blocking automated requests (CORS) or the URL may be invalid.');
        setScanning(false);
        return;
      }

      updateStep('fetch', { status: 'done', detail: 'Page fetched successfully' });

      updateStep('parse', { status: 'active' });
      await simulateDelay(300);
      updateStep('parse', { status: 'done', detail: scanResult.html.title ? `Title: "${scanResult.html.title}"` : 'No title found' });

      updateStep('manifest', { status: 'active' });
      await simulateDelay(300);
      updateStep('manifest', { status: 'done', detail: scanResult.manifest.found ? 'Manifest found and parsed' : scanResult.manifest.error || 'No manifest link detected' });

      updateStep('icons', { status: 'active' });
      await simulateDelay(200);
      const iconCount = (scanResult.html.icons?.length || 0) + (scanResult.html.appleTouchIcons?.length || 0) + ((scanResult.manifest.data?.icons as unknown[])?.length || 0);
      updateStep('icons', { status: 'done', detail: `${iconCount} icon(s) detected` });

      updateStep('sw', { status: 'active' });
      await simulateDelay(200);
      updateStep('sw', { status: 'done', detail: scanResult.html.hasServiceWorkerHint ? 'Service worker hints found' : 'No service worker detected' });

      updateStep('analyze', { status: 'active' });
      await simulateDelay(400);
      const analysis = buildSiteAnalysis(scanResult);
      updateStep('analyze', { status: 'done', detail: `Score: ${analysis.installabilityScore}/100` });

      setResult(analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setScanning(false);
    }
  }, [url]);

  const goToReview = () => {
    if (result) {
      sessionStorage.setItem('playpack_analysis', JSON.stringify(result));
      setLocation('/analyze/review');
    }
  };

  const getStepIcon = (status: ScanStep['status']) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'active': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />;
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          Website Analysis
        </h1>
        <p className="text-muted-foreground">Enter a website URL to scan for PWA metadata, manifest, icons, and installability readiness.</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex gap-3">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()}
            disabled={scanning}
            className="flex-1 text-base h-12"
          />
          <Button onClick={handleScan} disabled={scanning || !url.trim()} className="h-12 px-6 bg-gradient-to-r from-blue-500 to-cyan-500">
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5 mr-2" />Scan</>}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {(scanning || result || error) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Scan Progress</h3>
              <div className="space-y-3">
                {steps.map(step => (
                  <div key={step.id} className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <span className={`text-sm flex-1 ${step.status === 'active' ? 'text-foreground font-medium' : step.status === 'done' ? 'text-muted-foreground' : step.status === 'error' ? 'text-red-400' : 'text-muted-foreground/50'}`}>
                      {step.label}
                    </span>
                    {step.detail && <span className="text-xs text-muted-foreground max-w-[200px] truncate">{step.detail}</span>}
                  </div>
                ))}
              </div>
            </Card>

            {error && (
              <Card className="p-6 mb-6 border-red-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-400 mb-1">Scan Failed</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <p className="text-xs text-muted-foreground mt-2">This can happen if the site blocks automated requests, uses CORS restrictions, or is not publicly accessible.</p>
                  </div>
                </div>
              </Card>
            )}

            {result && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="p-4 text-center">
                    <div className={`text-2xl font-bold ${scoreColor(result.installabilityScore)}`}>{result.installabilityScore}</div>
                    <div className="text-xs text-muted-foreground mt-1">Readiness Score</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{result.detectedValues.filter(v => v.status === 'detected').length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Fields Detected</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{result.detectedValues.filter(v => v.status === 'missing').length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Fields Missing</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{result.iconCandidates.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Icons Found</div>
                  </Card>
                </div>

                <Card className="p-6 mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">PWA Readiness</h3>
                  <div className="space-y-2">
                    {result.readinessItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5">
                        {item.status === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> :
                         item.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
                         <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                        <span className="text-sm font-medium text-foreground w-36 shrink-0">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.message}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {result.recommendations.length > 0 && (
                  <Card className="p-6 mb-6 border-amber-500/20">
                    <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
