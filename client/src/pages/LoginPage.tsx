import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../auth/AuthContext';
import BrandLogo from '../components/BrandLogo';
import ThemeMenu from '../components/ThemeMenu';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/candidates';

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      // Redirects to Gorilla.IAM — this never resolves on success (full-page
      // navigation); busy/error only matter for the redirect itself failing to start.
      await login(from);
    } catch {
      setError('Unable to start sign-in. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card position-relative">
        <ThemeMenu className="position-absolute top-0 end-0 mt-3 me-3" />
        <BrandLogo layout="stacked" size={72} className="login-logo" title="Recruitment Gorilla" />
        <h1 className="login-title">Sign in</h1>

        <div className="form-stack">
          {error && (
            <div className="alert-danger-soft" role="alert">
              {error}
            </div>
          )}
          <Button type="button" className="w-100" disabled={busy} onClick={handleSignIn}>
            {busy ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
                Redirecting…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
