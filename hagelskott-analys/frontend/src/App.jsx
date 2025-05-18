// App.jsx

import React, {
  Suspense,
  lazy,
  createContext,
  useContext,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";

// Import av befintliga komponenter
import ErrorBoundary from "./components/common/ErrorBoundary";
import Sidebar from "./components/common/Sidebar";
import Layout from "./components/common/Layout";
import ComponentsPage from "./pages/ComponentsPage";

// Forum
import NewThread from "./pages/forum/NewThread";
import CategoryView from "./pages/CategoryView";
import ThreadView from "./pages/ThreadView";

// Loads
import LoadTypeSelection from "./components/LoadCreation/LoadTypeSelection";
import ShotgunLoadCreation from "./components/LoadCreation/ShotgunLoadCreation";
import BulletLoadCreation from "./components/LoadCreation/BulletLoadCreation";
import EditLoadPage from "./components/LoadCreation/EditLoadPage";
import LoadListPage from "./components/LoadCreation/LoadListPage";
import LoadDetailPage from "./components/LoadCreation/LoadDetailPage";

// Quiz-sidor (direktimport)
import QuizStartPage from "./pages/QuizStartPage";
import QuizPlayPage from "./pages/QuizPlayPage";
import QuizResultPage from "./pages/QuizResultPage";

// Language context och Auth context
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// === Import av QUIZ-sidor direkt ===
// (Redan gjort ovan)

// Lazy-laddade sidor
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Forum = lazy(() => import("./pages/Forum"));
const AnalysisList = lazy(() => import("./pages/AnalysisList"));
const ShotAnalysisContainer = lazy(() =>
  import("./components/analysis/ShotAnalysisContainer")
);
const UploadPage = lazy(() => import("./pages/UploadPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const RecoilAnalysisPage = lazy(() => import("./pages/RecoilAnalysisPage"));
const RecoilAnalysisSelectionPage = lazy(() => import("./pages/RecoilAnalysisSelectionPage"));

// === Importera vår nya ComponentEditPage för att kunna redigera komponenter ===
import ComponentEditPage from "./pages/ComponentEditPage";

// === NYTT: Lazy-ladda PenetrationTestPage (som du själv skapar) ===
const PenetrationTestPage = lazy(() => import("./pages/PenetrationTestPage/PenetrationTestPage"));

// Admin routes
import UserManagement from "./components/admin/UserManagement";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppWithLanguage = () => {
  const { language } = useLanguage();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Offentliga routes */}
        <Route
          path="/login"
          element={
            <>
              <Helmet>
                <title>
                  {language === "sv"
                    ? "Logga in | Hagelskott Analys"
                    : "Login | Shotgun Analysis"}
                </title>
              </Helmet>
              <LoginPage />
            </>
          }
        />
        
        <Route
          path="/register"
          element={
            <>
              <Helmet>
                <title>
                  {language === "sv"
                    ? "Registrera | Hagelskott Analys"
                    : "Register | Shotgun Analysis"}
                </title>
              </Helmet>
              <RegisterPage />
            </>
          }
        />
        
        <Route
          path="/forgot-password"
          element={
            <>
              <Helmet>
                <title>
                  {language === "sv"
                    ? "Glömt lösenord | Hagelskott Analys"
                    : "Forgot Password | Shotgun Analysis"}
                </title>
              </Helmet>
              <ForgotPasswordPage />
            </>
          }
        />
        
        <Route
          path="/reset-password"
          element={
            <>
              <Helmet>
                <title>
                  {language === "sv"
                    ? "Återställ lösenord | Hagelskott Analys"
                    : "Reset Password | Shotgun Analysis"}
                </title>
              </Helmet>
              <ResetPasswordPage />
            </>
          }
        />

        {/* Skyddade routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Forum */}
        <Route
          path="/forum"
          element={
            <ProtectedRoute>
              <Layout>
                <Forum />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/new"
          element={
            <ProtectedRoute>
              <Layout>
                <NewThread />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/category/:catId"
          element={
            <ProtectedRoute>
              <Layout>
                <CategoryView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/threads/:threadId"
          element={
            <ProtectedRoute>
              <Layout>
                <ThreadView />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Loads */}
        <Route
          path="/load-creation"
          element={
            <ProtectedRoute>
              <Layout>
                <LoadTypeSelection />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-creation/shotgun"
          element={
            <ProtectedRoute>
              <Layout>
                <ShotgunLoadCreation />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-creation/bullet"
          element={
            <ProtectedRoute>
              <Layout>
                <BulletLoadCreation />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loads"
          element={
            <ProtectedRoute>
              <Layout>
                <LoadListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loads/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <LoadDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-edit/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <EditLoadPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Components */}
        <Route
          path="/upload-components"
          element={
            <ProtectedRoute>
              <Layout>
                <ComponentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/components/edit/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ComponentEditPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Penetration Test */}
        <Route
          path="/penetration-test"
          element={
            <ProtectedRoute>
              <Layout>
                <PenetrationTestPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Recoil Analysis - endast via laddningar */}
        <Route
          path="/analysis/recoil"
          element={
            <ProtectedRoute>
              <Layout>
                <RecoilAnalysisSelectionPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/recoil/:loadId"
          element={
            <ProtectedRoute>
              <Layout>
                <RecoilAnalysisPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Analysis */}
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <Layout>
                <AnalysisList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ShotAnalysisContainer />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Upload & Settings */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <UploadPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Quiz-sidor */}
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Layout>
                <QuizStartPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/play"
          element={
            <ProtectedRoute>
              <Layout>
                <QuizPlayPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/result"
          element={
            <ProtectedRoute>
              <Layout>
                <QuizResultPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <LanguageProvider>
          <AuthProvider>
            <AppWithLanguage />
          </AuthProvider>
        </LanguageProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
