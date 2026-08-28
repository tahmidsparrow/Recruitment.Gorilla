import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { userManager } from '../auth/userManager';

interface CallbackState {
  from?: string;
}

/**
 * Lands here after Gorilla.IAM redirects back with an authorization code. Completes
 * the PKCE code exchange, then hands off to wherever the user was headed before
 * /login (round-tripped through oidc-client-ts's own state param, not React Router's).
 */
export default function CallbackPage() {
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // The authorization code is single-use; StrictMode's dev-mode double-invoke of
  // effects would otherwise exchange it twice and fail the second time. A ref (not
  // state) survives that mount→cleanup→mount replay within the same component
  // instance, so the exchange only actually runs once — deliberately with no
  // matching "still mounted" guard on the .then()/.catch() below: StrictMode's
  // simulated unmount+remount happens synchronously, before this async call
  // resolves, so a mounted-flag set false by that first simulated cleanup would
  // discard the real result once it arrives on the (still actually mounted)
  // second pass. Confirmed the hard way: the callback exchange itself succeeded
  // (verified via network logs) but the page never navigated away.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    userManager
      .signinRedirectCallback()
      .then((oidcUser) => {
        const from = (oidcUser.state as CallbackState | null)?.from;
        setDestination(from ?? '/');
      })
      .catch(() => {
        setError(true);
      });
  }, []);

  if (error) {
    return <Navigate to="/login" replace />;
  }

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Spinner animation="border" />
    </div>
  );
}
