import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AuthPage } from "@/features/auth/AuthPage";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { TodayPage } from "@/features/today/TodayPage";
import { FinancePage } from "@/features/finance/FinancePage";
import { InvoicesPage } from "@/features/invoices/InvoicesPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { CompanyPage } from "@/features/company/CompanyPage";
import { AnalysisPage } from "@/features/analysis/AnalysisPage";
import { VisionBoardPage } from "@/features/vision/VisionBoardPage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { HorizonsPage } from "@/features/horizons/HorizonsPage";
import { JournalPage } from "@/features/journal/JournalPage";
import { InsightsPage } from "@/features/journal/InsightsPage";
import { AchievementsPage } from "@/features/achievements/AchievementsPage";
import { ScreenTimePage } from "@/features/screentime/ScreenTimePage";
import { TrainingPage } from "@/features/training/TrainingPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export default function App() {
  const { account, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <span className="animate-pulse">Life-OS wird geladen…</span>
      </div>
    );
  }

  // Ohne eingeloggtes Konto: nur die Auth-Seite.
  if (!account) return <AuthPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="heute" element={<TodayPage />} />
        <Route path="finanzen" element={<FinancePage />} />
        <Route path="rechnungen" element={<InvoicesPage />} />
        <Route path="analyse" element={<AnalysisPage />} />
        <Route path="unternehmen" element={<CompanyPage />} />
        <Route path="projekte" element={<ProjectsPage />} />
        <Route path="kalender" element={<CalendarPage />} />
        <Route path="ziele" element={<GoalsPage />} />
        <Route path="horizonte" element={<HorizonsPage />} />
        <Route path="tagebuch" element={<JournalPage />} />
        <Route path="erkenntnisse" element={<InsightsPage />} />
        <Route path="erfolge" element={<AchievementsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="bildschirmzeit" element={<ScreenTimePage />} />
        <Route path="vision" element={<VisionBoardPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
