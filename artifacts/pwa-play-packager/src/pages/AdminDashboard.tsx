import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield, Trash2, Archive, ArchiveRestore, FolderOpen, Crown,
  AlertTriangle, Users, Database, ToggleLeft, ToggleRight
} from 'lucide-react';
import type { PlanTier } from '@/lib/types';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const {
    user, projects, plan, isAdmin,
    deleteProject, archiveProject, unarchiveProject, selectProject,
    adminSetPlan, adminClearAllData,
    upgradePlan, downgradePlan,
  } = useAppStore();
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground mb-6">You need to be signed in as an administrator to view this page.</p>
        <button onClick={() => setLocation('/auth')} className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm">
          Sign In
        </button>
      </div>
    );
  }

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);

  const handleDelete = (id: string, name: string) => {
    deleteProject(id);
    toast({ title: 'Project deleted', description: `"${name}" has been permanently removed.` });
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    adminClearAllData();
    setConfirmClear(false);
    toast({ title: 'All data cleared', description: 'All projects have been removed.' });
  };

  const handleTogglePlan = () => {
    if (plan === 'pro') {
      downgradePlan();
      toast({ title: 'Plan changed', description: 'Switched to Free plan.' });
    } else {
      upgradePlan();
      toast({ title: 'Plan changed', description: 'Switched to Pro plan.' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage projects, plans, and application data. Signed in as <span className="text-foreground font-medium">{user?.email}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Projects</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{projects.length}</div>
          <div className="text-xs text-muted-foreground/60 mt-1">{activeProjects.length} active, {archivedProjects.length} archived</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current Plan</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold ${plan === 'pro' ? 'text-primary' : 'text-foreground'}`}>
              {plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            <Button variant="outline" size="sm" onClick={handleTogglePlan} className="gap-1.5 ml-auto">
              {plan === 'pro' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              Switch to {plan === 'pro' ? 'Free' : 'Pro'}
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Session Role</span>
          </div>
          <div className="text-3xl font-bold text-red-400">Admin</div>
          <div className="text-xs text-muted-foreground/60 mt-1">Full access to all features</div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4" /> All Projects
          </h3>
          <span className="text-xs text-muted-foreground">{projects.length} total</span>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No projects exist.</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-muted/20 ${p.archived ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                    {p.archived && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">archived</span>}
                    {p.preset && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.preset}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-0.5">
                    {p.project.packageId || 'No package ID'} &middot; Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Select project" onClick={() => { selectProject(p.id); setLocation('/'); }}>
                    <FolderOpen className="w-3.5 h-3.5" />
                  </Button>
                  {p.archived ? (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-400 hover:text-green-300" title="Unarchive" onClick={() => { unarchiveProject(p.id); toast({ title: 'Unarchived', description: `"${p.name}" restored.` }); }}>
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300" title="Archive" onClick={() => { archiveProject(p.id); toast({ title: 'Archived', description: `"${p.name}" archived.` }); }}>
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" title="Delete permanently" onClick={() => handleDelete(p.id, p.name)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 border-red-500/20 bg-red-500/[0.02]">
        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete all projects and reset application data. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleClearAll}
          className={confirmClear ? 'animate-pulse' : ''}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {confirmClear ? 'Click again to confirm — this is permanent' : 'Clear All Data'}
        </Button>
        {confirmClear && (
          <Button variant="ghost" size="sm" className="ml-3 text-muted-foreground" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
