// Temporary wrapper to replace react-firebase-hooks/auth
// This provides a compatible interface while using our custom auth

import { useRecoilValue } from "recoil";
import { userState } from "../atoms/userAtom";

/**
 * Drop-in replacement for useAuthState from react-firebase-hooks
 * Returns: [user, loading, error]
 */
export const useAuthState = (): [any, boolean, Error | undefined] => {
  const user = useRecoilValue(userState);
  const loading = false; // We load user in useAuth hook on mount
  const error = undefined;
  
  return [user, loading, error];
};

/**
 * Placeholder for other Firebase hooks - to be implemented as needed
 */
export const useCreateUserWithEmailAndPassword = () => {
  throw new Error("Use authAPI.register() instead");
};

export const useSignInWithEmailAndPassword = () => {
  throw new Error("Use authAPI.login() instead");
};

export const useSignInWithGoogle = () => {
  throw new Error("Google OAuth not yet implemented");
};
