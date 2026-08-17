import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Spinner } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../services/api';
import Page from '../components/ui/Page';
import PasswordInput from '../components/ui/PasswordInput';
import SectionCard from '../components/ui/SectionCard';

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
    <Page>
      {/* A single-purpose form, so it gets a measured column rather than the
          full page width — a 1500px-wide password field is not easier to use. */}
      <div className="narrow-column">
        <SectionCard
          as="h2"
          title="Change password"
          description={
            mustChangePassword
              ? undefined
              : 'Choose a password you do not use anywhere else.'
          }
        >
          <Form onSubmit={handleSubmit}>
            <div className="form-stack">
              {mustChangePassword && (
                <div className="alert-info-soft">
                  You must set a new password before continuing.
                </div>
              )}
              {error && (
                <div className="alert-danger-soft" role="alert">
                  {error}
                </div>
              )}
              <Form.Group>
                <Form.Label htmlFor="current-password">
                  Current password <span className="required-star" aria-hidden="true">*</span>
                </Form.Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label htmlFor="new-password">
                  New password <span className="required-star" aria-hidden="true">*</span>
                </Form.Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <Form.Text className="text-muted">At least {MIN_LENGTH} characters.</Form.Text>
              </Form.Group>
              <Form.Group>
                <Form.Label htmlFor="confirm-password">
                  Confirm new password <span className="required-star" aria-hidden="true">*</span>
                </Form.Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Form.Group>
              <Button type="submit" className="w-100" disabled={busy}>
                {busy ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </div>
          </Form>
        </SectionCard>
      </div>
    </Page>
  );
}
