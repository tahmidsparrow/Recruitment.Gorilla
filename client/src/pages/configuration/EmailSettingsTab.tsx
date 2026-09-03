import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmailSettings, saveEmailSettings, sendTestEmail } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ToastStack';
import PasswordInput from '../../components/common/PasswordInput';
import SectionCard from '../../components/common/SectionCard';
import { SkeletonRows } from '../../components/common/Loading';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckboxField, Field } from '@/components/ui/field';

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
          <Badge variant={enabled ? 'success' : 'neutral'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          {/* Eight fields in four full-width bands, each separated by a rule
              and 20px, ran the form to roughly twice the height it needs — and
              on a wide screen a two-column split left a "Port" input about
              700px wide. One grid instead: the fields sit at widths that suit
              what goes in them, and the group headings become inline labels
              rather than bands.

              Every field also moves to <Field>, which owns the label/control
              association. None of these labels had an htmlFor, so clicking one
              focused nothing and a screen reader read the input unlabelled. */}
          <div className="grid grid-cols-12 gap-x-3 gap-y-2.5">
            <p className="col-span-12 email-settings__group">Server</p>
            <Field className="col-span-12 sm:col-span-7 lg:col-span-5" label="SMTP host" required>
              {(p) => (
                <Input {...p} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
              )}
            </Field>
            <Field className="col-span-5 sm:col-span-3 lg:col-span-2" label="Port" required>
              {(p) => (
                <Input {...p} type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
              )}
            </Field>
            <div className="col-span-12 lg:col-span-5 flex items-end pb-1.5">
              <CheckboxField
                id="smtp-starttls"
                label="Use STARTTLS (587). Uncheck for implicit SSL (465)."
                checked={useStartTls}
                onCheckedChange={(checked) => setUseStartTls(checked)}
              />
            </div>

            <p className="col-span-12 email-settings__group">Credentials</p>
            <Field className="col-span-12 md:col-span-6" label="Username">
              {(p) => (
                <Input {...p} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} autoComplete="off" />
              )}
            </Field>
            <Field
              className="col-span-12 md:col-span-6"
              label="App password"
              help="Gmail/Workspace: a 16-character App Password, not your account password."
            >
              {(p) => (
                <PasswordInput
                  {...p}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={data?.passwordSet ? '•••••••• (leave blank to keep)' : 'App password'}
                />
              )}
            </Field>

            <p className="col-span-12 email-settings__group">Sender</p>
            <Field className="col-span-12 md:col-span-6" label="From address" required>
              {(p) => (
                <Input
                  {...p}
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
            </Field>
            <Field className="col-span-12 md:col-span-6" label="From name">
              {(p) => <Input {...p} value={fromName} onChange={(e) => setFromName(e.target.value)} />}
            </Field>
          </div>

          {/* The master switch sits with Save rather than in a band of its own:
              it is the setting you flip last, and it is what Save commits. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <CheckboxField
              id="smtp-enabled"
              label="Enabled — actually send email. When off, notifications stay in-app only."
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked)}
            />
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
        <div className="flex flex-wrap gap-2 items-start">
          <Input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="recipient@example.com"
            aria-label="Test email recipient"
            className="grow"
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
