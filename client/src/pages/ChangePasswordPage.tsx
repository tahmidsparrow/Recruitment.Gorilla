import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../services/api';

const MIN_LENGTH = 8;

export default function ChangePasswordPage() {
  const { mustChangePassword, refresh } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // Pull fresh claims (clears must_change_password) before navigating away.
      await refresh();
      navigate('/candidates', { replace: true });
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 400
          ? 'Current password is incorrect.'
          : 'Unable to change password. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex justify-content-center">
      <Card style={{ maxWidth: 480, width: '100%' }} className="mt-4">
        <Card.Body>
          <h2 className="h4 mb-3">Change password</h2>
          {mustChangePassword && (
            <Alert variant="info" className="py-2">
              You must set a new password before continuing.
            </Alert>
          )}
          {error && (
            <Alert variant="danger" className="py-2">
              {error}
            </Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Current password <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New password <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Form.Text className="text-muted">At least {MIN_LENGTH} characters.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Confirm new password <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={busy}>
              {busy ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
