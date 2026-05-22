# Reference: React Navigation — Core Navigators

---

## Cài đặt

```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context

# Stack Navigator
npm install @react-navigation/native-stack

# Tab Navigator
npm install @react-navigation/bottom-tabs

# Drawer Navigator
npm install @react-navigation/drawer
npm install react-native-gesture-handler react-native-reanimated

cd ios && bundle exec pod install
```

**Android** — `android/app/src/main/java/.../MainActivity.kt`:
```kotlin
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }
}
```

---

## TypeScript — Khai báo route params

```tsx
// types/navigation.ts
export type RootStackParamList = {
  Home: undefined;                          // không có params
  Profile: { userId: string; name?: string }; // params bắt buộc + tùy chọn
  Settings: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Explore: undefined;
  Profile: { userId: string };
};

// Typed hooks
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
```

---

## Stack Navigator

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          animation: 'slide_from_right', // iOS: 'default', Android: 'slide_from_right'
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Trang chủ' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({ title: route.params.name })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## Navigation trong Screen

```tsx
import { useNavigation, useRoute } from '@react-navigation/native';

function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();

  return (
    <View>
      {/* Navigate — thêm vào stack */}
      <Button onPress={() => navigation.navigate('Profile', { userId: '123', name: 'John' })} title="Go to Profile" />

      {/* Push — luôn tạo screen mới kể cả đã có trong stack */}
      <Button onPress={() => navigation.push('Profile', { userId: '456' })} title="Push" />

      {/* Replace — thay thế screen hiện tại */}
      <Button onPress={() => navigation.replace('Settings')} title="Replace" />

      {/* Go back */}
      <Button onPress={() => navigation.goBack()} title="Back" />

      {/* Reset stack */}
      <Button onPress={() => navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })} title="Reset to Home" />

      {/* Pop nhiều screens */}
      <Button onPress={() => navigation.pop(2)} title="Pop 2" />
      <Button onPress={() => navigation.popToTop()} title="Pop to Top" />
    </View>
  );
}
```

---

## Bottom Tab Navigator

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          // Trả về icon component
          return <Icon name={route.name === 'Feed' ? 'home' : 'search'} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarBadge: 3 }} // badge number
      />
    </Tab.Navigator>
  );
}
```

---

## Drawer Navigator

```tsx
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{ drawerType: 'front' }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// Toggle drawer
navigation.toggleDrawer();
navigation.openDrawer();
navigation.closeDrawer();
```

---

## Nhúng navigators (nested)

```tsx
// Tab bên trong Stack
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Navigate vào nested screen từ bất kỳ đâu
navigation.navigate('Main', {
  screen: 'Feed',
  params: { sort: 'latest' },
});
```

---

## Lifecycle hooks

```tsx
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

function MyScreen() {
  // Chạy khi screen focused (kể cả khi navigate back về)
  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        // cleanup khi unfocused
      };
    }, [])
  );

  // Boolean — true khi screen đang focused
  const isFocused = useIsFocused();
}
```
