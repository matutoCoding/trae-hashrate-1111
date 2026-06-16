import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ApplicationList from "@/pages/ApplicationList";
import ApplicationForm from "@/pages/ApplicationForm";
import ApplicationDetail from "@/pages/ApplicationDetail";
import SealList from "@/pages/SealList";
import SealForm from "@/pages/SealForm";
import RegistrationList from "@/pages/RegistrationList";
import RegistrationForm from "@/pages/RegistrationForm";
import { useAppStore } from "@/store";

export default function App() {
  const initFromApi = useAppStore((s) => s.initFromApi);

  useEffect(() => {
    initFromApi();
  }, [initFromApi]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Home />} />
        <Route path="/applications" element={<ApplicationList />} />
        <Route path="/applications/new" element={<ApplicationForm />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/edit" element={<ApplicationForm />} />
        <Route path="/seals" element={<SealList />} />
        <Route path="/seals/new" element={<SealForm />} />
        <Route path="/registrations" element={<RegistrationList />} />
        <Route path="/registrations/new" element={<RegistrationForm />} />
      </Routes>
    </Router>
  );
}
