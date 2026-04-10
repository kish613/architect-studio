import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/Home";
import { Projects } from "@/pages/Projects";
import { Upload } from "@/pages/Upload";
import { Viewer } from "@/pages/Viewer";
import { Pricing } from "@/pages/Pricing";
import Settings from "@/pages/Settings";
import { Planning } from "@/pages/Planning";
import { PlanningUpload } from "@/pages/PlanningUpload";
import { PlanningViewer } from "@/pages/PlanningViewer";
import { FloorplanEditorPage } from "@/pages/FloorplanEditorPage";
import { FloorplanExtractPage } from "@/pages/FloorplanExtractPage";
import { FloorplanBimPage } from "@/pages/FloorplanBimPage";
import { FloorplanPresentPage } from "@/pages/FloorplanPresentPage";
import { DevTest } from "@/pages/DevTest";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={Viewer} />
      <Route path="/upload" component={Upload} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/settings" component={Settings} />
      <Route path="/planning" component={Planning} />
      <Route path="/planning/new" component={PlanningUpload} />
      {/*
        BIM-first routes. /editor is preserved for Pascal compatibility
        during the migration; new surfaces live under /extract, /bim and
        /present and all read the canonical BIM JSON as source of truth.
      */}
      <Route path="/planning/:id/extract" component={FloorplanExtractPage} />
      <Route path="/planning/:id/bim" component={FloorplanBimPage} />
      <Route path="/planning/:id/present" component={FloorplanPresentPage} />
      <Route path="/planning/:id/editor" component={FloorplanEditorPage} />
      <Route path="/planning/:id" component={PlanningViewer} />
      <Route path="/dev-test" component={DevTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
