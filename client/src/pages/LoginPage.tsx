import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Form, Spinner } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { useAuth } from '../auth/AuthContext';
import PasswordInput from '../components/common/PasswordInput';
import BrandLogo from '../components/BrandLogo';
import ThemeMenu from '../components/ThemeMenu';

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
        <ThemeMenu className="position-absolute top-0 end-0 mt-3 me-3" />
        <BrandLogo layout="stacked" size={72} className="login-logo" title="Recruitment Gorilla" />
        <h1 className="login-title">Sign in</h1>

        <Form onSubmit={handleSubmit}>
          <div className="form-stack">
            {error && (
              <div className="alert-danger-soft" role="alert">
                {error}
              </div>
            )}
            <Form.Group>
              <Form.Label htmlFor="login-email">
                Email <span className="required-star" aria-hidden="true">*</span>
              </Form.Label>
              <Form.Control
                id="login-email"
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label htmlFor="login-password">
                Password <span className="required-star" aria-hidden="true">*</span>
              </Form.Label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="me-2" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
