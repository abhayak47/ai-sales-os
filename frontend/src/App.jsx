import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import FollowUp from "./pages/FollowUp";
import Leads from "./pages/Leads";
import Pricing from "./pages/Pricing";
import SalesCoach from "./pages/SalesCoach";
import Capture from "./pages/Capture";
import EmailSequence from "./pages/EmailSequence";
import Onboarding from "./pages/Onboarding";
import LeadDetail from "./pages/LeadDetail";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/followup" element={<FollowUp />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/coach" element={<SalesCoach />} />
          <Route path="/capture/:username" element={<Capture />} />
          <Route path="/sequence" element={<EmailSequence />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;