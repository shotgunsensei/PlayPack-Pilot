import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe, Search, CheckCircle2, XCircle, AlertTriangle, Loader2,
  ArrowRight, ArrowLeft, Info
} from 'lucide-react';
import { scanWebsite, buildSiteAnalysis } from '@/services/siteAnalysisService';
import type { AnalysisResult, ScanResult } from '@/lib/analysis-types';

type ScanStep = { id: string; label: string; status: 'pending' | 'active' | 'done' | 'error'; detail?: string };

const initialSteps: ScanStep[] = [
  { id: 'validate', label: 'Validating URL', status: 'pending' },
  { id: 'fetch', label: 'Fetching page', status: 'pending' },
  { id: 'parse', label: 'Reading HTML metadata', status: 'pending' },
  { id: 'manifest', label: 'Looking for web manifest', status: 'pending' },
  { id: 'icons', label: 'Finding app icons', status: 'pending' },
  { id: 'sw', label: 'Checking for service worker', status: 'pending' },
  { id: 'analyze', label: 'Preparing report', status: 'pending' },
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

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleScan = useCallback(async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending', detail: undefined })));

    try {
      updateStep('validate', { status: 'active' });
      await delay(350);
      updateStep('validate', { status: 'done', detail: 'OK' });

      updateStep('fetch', { status: 'active' });
      let scanResult: ScanResult;
      try {
        scanResult = await scanWebsite(url.trim());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        updateStep('fetch', { status: 'error', detail: msg });
        setError(`Could not reach the website. ${msg}`);
        setScanning(false);
        return;
      }

      if (!scanResult.success) {
        updateStep('fetch', { status: 'error', detail: scanResult.error || 'Unreachable' });
        setError(scanResult.error || 'The site could not be fetched. It may block automated requests or require authentication.');
        setScanning(false);
        return;
      }
      updateStep('fetch', { status: 'done', detail: `${scanResult.analysis.domain}` });

      updateStep('parse', { status: 'active' });
      await delay(250);
      updateStep('parse', { status: 'done', detail: scanResult.html.title ? `"${scanResult.html.title}"` : 'No title tag found' });

      updateStep('manifest', { status: 'active' });
      await delay(250);
      updateStep('manifest', {
        status: 'done',
        detail: scanResult.manifest.found ? 'Found and parsed' : (scanResult.html.manifestLink ? 'Link found but could not parse' : 'Not found'),
      });

      updateStep('icons', { status: 'active' });
      await delay(200);
      const iconCount = (scanResult.html.icons?.length || 0) + (scanResult.html.appleTouchIcons?.length || 0) + ((scanResult.manifest.data?.icons as unknown[])?.length || 0);
      updateStep('icons', { status: 'done', detail: iconCount > 0 ? `${iconCount} found` : 'None found' });

      updateStep('sw', { status: 'active' });
      await delay(200);
      updateStep('sw', { status: 'done', detail: scanResult.html.hasServiceWorkerHint ? 'Evidence found' : 'Not detected' });

      updateStep('analyze', { status: 'active' });
      await delay(350);
      const analysis = buildSiteAnalysis(scanResult);
      updateStep('analyze', { status: 'done', detail: 'Complete' });

      setResult(analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
      default: return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/20" />;
    }
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return { text: 'Likely ready', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (score >= 50) return { text: 'Needs work', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { text: 'Not ready', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const detectedCount = result?.detectedValues.filter(v => v.status === 'detected').length || 0;
  const inferredCount = result?.detectedValues.filter(v => v.status === 'inferred').length || 0;
  const missingCount = result?.detectedValues.filter(v => v.status === 'missing').length || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <button onClick={() => setLocation('/intake')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to options
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          Scan a Live Website
        </h1>
        <p className="text-muted-foreground">
          We will fetch the page, look for a web manifest, read meta tags, and check for common PWA requirements.
          You will review everything before it is applied.
        </p>
      </div>

      <Card className="p-6 mb-6">
        <label className="text-sm font-medium text-foreground mb-2 block">Website URL</label>
        <div className="flex gap-3">
          <Input
            placeholder="https://your-app.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()}
            disabled={scanning}
            className="flex-1 text-base h-12 font-mono"
          />
          <Button onClick={handleScan} disabled={scanning || !url.trim()} className="h-12 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 font-medium">
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5 mr-2" />Scan</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-2">
          The page is fetched through a server-side proxy. Some sites may block automated requests.
        </p>
      </Card>

      <AnimatePresence>
        {(scanning || result || error) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Scan Progress</h3>
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className="relative flex flex-col items-center">
                      {getStepIcon(step.status)}
                      {i < steps.length - 1 && (
                        <div className={`absolute top-5 w-px h-4 ${step.status === 'done' ? 'bg-green-500/30' : 'bg-border/30'}`} />
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${step.status === 'active' ? 'text-foreground font-medium' : step.status === 'done' ? 'text-foreground/70' : step.status === 'error' ? 'text-red-400' : 'text-muted-foreground/40'}`}>
                      {step.label}
                    </span>
                    {step.detail && (
                      <span className={`text-xs max-w-[220px] truncate ${step.status === 'error' ? 'text-red-400/70' : 'text-muted-foreground/60'}`}>
                        {step.detail}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {error && (
              <Card className="p-6 mb-6 border-red-500/20 bg-red-500/[0.02]">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Could not complete scan</h3>
                    <p className="text-sm text-muted-foreground mb-2">{error}</p>
                    <p className="text-xs text-muted-foreground/70">Common causes: the site requires authentication, blocks server-side requests, or the URL is misspelled. You can try a different URL or set up your project manually instead.</p>
                  </div>
                </div>
              </Card>
            )}

            {result && (() => {
              const sl = scoreLabel(result.installabilityScore);
              return (
                <>
                  <Card className="p-5 mb-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scan Summary</h3>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${sl.bg}`}>
                        <span className={`text-lg font-bold ${sl.color}`}>{result.installabilityScore}</span>
                        <span className={`text-xs font-medium ${sl.color}`}>/ 100 &mdash; {sl.text}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{detectedCount}</div>
                        <div className="text-xs text-green-400/70 mt-1 font-medium">Detected</div>
                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">from manifest or page</div>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 text-center">
                        <div className="text-2xl font-bold text-amber-400">{inferredCount}</div>
                        <div className="text-xs text-amber-400/70 mt-1 font-medium">Inferred</div>
                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">guessed, review needed</div>
                      </div>
                      <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">{missingCount}</div>
                        <div className="text-xs text-red-400/70 mt-1 font-medium">Missing</div>
                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">you will need to fill in</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">PWA Readiness Checks</h3>
                    <p className="text-xs text-muted-foreground/60 mb-4">
                      These checks reflect what we could observe from the page source. They are not a substitute for Chrome DevTools or Lighthouse.
                    </p>
                    <div className="space-y-1">
                      {result.readinessItems.map(item => (
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

                  {result.recommendations.length > 0 && (
                    <Card className="p-6 mb-6 border-amber-500/15 bg-amber-500/[0.02]">
                      <h3 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" /> What you can improve
                      </h3>
                      <ul className="space-y-2.5">
                        {result.recommendations.map((rec, i) => (
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
                      Nothing has been saved yet. Review the findings on the next screen before creating a project.
                    </p>
                    <Button onClick={goToReview} className="h-12 px-8 bg-gradient-to-r from-primary to-accent font-medium">
                      Review Findings <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
