import { type User } from '@supabase/supabase-js';
import { Dialog, Switch } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';

import { useHabitContext } from '../contexts/useHabitContext';
import { exportData } from '../utils/dataTransfer';
import { supabase } from '../utils/supabase';

export default function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { habits, completions, applyImport, darkMode, toggleDarkMode } = useHabitContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'ok' | 'warning';
  } | null>(null);

  // --- Auth state ---
  const [user, setUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<'idle' | 'verifying'>('idle');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSendOtp() {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setAuthStep('verifying');
  }

  async function handleVerifyOtp() {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
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
        setStatus(
          result.success
            ? {
                message: result.warning ?? 'Import successful.',
                state: result.warning ? 'warning' : 'ok',
              }
            : { message: result.error ?? 'Import failed.', state: 'error' }
        );
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
              </div>
            ) : authStep === 'verifying' ? (
              <div className='settings-item-stack'>
                <span className='settings-item-label'>Check your email</span>
                <span className='settings-item-desc'>Enter the 8-digit code sent to {email}</span>
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
                  onClick={() => { setAuthStep('idle'); setAuthError(null); }}
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
                  {authLoading ? 'Sending…' : 'Send code'}
                </button>
                {authError && <p className='settings-status-error'>{authError}</p>}
              </div>
            )}
          </div>

          {status && <p className={`settings-status-${status.state}`}>{status.message}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
