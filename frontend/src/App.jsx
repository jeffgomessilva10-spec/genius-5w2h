// src/App.jsx – Roteamento principal
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lazy, Suspense } from 'react';
import './styles/globals.css';

// Lazy loading de todos os componentes para isolar erros
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const ManagerDashboard   = lazy(() => import('./pages/ManagerDashboard'));
const ClientDashboard    = lazy(() => import('./pages/ClientDashboard'));
const ProjectPage        = lazy(() => import('./pages/ProjectPage'));
const ActivityForm       = lazy(() => import('./pages/ActivityForm'));
const ProjectsPage       = lazy(() => import('./pages/ProjectsPage'));
const UsersPage          = lazy(() => import('./pages/UsersPage'));
const GanttPage          = lazy(() => import('./pages/GanttPage'));
const DocumentsPage      = lazy(() => import('./pages/DocumentsPage'));
const OKRPage            = lazy(() => import('./pages/OKRPage'));
const PdcaPage           = lazy(() => import('./pages/PdcaPage'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const OperationalDashboard = lazy(() => import('./pages/OperationalDashboard'));
const GovernancePage     = lazy(() => import('./pages/GovernancePage'));
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
    <div style={{ textAlign: 'center' }}>
      <img src="/logo-laranja.png" alt="Genius" style={{ height: 40, marginBottom: 16 }} />
      <div style={{ width: 40, height: 40, border: '3px solid #F04E00', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function CollaboratorRoute({ children }) {
  const { user, isCollaborator, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isCollaborator) return <Navigate to="/client" replace />;
  return children;
}

function ExecutiveRoute({ children }) {
  const { user, isExecutive, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isExecutive) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleRouter() {
  const { user, isClient } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isClient) return <Navigate to="/client" replace />;
  if (user?.role === 'EXECUTIVE') return <Navigate to="/executive" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><RoleRouter /></PrivateRoute>} />

            <Route path="/dashboard"  element={<CollaboratorRoute><OperationalDashboard /></CollaboratorRoute>} />
            <Route path="/executive"  element={<ExecutiveRoute><ExecutiveDashboard /></ExecutiveRoute>} />
            <Route path="/projects"   element={<CollaboratorRoute><ProjectsPage /></CollaboratorRoute>} />
            <Route path="/projects/:id" element={<PrivateRoute><ProjectPage /></PrivateRoute>} />
            <Route path="/users"      element={<CollaboratorRoute><UsersPage /></CollaboratorRoute>} />
            <Route path="/gantt"      element={<CollaboratorRoute><GanttPage /></CollaboratorRoute>} />
            <Route path="/documents"  element={<CollaboratorRoute><DocumentsPage /></CollaboratorRoute>} />
            <Route path="/okr"        element={<CollaboratorRoute><OKRPage /></CollaboratorRoute>} />
            <Route path="/pdca"       element={<CollaboratorRoute><PdcaPage /></CollaboratorRoute>} />
            <Route path="/governance" element={<PrivateRoute><GovernancePage /></PrivateRoute>} />
            <Route path="/analytics"  element={<ExecutiveRoute><AnalyticsPage /></ExecutiveRoute>} />
            <Route path="/activities/new"      element={<CollaboratorRoute><ActivityForm /></CollaboratorRoute>} />
            <Route path="/activities/:id/edit" element={<CollaboratorRoute><ActivityForm /></CollaboratorRoute>} />
            <Route path="/client"     element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
            <Route path="/profile"    element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
