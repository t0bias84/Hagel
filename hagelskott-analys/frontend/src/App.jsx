// App.jsx

import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
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

// Quiz-sidor (direktimport)
import QuizStartPage from "./pages/QuizStartPage";
import QuizPlayPage from "./pages/QuizPlayPage";
import QuizResultPage from "./pages/QuizResultPage";

// Language context
import { LanguageProvider, useLanguage } from "./context/LanguageProvider";

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
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// === Importera vår nya ComponentEditPage för att kunna redigera komponenter ===
import ComponentEditPage from "./pages/ComponentEditPage";

// === NYTT: Lazy-ladda PenetrationTestPage (som du själv skapar) ===
const PenetrationTestPage = lazy(() =>
  import("./pages/PenetrationTestPage/PenetrationTestPage")
);

// Auth
export const AuthContext = createContext(null);

const LoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center h-screen bg-military-900 text-gray-100">
    <Loader2 className="h-8 w-8 animate-spin text-military-500 mb-2" />
    <div className="text-lg font-semibold">Laddar...</div>
  </div>
);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-military-900 text-gray-100">
        {children}
      </div>
    </div>
  );
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

        {/* Skyddade routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Forum */}
        <Route
          path="/forum"
          element={
            <ProtectedRoute>
              <Forum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/new"
          element={
            <ProtectedRoute>
              <NewThread />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/category/:catId"
          element={
            <ProtectedRoute>
              <CategoryView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/threads/:threadId"
          element={
            <ProtectedRoute>
              <ThreadView />
            </ProtectedRoute>
          }
        />

        {/* Loads */}
        <Route
          path="/load-creation"
          element={
            <ProtectedRoute>
              <LoadTypeSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-creation/shotgun"
          element={
            <ProtectedRoute>
              <ShotgunLoadCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-creation/bullet"
          element={
            <ProtectedRoute>
              <BulletLoadCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-creation/edit/:id"
          element={
            <ProtectedRoute>
              <EditLoadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-list"
          element={
            <ProtectedRoute>
              <LoadListPage />
            </ProtectedRoute>
          }
        />

        {/* NY route: Penetrations-sida för en viss laddning */}
        <Route
          path="/penetration-test/:loadId"
          element={
            <ProtectedRoute>
              <PenetrationTestPage />
            </ProtectedRoute>
          }
        />

        {/* Components */}
        <Route
          path="/upload-components"
          element={
            <ProtectedRoute>
              <ComponentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/components/edit/:id"
          element={
            <ProtectedRoute>
              <ComponentEditPage />
            </ProtectedRoute>
          }
        />

        {/* Analysis */}
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <AnalysisList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/:id"
          element={
            <ProtectedRoute>
              <ShotAnalysisContainer />
            </ProtectedRoute>
          }
        />

        {/* Upload & Settings */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Quiz-sidor */}
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <QuizStartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/play"
          element={
            <ProtectedRoute>
              <QuizPlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/result"
          element={
            <ProtectedRoute>
              <QuizResultPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFoundPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <Helmet>
              <title>Hagelskott Analys</title>
              <meta
                name="description"
                content="Analys av hagelskott och träffmönster"
              />
            </Helmet>

            <AppWithLanguage />
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
