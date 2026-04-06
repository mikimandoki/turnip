import { type User } from '@supabase/supabase-js';
import { Dialog, Switch } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';

import { useHabitContext } from '../contexts/useHabitContext';
import { exportData } from '../utils/dataTransfer';
import { supabase } from '../utils/supabase';
import Alert from './Alert';

export default function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    habits,
    completions,
    applyImport,
    darkMode,
    toggleDarkMode,
    deleteAccount,
    notifPermissionPrompt,
    dismissNotifPrompt,
    confirmNotifPrompt,
  } = useHabitContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'ok' | 'warning';
  } | null>(null);

  // --- Auth state ---
  const [user, setUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<'check-inbox' | 'idle' | 'verifying'>('idle');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setAuthStep('idle');
        setEmail('');
        setOtp('');
        setAuthError(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSendOtp() {
    setAuthLoading(true);
    setAuthError(null);

    // Try existing user first — if it succeeds, an OTP was sent
    const { error: existingError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (!existingError) {
      setAuthLoading(false);
      setAuthStep('verifying');
      return;
    }

    // User doesn't exist — create account and send magic link
    const { error: newError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setAuthLoading(false);
    if (newError) {
      setAuthError(newError.message);
      return;
    }
    setAuthStep('check-inbox');
  }

  async function handleVerifyOtp() {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthStep('idle');
    setEmail('');
    setOtp('');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthStep('idle');
    setEmail('');
    setOtp('');
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const json = ev.target?.result as string;
      void applyImport(json).then(result => {
        if (result.success) {
          setStatus({ message: 'Import successful.', state: 'ok' });
        } else {
          setStatus({ message: result.error ?? 'Import failed.', state: 'error' });
        }
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const habitCount = habits.length;
  const importDesc =
    habitCount > 0
      ? `Restore from a backup file. Replaces your ${habitCount} habit${habitCount === 1 ? '' : 's'} and all completions.`
      : 'Restore habits and history from a backup file.';

  return (
    <Dialog.Root
      open={open}
      onOpenChange={next => {
        if (!next) setStatus(null);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='modal-overlay' />
        <Dialog.Content className='modal-content'>
          <Dialog.Title className='modal-title'>Settings</Dialog.Title>

          <div className='settings-section'>
            <div className='settings-item'>
              <div className='settings-item-text'>
                <span className='settings-item-label'>Dark mode</span>
              </div>
              <Switch.Root
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
                className='switch-root'
              >
                <Switch.Thumb className='switch-thumb' />
              </Switch.Root>
            </div>
          </div>

          <div className='settings-section settings-section-divided'>
            <div className='settings-item-stack'>
              <span className='settings-item-label'>Export data</span>
              <span className='settings-item-desc'>
                {habitCount > 0
                  ? 'Download a backup of your habits and history'
                  : 'Nothing to export yet — add some habits first'}
              </span>
              <button
                className='btn-base btn-ghost'
                disabled={habitCount === 0}
                onClick={() => {
                  void exportData(habits, completions).then(result => {
                    if (result.error) setStatus({ message: result.error, state: 'error' });
                  });
                }}
              >
                Download backup
              </button>
            </div>
            <div className='settings-item-stack'>
              <span className='settings-item-label'>Import data</span>
              <span className='settings-item-desc'>{importDesc}</span>
              <input
                ref={fileRef}
                type='file'
                accept='.json'
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <button className='btn-base btn-ghost' onClick={() => fileRef.current?.click()}>
                Import from file
              </button>
            </div>
          </div>

          <div className='settings-section settings-section-divided'>
            {user ? (
              <div className='settings-item-stack'>
                <span className='settings-item-label'>Backup &amp; sync</span>
                <span className='settings-item-desc'>Signed in as {user.email}</span>
                <button className='btn-base btn-ghost' onClick={() => void handleSignOut()}>
                  Sign out
                </button>
                <button className='btn-base btn-danger' onClick={() => setDeleteAccountOpen(true)}>
                  Delete account
                </button>
                {deleteAccountError && (
                  <p className='settings-status-error'>{deleteAccountError}</p>
                )}
              </div>
            ) : authStep === 'check-inbox' ? (
              <div className='settings-item-stack'>
                <span className='settings-item-label'>Check your inbox</span>
                <span className='settings-item-desc'>
                  We sent a magic link to {email}. Check your inbox to create your account and start
                  syncing.
                </span>
                <button
                  className='btn-base btn-ghost'
                  onClick={() => {
                    setAuthStep('idle');
                    setAuthError(null);
                  }}
                >
                  Back
                </button>
              </div>
            ) : authStep === 'verifying' ? (
              <div className='settings-item-stack'>
                <span className='settings-item-label'>Check your email</span>
                <span className='settings-item-desc'>
                  Welcome back! Enter the 8-digit code sent to {email}
                </span>
                <input
                  className='text-input'
                  type='text'
                  inputMode='numeric'
                  placeholder='12345678'
                  maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
                <button
                  className='btn-base btn-ghost'
                  disabled={otp.length < 8 || authLoading}
                  onClick={() => void handleVerifyOtp()}
                >
                  {authLoading ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  className='btn-base btn-ghost'
                  onClick={() => {
                    setAuthStep('idle');
                    setAuthError(null);
                  }}
                >
                  Back
                </button>
                {authError && <p className='settings-status-error'>{authError}</p>}
              </div>
            ) : (
              <div className='settings-item-stack'>
                <span className='settings-item-label'>Backup &amp; sync</span>
                <span className='settings-item-desc'>
                  Sign in to back up your habits and sync across devices.
                </span>
                <input
                  className='text-input'
                  type='email'
                  placeholder='you@example.com'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <button
                  className='btn-base btn-ghost'
                  disabled={!email.includes('@') || authLoading}
                  onClick={() => void handleSendOtp()}
                >
                  {authLoading ? 'Sending…' : 'Continue'}
                </button>
                {authError && <p className='settings-status-error'>{authError}</p>}
              </div>
            )}
          </div>

          {status && <p className={`settings-status-${status.state}`}>{status.message}</p>}
        </Dialog.Content>

        <Alert
          open={deleteAccountOpen}
          title='Delete account?'
          description={
            'Your account, all habits, and your entire history will be permanently erased, including the cloud backup.\n\nThis cannot be undone.\n\nAre you sure you want to continue?'
          }
          confirm='Delete account'
          cancel='Cancel'
          onOpenChange={isOpen => {
            setDeleteAccountOpen(isOpen);
            if (!isOpen) setDeleteAccountError(null);
          }}
          onConfirm={() => {
            void (async () => {
              const result = await deleteAccount();
              if (result.error) setDeleteAccountError(result.error);
            })();
          }}
        />

        <Alert
          open={!!notifPermissionPrompt}
          title='Enable notifications'
          description={notifPermissionPrompt?.message ?? ''}
          confirm='Enable'
          cancel='Not now'
          variant='primary'
          onOpenChange={isOpen => {
            if (!isOpen) dismissNotifPrompt();
          }}
          onConfirm={confirmNotifPrompt}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}
