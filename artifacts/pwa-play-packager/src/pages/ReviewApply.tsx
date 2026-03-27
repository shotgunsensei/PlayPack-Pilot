import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, ArrowLeft, RotateCcw, Zap,
  Edit3, Globe, Upload, Sparkles, Shield
} from 'lucide-react';
import type { AnalysisResult, DetectedValue, ConfidenceLevel } from '@/lib/analysis-types';

const confidenceBadge = (level: ConfidenceLevel) => {
  switch (level) {
    case 'high': return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">High</span>;
    case 'medium': return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">Medium</span>;
    case 'low': return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">Low</span>;
  }
};

const statusLabel = (status: DetectedValue['status']) => {
  switch (status) {
    case 'detected': return <span className="text-[11px] text-green-400 font-medium">Detected</span>;
    case 'inferred': return <span className="text-[11px] text-amber-400 font-medium">Inferred</span>;
    case 'missing': return <span className="text-[11px] text-red-400 font-medium">Missing</span>;
  }
};

const statusIcon = (status: DetectedValue['status']) => {
  switch (status) {
    case 'detected': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'inferred': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'missing': return <XCircle className="w-4 h-4 text-red-400" />;
  }
};

function ValueRow({ v, editing, onToggle, onEdit, onStartEdit, onStopEdit }: {
  v: DetectedValue;
  editing: boolean;
  onToggle: (approved: boolean) => void;
  onEdit: (value: string) => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  return (
    <div className={`flex items-start gap-4 py-3.5 px-4 rounded-xl transition-all ${v.approved ? 'bg-muted/10' : 'opacity-50'}`}>
      <div className="pt-0.5">
        <Switch checked={v.approved} onCheckedChange={onToggle} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {statusIcon(v.status)}
          <span className="text-sm font-medium text-foreground">{v.label}</span>
          {confidenceBadge(v.confidence)}
          {statusLabel(v.status)}
        </div>
        {editing ? (
          <Input
            autoFocus
            value={v.value}
            onChange={e => onEdit(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={e => e.key === 'Enter' && onStopEdit()}
            className="h-8 text-sm font-mono mt-1"
          />
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-foreground/80 break-all">
              {v.value || <span className="text-red-400/60 italic">needs manual entry</span>}
            </span>
            <button onClick={onStartEdit} className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground/50 mt-1">{v.sourceDetail || v.source}</div>
      </div>
    </div>
  );
}

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
    setValues(prev => prev.map(v => v.confidence === 'high' || v.confidence === 'medium' ? { ...v, approved: true } : v));
  };

  const resetAll = () => {
    if (analysis) setValues(analysis.detectedValues);
  };

  const approvedCount = values.filter(v => v.approved).length;
  const detectedValues = values.filter(v => v.status === 'detected');
  const inferredValues = values.filter(v => v.status === 'inferred');
  const missingValues = values.filter(v => v.status === 'missing');

  const handleApply = () => {
    if (!canCreateProject) {
      toast({ title: 'Plan limit reached', description: 'Upgrade to Pro to create more projects.', variant: 'destructive' });
      return;
    }

    const appName = values.find(v => v.field === 'appName')?.value || 'Analyzed Project';
    const projectId = createProject(appName);
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
    toast({ title: 'Project created', description: `"${appName}" is ready with ${approvedCount} values applied.` });
    setLocation('/');
  };

  if (!analysis) return null;

  const renderGroup = (title: string, description: string, items: DetectedValue[], borderColor: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor}`}>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground/60">({items.length})</span>
          <span className="text-xs text-muted-foreground/40 ml-auto">{description}</span>
        </div>
        <div className="space-y-1">
          {items.map(v => (
            <ValueRow
              key={v.field}
              v={v}
              editing={editingField === v.field}
              onToggle={(approved) => updateValue(v.field, { approved })}
              onEdit={(value) => updateValue(v.field, { value })}
              onStartEdit={() => setEditingField(v.field)}
              onStopEdit={() => setEditingField(null)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <button onClick={() => setLocation(analysis.mode === 'website' ? '/analyze/site' : '/analyze/repo')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to results
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            {analysis.mode === 'website' ? <Globe className="w-5 h-5 text-white" /> : <Upload className="w-5 h-5 text-white" />}
          </div>
          Review & Apply
        </h1>
        <p className="text-muted-foreground">
          Each value below was extracted from your {analysis.mode === 'website' ? 'website' : 'project files'}.
          Toggle values on or off, edit anything that looks wrong, then create your project.
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={approveAllHighConfidence} className="gap-2 bg-gradient-to-r from-primary to-accent text-white">
            <Zap className="w-3.5 h-3.5" /> Accept detected & inferred
          </Button>
          <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{approvedCount}</span> of {values.length} included
            </span>
          </div>
        </div>
      </Card>

      {renderGroup(
        'Detected values',
        'Found directly in manifest or page source',
        detectedValues,
        'border-green-500/20'
      )}
      {renderGroup(
        'Inferred values',
        'Guessed from available signals — please verify',
        inferredValues,
        'border-amber-500/20'
      )}
      {renderGroup(
        'Missing values',
        'Could not be detected — enter manually or leave empty',
        missingValues,
        'border-red-500/20'
      )}

      {analysis.missingCritical.length > 0 && (
        <Card className="p-5 mb-6 border-amber-500/15 bg-amber-500/[0.02]">
          <h3 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Fields that need attention
          </h3>
          <ul className="space-y-2">
            {analysis.missingCritical.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground/50 mt-3">You can still create the project and fill these in later from the Project Setup page.</p>
        </Card>
      )}

      {analysis.iconCandidates.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Icon Candidates</h3>
          <p className="text-xs text-muted-foreground/50 mb-3">{analysis.iconCandidates.length} icon(s) found. The best match has been pre-selected as your launcher icon above.</p>
          <div className="flex flex-wrap gap-2">
            {analysis.iconCandidates.slice(0, 12).map((icon, i) => (
              <div key={i} className="group relative w-14 h-14 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors" title={`${icon.url}\n${icon.sizes || 'unknown size'} — ${icon.source}`}>
                <img src={icon.url} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {icon.sizes && <span className="absolute bottom-0 inset-x-0 text-center text-[8px] text-muted-foreground bg-background/80 py-0.5">{icon.sizes}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 mb-6 bg-primary/[0.03] border-primary/10">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">What happens next</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clicking the button below creates a new project with the {approvedCount} approved value{approvedCount !== 1 ? 's' : ''} pre-filled.
              You will land on the project dashboard where you can continue through the full setup wizard:
              validation, signing, asset links, build config, and export.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Button variant="ghost" onClick={() => setLocation('/intake')} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Start over
        </Button>
        <Button onClick={handleApply} disabled={approvedCount === 0} className="h-12 px-8 bg-gradient-to-r from-primary to-accent font-medium">
          Create Project <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
