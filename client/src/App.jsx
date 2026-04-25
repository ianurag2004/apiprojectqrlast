import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import Sidebar from './components/Sidebar';
import ChatBot from './components/ChatBot';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ProposalFormPage from './pages/ProposalFormPage';
import AnalyticsPage from './pages/AnalyticsPage';
import QRScannerPage from './pages/QRScannerPage';
import AdminPage from './pages/AdminPage';
import RegistrationsPage from './pages/RegistrationsPage';
import PublicRegisterPage from './pages/PublicRegisterPage';

// Protected layout (sidebar + routes)
function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 max-w-[1200px]">
        <Outlet />
      </main>
      <ChatBot />
    </div>
  );
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const { connect } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
      connect();
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1d2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        {/* Public event registration — no auth needed */}
        <Route path="/register/:eventId" element={<PublicRegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<ProposalFormPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/analytics" element={<AnalyticsPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/scan" element={<QRScannerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
