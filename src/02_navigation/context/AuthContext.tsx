import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

type AuthState = {
  isLoading: boolean;
  userToken: string | null;
};

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string | null }
  | { type: 'SIGN_IN'; token: string }
  | { type: 'SIGN_OUT' };

type AuthContextType = {
  userToken: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return { ...state, userToken: action.token, isLoading: false };
    case 'SIGN_IN':
      return { ...state, userToken: action.token };
    case 'SIGN_OUT':
      return { ...state, userToken: null };
  }
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: false,
    // In-memory only — production: restore from react-native-keychain on mount
    userToken: null,
  });

  // useMemo prevents re-render of entire tree when AuthProvider re-renders
  const value = useMemo<AuthContextType>(
    () => ({
      userToken: state.userToken,
      isLoading: state.isLoading,
      signIn: (token: string) => {
        // Production: await Keychain.setGenericPassword('token', token)
        dispatch({ type: 'SIGN_IN', token });
      },
      signOut: () => {
        // Production: await Keychain.resetGenericPassword()
        dispatch({ type: 'SIGN_OUT' });
      },
    }),
    [state.userToken, state.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useAuthActions(): Pick<AuthContextType, 'signIn' | 'signOut'> {
  const { signIn, signOut } = useAuth();
  const stableSignIn = useCallback(signIn, [signIn]);
  const stableSignOut = useCallback(signOut, [signOut]);
  return { signIn: stableSignIn, signOut: stableSignOut };
}
