import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/candidates';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login({ email: email.trim(), password });
      navigate(user.mustChangePassword ? '/change-password' : from, { replace: true });
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 401
          ? 'Invalid email or password.'
          : 'Unable to sign in. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card position-relative">
        <ThemeToggle className="position-absolute top-0 end-0 mt-3 me-3" />
        <img src="/logo.png" alt="Requirement Gorilla" className="login-logo" />
        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Recruitment Gorilla — admin access</p>

        {error && (
          <Alert variant="danger" className="py-2">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email <span className="required-star" aria-hidden="true">*</span></Form.Label>
            <Form.Control
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Password <span className="required-star" aria-hidden="true">*</span></Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              required
            />
          </Form.Group>
          <Button type="submit" className="w-100" disabled={busy}>
            {busy ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}
