declare const __APP_VERSION__: string;

import { Browser } from '@capacitor/browser';
import { type User } from '@supabase/supabase-js';
import { ChevronLeft } from 'lucide-react';
import { Switch } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import Alert from '../components/Alert';
import { useHabitContext } from '../contexts/useHabitContext';
import { exportData } from '../utils/dataTransfer';
import { openAppSettings } from '../utils/localNotifications';
import { supabase } from '../utils/supabase';
import { isNative } from '../utils/utils';
import styles from './SettingsPage.module.css';

function LegalLink({
  href,
  nativeUrl,
  children,
}: {
  href: string;
  nativeUrl: string;
  children: React.ReactNode;
}) {
  if (isNative) {
    return (
      <button className='btn-link' onClick={() => void Browser.open({ url: nativeUrl })}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} target='_blank' rel='noreferrer'>
      {children}
    </a>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
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

    const { error: existingError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (!existingError) {
      setAuthLoading(false);
      setAuthStep('verifying');
      return;
    }

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
    <div className='app'>
      <div className='header'>
        <button className='btn-action' onClick={() => void navigate('/')}>
          <ChevronLeft size={16} />
        </button>
        <div className='header-title header-title-centered'>
          <h1>Settings</h1>
        </div>
      </div>

      {notifPermissionPrompt ? (
        <div className='card'>
          <div className={styles.notifPromptPanel}>
            <span className='settings-item-label'>
              {notifPermissionPrompt.title ??
                (notifPermissionPrompt.blocked ? 'Notifications blocked' : 'Enable notifications')}
            </span>
            <span className='settings-item-desc'>{notifPermissionPrompt.message}</span>
            {notifPermissionPrompt.blocked ? (
              <>
                <button
                  className='btn-base btn-primary'
                  onClick={() => {
                    dismissNotifPrompt();
                    void openAppSettings();
                  }}
                >
                  Open Settings
                </button>
                <button className='btn-base btn-ghost' onClick={dismissNotifPrompt}>
                  Not now
                </button>
              </>
            ) : (
              <>
                <button className='btn-base btn-primary' onClick={confirmNotifPrompt}>
                  Enable
                </button>
                <button className='btn-base btn-ghost' onClick={dismissNotifPrompt}>
                  Not now
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className='card'>
            <div className='settings-section'>
              <div className='settings-item'>
                <span className='settings-item-label'>Dark mode</span>
                <Switch.Root
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                  className='switch-root'
                >
                  <Switch.Thumb className='switch-thumb' />
                </Switch.Root>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='settings-section'>
              <div className={styles.settingsItemStack}>
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
              <div className={styles.settingsItemStack}>
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
          </div>

          <div className='card'>
            <div className='settings-section'>
              {user ? (
                <div className={styles.settingsItemStack}>
                  <span className='settings-item-label'>Backup &amp; sync</span>
                  <span className='settings-item-desc'>Signed in as {user.email}</span>
                  <button className='btn-base btn-ghost' onClick={() => void handleSignOut()}>
                    Sign out
                  </button>
                  <button
                    className='btn-base btn-danger'
                    onClick={() => setDeleteAccountOpen(true)}
                  >
                    Delete account
                  </button>
                  {deleteAccountError && (
                    <p className={styles.statusError}>{deleteAccountError}</p>
                  )}
                </div>
              ) : authStep === 'check-inbox' ? (
                <div className={styles.settingsItemStack}>
                  <span className='settings-item-label'>Check your inbox</span>
                  <span className='settings-item-desc'>
                    We sent a magic link to {email}. Check your inbox to create your account and
                    start syncing.
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
                <div className={styles.settingsItemStack}>
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
                  {authError && <p className={styles.statusError}>{authError}</p>}
                </div>
              ) : (
                <div className={styles.settingsItemStack}>
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
                  <p className='auth-clickwrap'>
                    By continuing, you agree to the{' '}
                    <LegalLink href='/terms' nativeUrl='https://getturnip.com/terms'>
                      Terms of Service
                    </LegalLink>{' '}
                    and{' '}
                    <LegalLink href='/privacy' nativeUrl='https://getturnip.com/privacy'>
                      Privacy Policy
                    </LegalLink>
                    .
                  </p>
                  {authError && <p className={styles.statusError}>{authError}</p>}
                </div>
              )}
            </div>
          </div>

          <div className='card'>
            <div className='settings-section'>
              <div className={styles.settingsItemStack}>
                <span className='settings-item-label'>About</span>
                <span className='settings-item-desc'>Turnip v{__APP_VERSION__}</span>
                <span className='settings-item-desc'>Made with {darkMode ?'💜' : '💚'} by Miklós Mándoki</span>
                <div className={styles.settingsAboutLinks}>
                  <LegalLink href='/terms' nativeUrl='https://getturnip.com/terms'>
                    Terms of Service
                  </LegalLink>
                  <LegalLink href='/privacy' nativeUrl='https://getturnip.com/privacy'>
                    Privacy Policy
                  </LegalLink>
                  <LegalLink href='/licences' nativeUrl='https://getturnip.com/licences'>
                    Third-Party Licences
                  </LegalLink>        
                </div>
              </div>
            </div>
          </div>

          {status && (
            <p className={{ ok: styles.statusOk, error: styles.statusError, warning: styles.statusWarning }[status.state]}>
              {status.message}
            </p>
          )}
        </>
      )}

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
    </div>
  );
}
