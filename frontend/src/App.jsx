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
  return isClient
    ? <Navigate to="/client" replace />
    : <Navigate to="/dashboard" replace />;
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
            <CollaboratorRoute><ManagerDashboard /></CollaboratorRoute>
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
