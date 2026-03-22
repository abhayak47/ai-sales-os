import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const Leads = lazy(() => import("./pages/Leads"));
const Contacts = lazy(() => import("./pages/Contacts"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const EmailHub = lazy(() => import("./pages/EmailHub"));
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SalesCoach = lazy(() => import("./pages/SalesCoach"));
const Capture = lazy(() => import("./pages/Capture"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="glass-panel rounded-2xl px-6 py-4 text-sm text-white/60">Loading workspace...</div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/followup" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
              <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/emails" element={<ProtectedRoute><EmailHub /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/coach" element={<ProtectedRoute><SalesCoach /></ProtectedRoute>} />
              <Route path="/capture/:username" element={<Capture />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
