import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { calculateReadiness } from '@/lib/validators';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { ScoreRing } from '@/components/ScoreRing';
import { PROJECT_PRESETS } from '@/lib/presets';
import {
  Plus, Search, FolderOpen, Copy, Archive, ArchiveRestore, Trash2,
  Rocket, MoreVertical, Clock, Crown, Upload, Download, FolderDown
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function Projects() {
  const {
    projects, activeProjectId, plan, isProUser, canCreateProject,
    createProject, duplicateProject, deleteProject, archiveProject,
    unarchiveProject, selectProject, loadExampleProject, importProject,
    exportProject, user
  } = useAppStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>();

  const filtered = projects
    .filter(p => showArchived ? p.archived : !p.archived)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.project.packageId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const activeCount = projects.filter(p => !p.archived).length;

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    if (!canCreateProject) {
      toast({ variant: 'destructive', title: 'Project limit reached', description: 'Upgrade to Pro for unlimited projects.' });
      return;
    }
    createProject(newProjectName.trim(), selectedPreset);
    setShowNewDialog(false);
    setNewProjectName('');
    setSelectedPreset(undefined);
    setLocation('/setup');
    toast({ title: 'Project created', description: `${newProjectName.trim()} is ready to configure.` });
  };

  const handleDuplicate = (id: string) => {
    if (!canCreateProject && !isProUser) {
      toast({ variant: 'destructive', title: 'Project limit reached', description: 'Upgrade to Pro for unlimited projects.' });
      return;
    }
    const newId = duplicateProject(id);
    if (newId) toast({ title: 'Project duplicated' });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProject(id);
      toast({ title: 'Project deleted' });
    }
  };

  const handleOpenProject = (id: string) => {
    selectProject(id);
    setLocation('/setup');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = importProject(reader.result as string);
        if (ok) {
          toast({ title: 'Project imported' });
          setLocation('/setup');
        } else {
          toast({ variant: 'destructive', title: 'Import failed', description: 'Invalid project file.' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = (id: string, name: string) => {
    const data = exportProject(id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-playpack.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Project exported' });
  };

  const handleLoadExample = () => {
    loadExampleProject();
    setLocation('/setup');
    toast({ title: 'Example project loaded' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your PWA deployment packages.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-muted-foreground">
            {isProUser ? (
              <><Crown className="w-3.5 h-3.5 text-primary" /> Pro &bull; {activeCount} projects</>
            ) : (
              <>{activeCount}/1 project{!canCreateProject && ' (limit reached)'}</>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="pl-10 bg-black/20" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className={`border-white/10 ${showArchived ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setShowArchived(!showArchived)}>
            <Archive className="w-4 h-4 mr-1" /> {showArchived ? 'Archived' : 'Active'}
          </Button>
          <Button variant="outline" size="sm" className="border-white/10" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm" className="border-white/10" onClick={handleLoadExample}>
            <FolderDown className="w-4 h-4 mr-1" /> Example
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-accent border-0"
            onClick={() => { if (canCreateProject) setShowNewDialog(true); else toast({ variant: 'destructive', title: 'Project limit reached', description: 'Upgrade to Pro.' }); }}
          >
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <FolderOpen className="w-10 h-10 text-primary/50" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {showArchived ? 'No archived projects' : 'No projects yet'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {showArchived
              ? 'Archived projects will appear here.'
              : 'Create your first project to start generating deployment packages for the Play Store.'}
          </p>
          {!showArchived && (
            <div className="flex gap-3">
              <Button onClick={() => setShowNewDialog(true)} className="bg-gradient-to-r from-primary to-accent border-0">
                <Plus className="w-4 h-4 mr-1" /> Create Project
              </Button>
              <Button variant="outline" className="border-white/10" onClick={handleLoadExample}>
                <FolderDown className="w-4 h-4 mr-1" /> Load Example
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => {
            const readiness = calculateReadiness(p.project, p.signing);
            const isActive = p.id === activeProjectId;
            return (
              <Card
                key={p.id}
                className={`glass-card p-6 cursor-pointer transition-all hover:border-primary/30 hover:-translate-y-0.5 ${isActive ? 'border-primary/40 bg-primary/5' : ''}`}
                onClick={() => handleOpenProject(p.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground truncate">{p.name}</h3>
                      {isActive && <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded-full shrink-0">Active</span>}
                      {p.archived && <span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full shrink-0">Archived</span>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{p.project.packageId || 'No package ID'}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(p.updatedAt)}</span>
                      {p.preset && <span className="px-2 py-0.5 bg-white/5 rounded-full">{p.preset}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <ScoreRing percentage={readiness.overallPercentage} size={48} strokeWidth={5} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenProject(p.id)}>
                          <Rocket className="w-4 h-4 mr-2" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(p.id)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport(p.id, p.name)}>
                          <Download className="w-4 h-4 mr-2" /> Export JSON
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.archived ? (
                          <DropdownMenuItem onClick={() => unarchiveProject(p.id)}>
                            <ArchiveRestore className="w-4 h-4 mr-2" /> Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => archiveProject(p.id)}>
                            <Archive className="w-4 h-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id, p.name)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="My PWA App"
                className="bg-black/20"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start from preset (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`p-3 rounded-xl border text-left transition-colors ${selectedPreset === preset.id ? 'border-primary/40 bg-primary/10' : 'border-border/50 hover:bg-white/5'}`}
                    onClick={() => setSelectedPreset(selectedPreset === preset.id ? undefined : preset.id)}
                  >
                    <span className="text-xl">{preset.icon}</span>
                    <div className="text-sm font-medium mt-1">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newProjectName.trim()} className="bg-gradient-to-r from-primary to-accent border-0">
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
