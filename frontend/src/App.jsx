// src/App.jsx – Roteamento principal
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ProjectPage from './pages/ProjectPage';
import ActivityForm from './pages/ActivityForm';
import ProjectsPage from './pages/ProjectsPage';
import UsersPage from './pages/UsersPage';
import GanttPage from './pages/GanttPage';
import DocumentsPage from './pages/DocumentsPage';
import OKRPage from './pages/OKRPage';
import PdcaPage from './pages/PdcaPage';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import OperationalDashboard from './pages/OperationalDashboard';
import GovernancePage from './pages/GovernancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import './styles/globals.css';

// Guard: só autenticados
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#F5C500' }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Guard: só colaboradores/admin
function CollaboratorRoute({ children }) {
  const { user, isCollaborator, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isCollaborator) return <Navigate to="/client" replace />;
  return children;
}

function RoleRouter() {
  const { user, isClient } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isClient) return <Navigate to="/client" replace />;
  if (user.role === 'EXECUTIVE') return <Navigate to="/executive" replace />;
  return <Navigate to="/dashboard" replace />;
}

function ExecutiveRoute({ children }) {
  const { user, isExecutive, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isExecutive) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><RoleRouter /></PrivateRoute>} />

          {/* Colaboradores / Admin */}
          <Route path="/dashboard" element={
            <CollaboratorRoute><OperationalDashboard /></CollaboratorRoute>
          } />
          <Route path="/executive" element={
            <ExecutiveRoute><ExecutiveDashboard /></ExecutiveRoute>
          } />
          <Route path="/projects" element={
            <CollaboratorRoute><ProjectsPage /></CollaboratorRoute>
          } />
          <Route path="/projects/:id" element={
            <PrivateRoute><ProjectPage /></PrivateRoute>
          } />
          <Route path="/users" element={
            <CollaboratorRoute><UsersPage /></CollaboratorRoute>
          } />
          <Route path="/gantt" element={
            <CollaboratorRoute><GanttPage /></CollaboratorRoute>
          } />
          <Route path="/documents" element={
            <CollaboratorRoute><DocumentsPage /></CollaboratorRoute>
          } />
          <Route path="/okr" element={
            <CollaboratorRoute><OKRPage /></CollaboratorRoute>
          } />
          <Route path="/pdca" element={
            <CollaboratorRoute><PdcaPage /></CollaboratorRoute>
          } />
          <Route path="/governance" element={
            <PrivateRoute><GovernancePage /></PrivateRoute>
          } />
          <Route path="/analytics" element={
            <ExecutiveRoute><AnalyticsPage /></ExecutiveRoute>
          } />
          <Route path="/activities/new" element={
            <CollaboratorRoute><ActivityForm /></CollaboratorRoute>
          } />
          <Route path="/activities/:id/edit" element={
            <CollaboratorRoute><ActivityForm /></CollaboratorRoute>
          } />

          {/* Clientes */}
          <Route path="/client" element={
            <PrivateRoute><ClientDashboard /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
