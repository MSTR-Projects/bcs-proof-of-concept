import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TaskProvider } from "@/context/TaskContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import Clients from "./pages/Clients";
import ControleWizard from "./pages/ControleWizard";
import ControleDetail from "./pages/ControleDetail";
import RunControle from "./pages/RunControle";
import RunDetail from "./pages/RunDetail";
import Settings from "./pages/Settings";
import Results from "./pages/Results";
import RuleLibrary from "./pages/RuleLibrary";
import MyControls from "./pages/MyControls";
import MyControlResults from "./pages/MyControlResults";
import MyControlGlobalValues from "./pages/MyControlGlobalValues";
import GlobalValuePdfEditor from "./pages/GlobalValuePdfEditor";
import GlobalValueAuditTrail from "./pages/GlobalValueAuditTrail";
import SeriesBuilder from "./pages/SeriesBuilder";
import SeriesDetail from "./pages/SeriesDetail";
import RunSeries from "./pages/RunSeries";
import RunSeriesStepDetail from "./pages/RunSeriesStepDetail";
import SeriesList from "./pages/SeriesList";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import TeamPage from "./pages/TeamPage";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="bcs-ui-theme">
      <TooltipProvider>
        <AuthProvider>
          <TaskProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                <Route path="/team" element={<ProtectedPage><TeamPage /></ProtectedPage>} />
                <Route path="/klanten" element={<ProtectedPage><Clients /></ProtectedPage>} />
                <Route path="/klanten/:clientId" element={<ProtectedPage><Clients /></ProtectedPage>} />
                <Route path="/controle/nieuw" element={<ProtectedPage><ControleWizard /></ProtectedPage>} />
                <Route path="/controle/:id" element={<ProtectedPage><ControleDetail /></ProtectedPage>} />
                <Route path="/controle/:id/edit" element={<ProtectedPage><ControleWizard /></ProtectedPage>} />
                <Route path="/controle/:id/run" element={<ProtectedPage><RunControle /></ProtectedPage>} />
                <Route path="/controles" element={<ProtectedPage><MyControls /></ProtectedPage>} />
                <Route path="/controles/resultaten" element={<ProtectedPage><MyControlResults /></ProtectedPage>} />
                <Route path="/controles/runs/:runId" element={<ProtectedPage><RunDetail /></ProtectedPage>} />
                <Route path="/controles/globale-waarden" element={<ProtectedPage><MyControlGlobalValues /></ProtectedPage>} />
                <Route path="/global-values/:id/edit" element={<ProtectedPage><GlobalValuePdfEditor /></ProtectedPage>} />
                <Route path="/controles/globale-waarden/:id/audit" element={<ProtectedPage><GlobalValueAuditTrail /></ProtectedPage>} />
                <Route path="/controle-series" element={<ProtectedPage><SeriesList /></ProtectedPage>} />
                <Route path="/controle-series/nieuw" element={<ProtectedPage><SeriesBuilder /></ProtectedPage>} />
                <Route path="/controle-series/:id" element={<ProtectedPage><SeriesDetail /></ProtectedPage>} />
                <Route path="/controle-series/:id/edit" element={<ProtectedPage><SeriesBuilder /></ProtectedPage>} />
                <Route path="/controle-series/:id/run" element={<ProtectedPage><RunSeries /></ProtectedPage>} />
                <Route path="/controle-series/:seriesId/run/:runId/step/:stepId" element={<ProtectedPage><RunSeriesStepDetail /></ProtectedPage>} />
                <Route path="/gallerij" element={<ProtectedPage><Gallery /></ProtectedPage>} />
                <Route path="/regels" element={<ProtectedPage><RuleLibrary /></ProtectedPage>} />
                <Route path="/instellingen" element={<ProtectedPage><Settings /></ProtectedPage>} />
                <Route path="/resultaten/:taskId" element={<ProtectedPage><Results /></ProtectedPage>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TaskProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
