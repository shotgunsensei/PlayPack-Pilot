import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, Settings, ShieldCheck, Key, Link as LinkIcon, 
  TerminalSquare, Github, ListChecks, FileText, Download, 
  Box, RefreshCw, FolderDown
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { StepWizard } from '@/components/StepWizard';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/setup', label: 'Project Setup', icon: Settings },
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
  const { project, resetProject, loadExample } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-primary-foreground">
      {/* Sidebar */}
      <div className="w-72 border-r border-border/50 bg-card/50 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-foreground">PWA Packager</h1>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[160px]" title={project.packageId || 'No package ID'}>
              {project.packageId || 'com.example.app'}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'opacity-70'}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-3 bg-card/80">
          <Button variant="outline" className="w-full justify-start text-xs border-white/10" onClick={loadExample}>
            <FolderDown className="w-4 h-4 mr-2 opacity-70" />
            Load Example Project
          </Button>
          <Button variant="ghost" className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={resetProject}>
            <RefreshCw className="w-4 h-4 mr-2 opacity-70" />
            Reset All Data
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top gradient accent */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 z-20"></div>
        
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-5xl mx-auto pb-20">
            <StepWizard />
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="py-4 text-center text-xs text-muted-foreground/60 border-t border-border/50 bg-background/50 backdrop-blur-md absolute bottom-0 inset-x-0 z-20">
          This tool assists with packaging and preparation. It does not submit apps to Google Play.
        </footer>
      </div>
    </div>
  );
}
