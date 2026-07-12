/**
 * Better Auth React client — same-origin `/api/auth` (no hardcoded port).
 */
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // Same origin as the Vite/Express host so port fallback (3001, …) still works.
  basePath: '/api/auth',
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  updateUser,
  changePassword,
  changeEmail,
  deleteUser,
} = authClient;
