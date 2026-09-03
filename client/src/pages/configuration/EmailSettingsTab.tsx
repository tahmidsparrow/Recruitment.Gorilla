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
    <SectionCard
      title="SMTP"
      description="Transactional email — interview assignments and account notices."
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
        {/* The group name sits in a gutter beside its fields rather than on a
            row of its own. Three headings, each taking a full-width line above
            the two fields it named, were three lines of height spent on three
            words — and the fields they head are self-describing.

            Every field is a <Field>, which owns the label/control association.
            None of these labels had an htmlFor before, so clicking one focused
            nothing and a screen reader read the input unlabelled. */}
        <div className="grid grid-cols-12 items-start gap-x-3 gap-y-2">
          <p className="email-settings__group col-span-12 lg:col-span-2">Server</p>
          <Field className="col-span-8 sm:col-span-6 lg:col-span-4" label="SMTP host" required>
            {(p) => (
              <Input {...p} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
            )}
          </Field>
          <Field className="col-span-4 sm:col-span-2 lg:col-span-2" label="Port" required>
            {(p) => (
              <Input {...p} type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
            )}
          </Field>
          <div className="col-span-12 sm:col-span-4 lg:col-span-4 email-settings__inline-check">
            <CheckboxField
              id="smtp-starttls"
              label="STARTTLS (587) — off for implicit SSL (465)"
              checked={useStartTls}
              onCheckedChange={(checked) => setUseStartTls(checked)}
            />
          </div>

          <p className="email-settings__group col-span-12 lg:col-span-2">Credentials</p>
          <Field className="col-span-12 sm:col-span-6 lg:col-span-4" label="Username">
            {(p) => (
              <Input {...p} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} autoComplete="off" />
            )}
          </Field>
          <Field
            className="col-span-12 sm:col-span-6 lg:col-span-6"
            label="App password"
            help="Gmail/Workspace: a 16-character App Password, not your account password. Blank keeps the stored one."
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

          <p className="email-settings__group col-span-12 lg:col-span-2">Sender</p>
          <Field className="col-span-12 sm:col-span-6 lg:col-span-5" label="From address" required>
            {(p) => (
              <Input
                {...p}
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="you@example.com"
              />
            )}
          </Field>
          <Field className="col-span-12 sm:col-span-6 lg:col-span-5" label="From name">
            {(p) => <Input {...p} value={fromName} onChange={(e) => setFromName(e.target.value)} />}
          </Field>
        </div>

        {/* The master switch sits with Save: it is the setting you flip last,
            and it is what Save commits. */}
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

      {/* Sending a test is part of configuring SMTP, so it is a row here rather
          than a second card. As its own SectionCard it spent a title, a
          description and a full set of card padding on one input and one
          button. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Label htmlFor="smtp-test-to" className="shrink-0">
          Send a test to
        </Label>
        <Input
          id="smtp-test-to"
          type="email"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="recipient@example.com"
          className="w-[min(20rem,100%)] grow sm:grow-0"
        />
        <Button
          variant="outline"
          disabled={testMutation.isPending || !testTo.trim()}
          onClick={() => testMutation.mutate()}
        >
          {testMutation.isPending ? 'Sending…' : 'Send test'}
        </Button>
        <p className="text-[length:var(--text-sm)] text-muted-foreground">
          Uses the saved configuration, so save first.
        </p>
      </div>
    </SectionCard>
  );
}
