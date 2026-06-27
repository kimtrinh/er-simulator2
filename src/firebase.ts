/**
 * Local-only stub that replaces Firebase/Firestore.
 *
 * The original MediSim ER app synced clinical history to Firestore and used
 * Google sign-in. This rebuild is a self-contained website with no external
 * accounts, so we keep history in localStorage instead. These exports preserve
 * the same shapes the app imports, but everything is an inert no-op — the app
 * always runs "signed out" and falls back to its built-in localStorage paths.
 */

type AuthCallback = (user: null) => void;

export const auth = {
  currentUser: null as any,
  onAuthStateChanged: (cb: AuthCallback) => {
    // Always signed out; invoke once and return an unsubscribe function.
    cb(null);
    return () => {};
  },
};

export const db = {} as any;

export const signInWithGoogle = async () => {
  // Cloud sync is disabled in the standalone website; history is stored locally.
  console.info("Sign-in is disabled — clinical history is saved locally in this browser.");
};

export const logout = async () => {};

// Firestore primitives — no-ops that keep the call sites valid.
export const collection = (..._args: any[]) => ({});
export const addDoc = async (..._args: any[]) => ({ id: `local-${Date.now()}` });
export const query = (..._args: any[]) => ({});
export const where = (..._args: any[]) => ({});
export const orderBy = (..._args: any[]) => ({});
export const doc = (..._args: any[]) => ({});
export const deleteDoc = async (..._args: any[]) => {};
export const onSnapshot = (_q: any, _next: any, _err?: any) => {
  // No live cloud collection to subscribe to.
  return () => {};
};
export const getDocFromServer = async (..._args: any[]) => ({});
