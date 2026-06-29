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
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import ConfigurationPage from './pages/ConfigurationPage';

function ProtectedLayout() {
  const { isAuthenticated, loading, username, logout } = useAuth();
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
              <Nav.Link as={NavLink} to="/upload">Upload CVs</Nav.Link>
              <Nav.Link as={NavLink} to="/candidates">Candidates</Nav.Link>
              <Nav.Link as={NavLink} to="/configuration">Configuration</Nav.Link>
            </Nav>
            <div className="d-flex align-items-center gap-3">
              <span className="navbar-user">{username}</span>
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
            <Route path="/" element={<CandidatesPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
            <Route path="/configuration" element={<ConfigurationPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
