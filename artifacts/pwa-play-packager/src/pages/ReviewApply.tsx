import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, RotateCcw, Zap,
  Check, Edit3, Globe, Upload
} from 'lucide-react';
import type { AnalysisResult, DetectedValue, ConfidenceLevel } from '@/lib/analysis-types';

const confidenceBadge = (level: ConfidenceLevel) => {
  switch (level) {
    case 'high': return <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">High</span>;
    case 'medium': return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Medium</span>;
    case 'low': return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Low</span>;
  }
};

const statusIcon = (status: DetectedValue['status']) => {
  switch (status) {
    case 'detected': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'inferred': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'missing': return <XCircle className="w-4 h-4 text-red-400" />;
  }
};

export default function ReviewApply() {
  const [, setLocation] = useLocation();
  const { createProject, updateProject, selectProject, canCreateProject } = useAppStore();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [values, setValues] = useState<DetectedValue[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('playpack_analysis');
      if (stored) {
        const parsed = JSON.parse(stored) as AnalysisResult;
        setAnalysis(parsed);
        setValues(parsed.detectedValues);
      } else {
        setLocation('/intake');
      }
    } catch {
      setLocation('/intake');
    }
  }, [setLocation]);

  const updateValue = (field: string, update: Partial<DetectedValue>) => {
    setValues(prev => prev.map(v => v.field === field ? { ...v, ...update } : v));
  };

  const approveAllHighConfidence = () => {
    setValues(prev => prev.map(v => v.confidence === 'high' ? { ...v, approved: true } : v));
  };

  const approveAll = () => {
    setValues(prev => prev.map(v => ({ ...v, approved: true })));
  };

  const resetAll = () => {
    if (analysis) setValues(analysis.detectedValues);
  };

  const approvedCount = values.filter(v => v.approved).length;
  const totalCount = values.length;

  const handleApply = () => {
    if (!canCreateProject) {
      toast({ title: 'Plan limit reached', description: 'Upgrade to Pro to create more projects.', variant: 'destructive' });
      return;
    }

    const appName = values.find(v => v.field === 'appName')?.value || 'Analyzed Project';
    const projectId = createProject(appName);

    const updates: Record<string, string> = {};
    for (const v of values) {
      if (v.approved && v.value) {
        updates[v.field] = v.value;
      }
    }

    selectProject(projectId);

    setTimeout(() => {
      const projectUpdates: Record<string, unknown> = {};
      for (const v of values) {
        if (v.approved && v.value) {
          if (v.field === 'versionCode') {
            projectUpdates[v.field] = parseInt(v.value) || 1;
          } else {
            projectUpdates[v.field] = v.value;
          }
        }
      }
      updateProject(projectUpdates as Parameters<typeof updateProject>[0]);
    }, 100);

    sessionStorage.removeItem('playpack_analysis');
    toast({ title: 'Project created!', description: `"${appName}" has been set up with ${approvedCount} detected values applied.` });
    setLocation('/');
  };

  if (!analysis) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            {analysis.mode === 'website' ? <Globe className="w-5 h-5 text-white" /> : <Upload className="w-5 h-5 text-white" />}
          </div>
          Review Detected Values
        </h1>
        <p className="text-muted-foreground">Review the extracted values before creating your project. Edit, approve, or reject each finding.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={approveAllHighConfidence} className="gap-2">
          <Zap className="w-4 h-4" /> Apply High Confidence
        </Button>
        <Button variant="outline" size="sm" onClick={approveAll} className="gap-2">
          <Check className="w-4 h-4" /> Approve All
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
        <div className="ml-auto text-sm text-muted-foreground self-center">
          {approvedCount}/{totalCount} approved
        </div>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-muted-foreground font-medium w-10"></th>
                <th className="text-left p-3 text-muted-foreground font-medium">Field</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Value</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-24">Confidence</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-24">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Source</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {values.map(v => (
                <tr key={v.field} className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${v.approved ? '' : 'opacity-60'}`}>
                  <td className="p-3">
                    <Checkbox
                      checked={v.approved}
                      onCheckedChange={(checked) => updateValue(v.field, { approved: !!checked })}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(v.status)}
                      <span className="font-medium text-foreground">{v.label}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {editingField === v.field ? (
                      <Input
                        autoFocus
                        value={v.value}
                        onChange={e => updateValue(v.field, { value: e.target.value, status: v.value !== e.target.value ? 'detected' : v.status })}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground">{v.value || <span className="text-muted-foreground italic">empty</span>}</span>
                    )}
                  </td>
                  <td className="p-3">{confidenceBadge(v.confidence)}</td>
                  <td className="p-3">
                    <span className="text-xs text-muted-foreground capitalize">{v.status}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-muted-foreground">{v.sourceDetail || v.source}</span>
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingField(editingField === v.field ? null : v.field)}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {analysis.missingCritical.length > 0 && (
        <Card className="p-5 mb-6 border-amber-500/20">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Missing Critical Fields
          </h3>
          <ul className="space-y-1.5">
            {analysis.missingCritical.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {analysis.iconCandidates.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Icon Candidates ({analysis.iconCandidates.length})</h3>
          <div className="space-y-1">
            {analysis.iconCandidates.slice(0, 10).map((icon, i) => (
              <div key={i} className="flex items-center gap-3 py-1 text-sm">
                <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                  <img src={icon.url} alt="" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground truncate flex-1">{icon.url}</span>
                {icon.sizes && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{icon.sizes}</span>}
                <span className="text-xs text-muted-foreground">{icon.source}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => setLocation('/intake')}>
          Back to Intake
        </Button>
        <Button onClick={handleApply} disabled={approvedCount === 0} className="h-12 px-8 bg-gradient-to-r from-primary to-accent">
          Create Project with {approvedCount} Values <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
