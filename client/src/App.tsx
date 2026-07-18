import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Button, Container, Navbar, Nav, Spinner } from 'react-bootstrap';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RequireRole from './components/RequireRole';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import CandidateEvaluationReportPage from './pages/CandidateEvaluationReportPage';
import ConfigurationPage from './pages/ConfigurationPage';
import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import InterviewPage from './pages/InterviewPage';
import ThemeToggle from './components/ThemeToggle';
import NotificationBell from './components/NotificationBell';

function ProtectedLayout() {
  const {
    isAuthenticated,
    loading,
    user,
    logout,
    mustChangePassword,
    isAdminOrAbove,
    isSuperAdmin,
    canWriteCandidates,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // First-login (or post-reset) users are confined to the change-password page
  // until they set a new password.
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Navbar expand="lg" sticky="top" className="app-navbar mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <img src="/logo.png" alt="Requirement Gorilla" className="app-logo-img" />
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/" end>Dashboard</Nav.Link>
              {canWriteCandidates && <Nav.Link as={NavLink} to="/upload">Upload CVs</Nav.Link>}
              {canWriteCandidates && <Nav.Link as={NavLink} to="/candidates">Candidates</Nav.Link>}
              {isAdminOrAbove && <Nav.Link as={NavLink} to="/configuration">Configuration</Nav.Link>}
              {isAdminOrAbove && <Nav.Link as={NavLink} to="/audit">Audit</Nav.Link>}
              {isSuperAdmin && <Nav.Link as={NavLink} to="/users">Users</Nav.Link>}
            </Nav>
            <div className="d-flex align-items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
              <Nav.Link as={NavLink} to="/change-password" className="navbar-user p-0">
                {user?.name}
              </Nav.Link>
              <Button size="sm" variant="outline-secondary" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Outlet />
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/upload"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin', 'Recruiter']}>
                  <UploadPage />
                </RequireRole>
              }
            />
            <Route
              path="/candidates"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin', 'Recruiter']}>
                  <CandidatesPage />
                </RequireRole>
              }
            />
            <Route
              path="/candidates/:id"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin', 'Recruiter']}>
                  <CandidateDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="/candidates/:id/evaluations"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin', 'Recruiter']}>
                  <CandidateEvaluationReportPage />
                </RequireRole>
              }
            />
            <Route path="/interviews/:id" element={<InterviewPage />} />
            <Route
              path="/configuration"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin']}>
                  <ConfigurationPage />
                </RequireRole>
              }
            />
            <Route
              path="/audit"
              element={
                <RequireRole roles={['SuperAdmin', 'Admin']}>
                  <AuditLogPage />
                </RequireRole>
              }
            />
            <Route
              path="/users"
              element={
                <RequireRole roles={['SuperAdmin']}>
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
