import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, Settings as SettingsIcon, ShieldCheck, Key, Link as LinkIcon, 
  TerminalSquare, Github, ListChecks, FileText, Download, 
  Rocket, FolderOpen, Crown, User, LogOut, CreditCard, Sparkles
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { StepWizard } from '@/components/StepWizard';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/setup', label: 'Project Setup', icon: SettingsIcon },
  { href: '/validation', label: 'PWA Validation', icon: ShieldCheck },
  { href: '/signing', label: 'Signing Planner', icon: Key },
  { href: '/asset-links', label: 'Digital Asset Links', icon: LinkIcon },
  { href: '/bubblewrap', label: 'Bubblewrap Build', icon: TerminalSquare },
  { href: '/github-actions', label: 'GitHub Actions', icon: Github },
  { href: '/checklist', label: 'Play Release Checklist', icon: ListChecks },
  { href: '/docs', label: 'Docs Export', icon: FileText },
  { href: '/export', label: 'File Export Center', icon: Download },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { activeProject, user, isProUser, signOut } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-primary-foreground">
      <div className="w-72 border-r border-border/50 bg-card/50 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-lg leading-tight text-foreground">PlayPack Pilot</h1>
            <p className="text-xs text-muted-foreground font-mono truncate" title={activeProject?.project.packageId || 'No project selected'}>
              {activeProject?.project.packageId || 'No project selected'}
            </p>
          </div>
        </div>

        <div className="px-3 pt-3 space-y-1">
          <Link href="/projects">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${location === '/projects' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'}`}>
              <FolderOpen className="w-5 h-5 opacity-70" /> All Projects
            </div>
          </Link>
          <Link href="/intake">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${location.startsWith('/intake') || location.startsWith('/analyze') ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'}`}>
              <Sparkles className="w-5 h-5 opacity-70" /> New Project
            </div>
          </Link>
        </div>

        {activeProject ? (
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold">{activeProject.name}</div>
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'opacity-70'}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select or create a project to get started.</p>
              <Link href="/projects">
                <Button size="sm" variant="outline" className="mt-3 border-white/10">
                  Go to Projects
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border/50 space-y-2 bg-card/80">
          <Link href="/settings">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
              <SettingsIcon className="w-4 h-4 opacity-70" /> Settings
            </div>
          </Link>
          <Link href="/pricing">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-colors text-muted-foreground hover:bg-white/5 hover:text-foreground`}>
              {isProUser ? <Crown className="w-4 h-4 text-primary" /> : <CreditCard className="w-4 h-4 opacity-70" />}
              {isProUser ? 'Pro Plan' : 'Upgrade'}
            </div>
          </Link>
          {user ? (
            <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5 opacity-70" />
              <span className="truncate flex-1">{user.displayName}</span>
              <button onClick={() => signOut()} className="text-muted-foreground/60 hover:text-foreground"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <Link href="/auth">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm cursor-pointer text-muted-foreground hover:bg-white/5 hover:text-foreground">
                <User className="w-4 h-4 opacity-70" /> Sign In
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 z-20" />
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-5xl mx-auto pb-20">
            {activeProject && <StepWizard />}
            {children}
          </div>
        </main>
        <footer className="py-3 text-center text-xs text-muted-foreground/60 border-t border-border/50 bg-background/50 backdrop-blur-md absolute bottom-0 inset-x-0 z-20">
          PlayPack Pilot &bull; Deployment preparation tool. Does not submit apps to Google Play.
        </footer>
      </div>
    </div>
  );
}
