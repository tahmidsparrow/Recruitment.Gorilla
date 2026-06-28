import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Container, Navbar, Nav } from 'react-bootstrap';
import UploadPage from './pages/UploadPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="/">Recruitment Gorilla</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/upload">Upload CVs</Nav.Link>
              <Nav.Link as={NavLink} to="/candidates">Candidates</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Routes>
          <Route path="/" element={<CandidatesPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateDetailPage />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
