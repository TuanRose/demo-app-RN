# Reference: Auth Flow với React Navigation

---

## Pattern chuẩn — Conditional Stack

React Navigation tự động navigate đến đúng screen khi auth state thay đổi.
**Không gọi `navigation.navigate()` thủ công sau login/logout.**

```tsx
// App.tsx
import React, { useEffect, useReducer, useMemo, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store'; // hoặc react-native-keychain

const Stack = createNativeStackNavigator();

// --- Auth Context ---
type AuthContextType = {
  signIn: (token: string) => void;
  signOut: () => void;
  signUp: (token: string) => void;
};
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// --- Reducer ---
type AuthState = { isLoading: boolean; userToken: string | null };
type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string | null }
  | { type: 'SIGN_IN'; token: string }
  | { type: 'SIGN_OUT' };

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

// --- App Component ---
function App() {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    userToken: null,
  });

  // Restore token khi app khởi động
  useEffect(() => {
    const bootstrapAsync = async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        // Token bị corrupted → không làm gì, user sẽ login lại
      }
      dispatch({ type: 'RESTORE_TOKEN', token });
    };
    bootstrapAsync();
  }, []);

  // Expose auth methods qua context — memoize để tránh re-render
  const authContext = useMemo<AuthContextType>(() => ({
    signIn: async (token) => {
      await SecureStore.setItemAsync('userToken', token);
      dispatch({ type: 'SIGN_IN', token });
    },
    signOut: async () => {
      await SecureStore.deleteItemAsync('userToken');
      dispatch({ type: 'SIGN_OUT' });
    },
    signUp: async (token) => {
      await SecureStore.setItemAsync('userToken', token);
      dispatch({ type: 'SIGN_IN', token });
    },
  }), []);

  // Hiển thị splash screen trong khi đang restore token
  if (state.isLoading) {
    return <SplashScreen />;
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {state.userToken == null ? (
            // Unauthenticated screens
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            // Authenticated screens
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
```

---

## Dùng Auth Context trong screens

```tsx
function LoginScreen() {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const token = await authService.login(email, password);
      await signIn(token);
      // Không cần navigation.navigate() — React Navigation tự redirect
    } catch (error) {
      Alert.alert('Lỗi', 'Email hoặc mật khẩu không đúng');
    }
  };

  return (/* ... */);
}

function ProfileScreen() {
  const { signOut } = useContext(AuthContext);
  return (
    <Button onPress={signOut} title="Đăng xuất" />
    // Sau signOut, React Navigation tự navigate về Login
  );
}
```

---

## Screen xuất hiện trong cả 2 states (shared screens)

```tsx
// Dùng navigationKey để force unmount khi auth state đổi
<Stack.Screen
  navigationKey={state.userToken ? 'user' : 'guest'}
  name="Help"
  component={HelpScreen}
/>
```

---

## Deep link đến màn hình protected (chưa login)

```tsx
// Trong linking config — nhớ unhandled route sau khi login
const linking = {
  config: {
    screens: {
      Login: 'login',
      Main: {
        screens: {
          Profile: 'profile/:userId',  // user cần login mới vào được
        },
      },
    },
  },
  // Nếu deep link vào protected screen khi chưa login:
  // React Navigation sẽ navigate về Login
  // Sau khi login, cần handle navigate đến intended screen
};
```

---

## Lưu ý quan trọng

1. **Không gọi `navigation.navigate('Home')` sau login** → sẽ gây lỗi nếu screen không tồn tại trong current navigator.
2. `SecureStore` (Expo) hoặc `react-native-keychain` — luôn lưu token ở secure storage.
3. `useMemo` cho `authContext` bắt buộc — tránh re-render toàn bộ app mỗi khi parent render.
4. Splash screen ẩn trong khi `isLoading: true` — tránh flash of wrong content.
