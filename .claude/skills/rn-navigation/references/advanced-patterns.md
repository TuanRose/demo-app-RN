# Reference: React Navigation — Advanced Patterns

---

## Modal Stack

```tsx
// Modal được present từ bất kỳ đâu trong app
const RootStack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <RootStack.Navigator>
      {/* Main app screens */}
      <RootStack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />

      {/* Modals — presentation: 'modal' cho iOS sheet style */}
      <RootStack.Screen
        name="PhotoPicker"
        component={PhotoPickerScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <RootStack.Screen
        name="FilterSheet"
        component={FilterSheetScreen}
        options={{ presentation: 'transparentModal' }} // overlay modal
      />
    </RootStack.Navigator>
  );
}
```

**Presentation options:**
- `card` — default, slide from right
- `modal` — iOS sheet, Android bottom sheet
- `transparentModal` — overlay với transparent background
- `fullScreenModal` — full screen modal
- `formSheet` — iOS form sheet (smaller)

---

## Header customization

```tsx
// Từ screen options
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  options={({ navigation, route }) => ({
    title: route.params.name,
    headerRight: () => (
      <Pressable onPress={() => navigation.navigate('Settings')}>
        <Icon name="settings" />
      </Pressable>
    ),
    headerLeft: () => (
      <Pressable onPress={navigation.goBack}>
        <Icon name="back" />
      </Pressable>
    ),
    headerBackground: () => (
      <BlurView tint="light" style={StyleSheet.absoluteFill} />
    ),
  })}
/>

// Từ trong component (setOptions)
function ProfileScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({
      title: 'Dynamic Title',
      headerRight: () => <SaveButton />,
    });
  }, [navigation]);
}
```

---

## Tab badge và custom tab bar

```tsx
<Tab.Screen
  name="Inbox"
  component={InboxScreen}
  options={{
    tabBarBadge: unreadCount || undefined, // undefined ẩn badge
    tabBarBadgeStyle: { backgroundColor: 'red' },
  }}
/>

// Custom tab bar hoàn toàn
<Tab.Navigator
  tabBar={(props) => <CustomTabBar {...props} />}
>
```

---

## Reset navigation state

```tsx
import { CommonActions, StackActions } from '@react-navigation/native';

// Reset stack hoàn toàn (dùng khi logout)
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  })
);

// Reset về Home sau login
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'Main',
        state: {
          routes: [{ name: 'Feed' }],
        },
      },
    ],
  })
);

// StackActions
navigation.dispatch(StackActions.replace('NewScreen', { param: 'value' }));
navigation.dispatch(StackActions.pop(2)); // pop 2 screens
navigation.dispatch(StackActions.popToTop());
```

---

## Navigate từ ngoài component (service/store)

```tsx
// Tạo navigation ref
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// App.tsx
<NavigationContainer ref={navigationRef}>

// Dùng từ bất kỳ đâu (service, interceptor, notification handler)
import { navigationRef } from './navigation/ref';

function navigateToScreen(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params);
  }
}

// Ví dụ trong Axios interceptor
api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    navigateToScreen('Login');
  }
  return Promise.reject(error);
});
```

---

## Android Back Button override

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';

function MyScreen() {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (someCondition) {
          // Xử lý custom back
          doSomething();
          return true; // prevent default back behavior
        }
        return false; // default behavior (go back)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [someCondition])
  );
}
```

---

## Navigation state persistence

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  const [initialState, setInitialState] = useState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('navigationState');
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        if (state) setInitialState(state);
      } finally {
        setIsReady(true);
      }
    };
    if (!isReady) restoreState();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) => {
        AsyncStorage.setItem('navigationState', JSON.stringify(state));
      }}
    >
      {/* ... */}
    </NavigationContainer>
  );
}
```
