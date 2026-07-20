/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  KeyRound,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  Wallet,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  useSession,
  signIn,
  signUp,
  signOut,
  updateUser,
  changePassword,
  changeEmail,
  deleteUser,
} from '../lib/auth-client';
import { UiButton } from './ui/UiButton';
import { UiTextHeader } from './ui/UiTextHeader';

type AuthMode = 'signIn' | 'signUp';

interface AccountScreenProps {
  /** Called after sign-in / sign-up / sign-out so GameContext can rehydrate. */
  onAuthChanged: () => void;
}

function fieldClassName() {
  return 'w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-stone-100 font-sans focus:outline-none focus:border-amber-500 placeholder:text-stone-600';
}

function labelClassName() {
  return 'block text-[10px] uppercase tracking-widest text-stone-500 font-sans font-bold mb-1.5';
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-stone-900/40 border border-stone-800 rounded-sm p-5 space-y-4">
      <UiTextHeader as="h2" icon={icon} className="!min-w-0">
        {title}
      </UiTextHeader>
      {children}
    </section>
  );
}

function StatusMessage({
  kind,
  message,
}: {
  kind: 'ok' | 'error';
  message: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 text-xs font-sans ${
        kind === 'ok' ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {kind === 'ok' ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </p>
  );
}

/** Guest: sign in / create account forms. */
function AuthForms({ onAuthChanged }: { onAuthChanged: () => void }) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signUp') {
        const { error: err } = await signUp.email({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
        });
        if (err) {
          setError(err.message ?? 'Could not create account.');
          return;
        }
      } else {
        const { error: err } = await signIn.email({
          email: email.trim(),
          password,
        });
        if (err) {
          setError(err.message ?? 'Could not sign in.');
          return;
        }
      }
      onAuthChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
          <User size={22} />
        </div>
        <h1 className="text-xl font-serif font-bold text-stone-100 tracking-tight">
          {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-stone-500 font-sans">
          {mode === 'signIn'
            ? 'Sign in to load and save your guild across sessions.'
            : 'Register to bind a guild ledger to your account. Web3 wallets come later.'}
        </p>
      </div>

      <form onSubmit={submit} className="bg-stone-900/40 border border-stone-800 rounded-sm p-5 space-y-4">
        {mode === 'signUp' && (
          <div>
            <label className={labelClassName()} htmlFor="account-name">
              Display name
            </label>
            <input
              id="account-name"
              className={fieldClassName()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Captain of the Crest"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className={labelClassName()} htmlFor="account-email">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            required
            className={fieldClassName()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className={labelClassName()} htmlFor="account-password">
            Password
          </label>
          <input
            id="account-password"
            type="password"
            required
            minLength={8}
            className={fieldClassName()}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && <StatusMessage kind="error" message={error} />}

        <UiButton type="submit" disabled={busy} fullWidth>
          {mode === 'signIn' ? <LogIn size={14} /> : <UserPlus size={14} />}
          {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </UiButton>
      </form>

      <p className="text-center text-xs text-stone-500 font-sans">
        {mode === 'signIn' ? (
          <>
            No account yet?{' '}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 font-bold"
              onClick={() => {
                setMode('signUp');
                setError(null);
              }}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already registered?{' '}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 font-bold"
              onClick={() => {
                setMode('signIn');
                setError(null);
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

/** Signed-in account dashboard. */
function AccountDashboard({
  onAuthChanged,
}: {
  onAuthChanged: () => void;
}) {
  const { data: session, refetch } = useSession();
  const user = session!.user;

  const [displayName, setDisplayName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setDisplayName(user.name ?? '');
    setEmail(user.email ?? '');
  }, [user.name, user.email]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    void run('profile', async () => {
      const { error } = await updateUser({ name: displayName.trim() });
      if (error) throw new Error(error.message ?? 'Could not update profile.');

      if (email.trim() && email.trim() !== user.email) {
        const { error: emailErr } = await changeEmail({ newEmail: email.trim() });
        if (emailErr) throw new Error(emailErr.message ?? 'Could not update email.');
      }

      await refetch();
      setMessage({ kind: 'ok', text: 'Profile updated.' });
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run('password', async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match.');
      }
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters.');
      }
      const { error } = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message ?? 'Could not change password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ kind: 'ok', text: 'Password changed. Other sessions were signed out.' });
    });
  };

  const handleSignOut = () => {
    void run('signOut', async () => {
      await signOut();
      onAuthChanged();
    });
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    void run('delete', async () => {
      if (
        !window.confirm(
          'Permanently delete this account and its guild save? This cannot be undone.'
        )
      ) {
        return;
      }
      const { error } = await deleteUser({ password: deletePassword });
      if (error) throw new Error(error.message ?? 'Could not delete account.');
      onAuthChanged();
    });
  };

  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toLocaleDateString()
      : user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-stone-100 tracking-tight">Account</h1>
          <p className="text-sm text-stone-500 font-sans mt-1">
            Manage your Guilds of Ardessia identity and security.
          </p>
        </div>
        <UiButton type="button" onClick={handleSignOut} disabled={busy === 'signOut'} variant="ghost">
          <LogOut size={14} />
          {busy === 'signOut' ? 'Signing out…' : 'Sign out'}
        </UiButton>
      </div>

      {message && <StatusMessage kind={message.kind} message={message.text} />}

      <Section title="Profile" icon={<User size={14} />}>
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-500 overflow-hidden shrink-0">
            {user.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Shield size={24} />
            )}
          </div>
          <div className="min-w-0 font-sans">
            <p className="text-sm font-bold text-stone-100 truncate">{user.name}</p>
            <p className="text-xs text-stone-500 truncate">{user.email}</p>
            <p className="text-[10px] text-stone-600 uppercase tracking-wider mt-1">
              Member since {createdAt}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className={labelClassName()} htmlFor="profile-name">
              Display name
            </label>
            <input
              id="profile-name"
              className={fieldClassName()}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClassName()} htmlFor="profile-email">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
              <input
                id="profile-email"
                type="email"
                className={`${fieldClassName()} pl-9`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <UiButton type="submit" disabled={busy === 'profile'}>
            {busy === 'profile' ? 'Saving…' : 'Save profile'}
          </UiButton>
        </form>
      </Section>

      <Section title="Security" icon={<KeyRound size={14} />}>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className={labelClassName()} htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              required
              className={fieldClassName()}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClassName()} htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                className={fieldClassName()}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelClassName()} htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                className={fieldClassName()}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <UiButton type="submit" disabled={busy === 'password'}>
            {busy === 'password' ? 'Updating…' : 'Change password'}
          </UiButton>
        </form>
      </Section>

      <Section title="Connected wallets" icon={<Wallet size={14} />}>
        <p className="text-sm text-stone-400 font-sans leading-relaxed">
          Web3 wallet linking (SIWE) is prepared in the database and will connect here once Better Auth
          wallet support is enabled. You will be able to bind an on-chain address to this account.
        </p>
        <UiButton type="button" disabled variant="ghost">
          <Wallet size={14} />
          Connect wallet — coming soon
        </UiButton>
      </Section>

      <Section title="Danger zone" icon={<Trash2 size={14} className="text-red-400" />}>
        <p className="text-sm text-stone-400 font-sans">
          Deleting your account permanently removes your profile and guild save from the database.
        </p>
        <form onSubmit={handleDelete} className="space-y-3">
          <div>
            <label className={labelClassName()} htmlFor="delete-password">
              Confirm with your password
            </label>
            <input
              id="delete-password"
              type="password"
              required
              className={fieldClassName()}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <UiButton type="submit" disabled={busy === 'delete'} variant="danger">
            <Trash2 size={14} />
            {busy === 'delete' ? 'Deleting…' : 'Delete account'}
          </UiButton>
        </form>
      </Section>
    </div>
  );
}

export function AccountScreen({ onAuthChanged }: AccountScreenProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center text-stone-500 text-xs font-sans uppercase tracking-widest">
        Loading account…
      </div>
    );
  }

  if (!session?.user) {
    return <AuthForms onAuthChanged={onAuthChanged} />;
  }

  return <AccountDashboard onAuthChanged={onAuthChanged} />;
}
