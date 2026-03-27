import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppStore } from "@/lib/store";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Pricing from "@/pages/Pricing";
import Projects from "@/pages/Projects";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import ProjectSetup from "@/pages/ProjectSetup";
import PWAValidation from "@/pages/PWAValidation";
import SigningPlanner from "@/pages/SigningPlanner";
import AssetLinks from "@/pages/AssetLinks";
import BubblewrapBuild from "@/pages/BubblewrapBuild";
import GithubActions from "@/pages/GithubActions";
import ReleaseChecklist from "@/pages/ReleaseChecklist";
import DocsExport from "@/pages/DocsExport";
import FileExport from "@/pages/FileExport";
import Intake from "@/pages/Intake";
import SiteAnalysis from "@/pages/SiteAnalysis";
import RepoAnalysis from "@/pages/RepoAnalysis";
import ReviewApply from "@/pages/ReviewApply";

const queryClient = new QueryClient();

function RequireProject({ children }: { children: React.ReactNode }) {
  const { activeProject } = useAppStore();
  const [, setLocation] = useLocation();

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No project selected</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Select or create a project from the Projects page to start working.</p>
        <button
          onClick={() => setLocation('/projects')}
          className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function RequirePro({ children }: { children: React.ReactNode }) {
  const { isProUser } = useAppStore();
  const [, setLocation] = useLocation();

  if (!isProUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Pro Feature</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Repository ZIP analysis is available on the Pro plan. Upgrade to unlock this feature.</p>
        <button
          onClick={() => setLocation('/pricing')}
          className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm"
        >
          View Plans
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRouter() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/projects" component={Projects} />
        <Route path="/settings" component={Settings} />
        <Route path="/intake" component={Intake} />
        <Route path="/analyze/site" component={SiteAnalysis} />
        <Route path="/analyze/repo">
          <RequirePro><RepoAnalysis /></RequirePro>
        </Route>
        <Route path="/analyze/review" component={ReviewApply} />
        <Route path="/">
          <RequireProject><Dashboard /></RequireProject>
        </Route>
        <Route path="/setup">
          <RequireProject><ProjectSetup /></RequireProject>
        </Route>
        <Route path="/validation">
          <RequireProject><PWAValidation /></RequireProject>
        </Route>
        <Route path="/signing">
          <RequireProject><SigningPlanner /></RequireProject>
        </Route>
        <Route path="/asset-links">
          <RequireProject><AssetLinks /></RequireProject>
        </Route>
        <Route path="/bubblewrap">
          <RequireProject><BubblewrapBuild /></RequireProject>
        </Route>
        <Route path="/github-actions">
          <RequireProject><GithubActions /></RequireProject>
        </Route>
        <Route path="/checklist">
          <RequireProject><ReleaseChecklist /></RequireProject>
        </Route>
        <Route path="/docs">
          <RequireProject><DocsExport /></RequireProject>
        </Route>
        <Route path="/export">
          <RequireProject><FileExport /></RequireProject>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function FullPageRouter() {
  return (
    <Switch>
      <Route path="/landing" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/pricing" component={Pricing} />
      <Route>{() => <AppRouter />}</Route>
    </Switch>
  );
}

function App() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <FullPageRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
