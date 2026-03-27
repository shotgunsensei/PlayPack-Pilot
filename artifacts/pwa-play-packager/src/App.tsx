import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/store";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import NotFound from "@/pages/not-found";

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

const queryClient = new QueryClient();

function Router() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/setup" component={ProjectSetup} />
        <Route path="/validation" component={PWAValidation} />
        <Route path="/signing" component={SigningPlanner} />
        <Route path="/asset-links" component={AssetLinks} />
        <Route path="/bubblewrap" component={BubblewrapBuild} />
        <Route path="/github-actions" component={GithubActions} />
        <Route path="/checklist" component={ReleaseChecklist} />
        <Route path="/docs" component={DocsExport} />
        <Route path="/export" component={FileExport} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  // Ensure dark mode is active given the design instructions
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
