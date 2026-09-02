import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmailSettings, saveEmailSettings, sendTestEmail } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ToastStack';
import PasswordInput from '../../components/common/PasswordInput';
import SectionCard from '../../components/common/SectionCard';
import { SkeletonRows } from '../../components/common/Loading';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/field';

/**
 * SMTP configuration, grouped into Server / Credentials / Sender rather than
 * one flat run of eight fields. Super Admin only — the caller gates it.
 */
export default function EmailSettingsTab() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['config', 'email'], queryFn: getEmailSettings });

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [password, setPassword] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('Recruitment Gorilla');
  const [useStartTls, setUseStartTls] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Seed the form from the server once.
  if (data && !loaded) {
    setHost(data.host);
    setPort(data.port);
    setSmtpUser(data.user ?? '');
    setFromAddress(data.fromAddress);
    setFromName(data.fromName);
    setUseStartTls(data.useStartTls);
    setEnabled(data.enabled);
    setTestTo(user?.email ?? '');
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      saveEmailSettings({
        host: host.trim(),
        port,
        user: smtpUser.trim() || null,
        password: password.trim() || null, // blank keeps the stored password
        fromAddress: fromAddress.trim(),
        fromName: fromName.trim() || 'Recruitment Gorilla',
        useStartTls,
        enabled,
      }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(['config', 'email'], fresh);
      setPassword('');
      addToast('Email settings saved.');
    },
    onError: () => addToast('Could not save email settings.', 'danger'),
  });

  const testMutation = useMutation({
    mutationFn: () => sendTestEmail(testTo.trim()),
    onSuccess: (res) =>
      res.ok
        ? addToast(`Test email sent to ${testTo.trim()}.`)
        : addToast(`Test failed: ${res.error ?? 'unknown error'}`, 'danger'),
    onError: () => addToast('Could not send the test email.', 'danger'),
  });

  if (isLoading) return <SkeletonRows rows={4} label="Loading email settings" />;

  return (
    <>
      <SectionCard
        title="SMTP"
        description="Transactional email — interview assignments, account and password notices. The password is encrypted at rest and never returned; leave it blank to keep the current one."
        actions={
          <span className={`badge-pill ${enabled ? 'badge-success' : 'badge-neutral'}`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="form-section">
            <div className="form-section__title">Server</div>
            <div className="row g-3">
              <div className="col-12 col-sm-8">
                <Label>SMTP host <span className="required-star" aria-hidden="true">*</span></Label>
                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="col-12 col-sm-4">
                <Label>Port <span className="required-star" aria-hidden="true">*</span></Label>
                <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
              </div>
              <div className="col-12">
                <CheckboxField id="smtp-starttls" label="Use STARTTLS (port 587). Uncheck for implicit SSL (port 465)." checked={useStartTls} onCheckedChange={(checked) => setUseStartTls(checked)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__title">Credentials</div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Label>Username</Label>
                <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} autoComplete="off" />
              </div>
              <div className="col-12 col-md-6">
                <Label>App password</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={data?.passwordSet ? '•••••••• (leave blank to keep)' : 'App password'}
                />
                <p className="text-[length:var(--text-sm)] leading-[var(--leading-normal)] text-muted-foreground">
                  Gmail/Workspace: a 16-character App Password, not your account password. Other
                  providers: your SMTP password.
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__title">Sender</div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Label>From address <span className="required-star" aria-hidden="true">*</span></Label>
                <Input
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="col-12 col-md-6">
                <Label>From name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <CheckboxField id="smtp-enabled" label="Enabled — actually send email. When off, notifications stay in-app only." checked={enabled} onCheckedChange={(checked) => setEnabled(checked)} />
          </div>

          <div className="form-actions">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Send a test email"
        description="Uses the saved configuration, so save any changes first."
      >
        <div className="d-flex flex-wrap gap-2 align-items-start">
          <Input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="recipient@example.com"
            aria-label="Test email recipient"
            className="flex-grow-1"
            style={{ minWidth: 200, maxWidth: 320 }}
          />
          <Button
            variant="outline"
            disabled={testMutation.isPending || !testTo.trim()}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? 'Sending…' : 'Send test'}
          </Button>
        </div>
      </SectionCard>
    </>
  );
}
