import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform, Text } from 'react-native';
import { Provider } from 'react-redux';
import { focusManager } from '@tanstack/react-query';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import { store } from './store';

// Singleton — không tạo trong component để tránh reset cache khi re-render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      // refetchOnWindowFocus: false trên mobile — không có "window focus"
      // thay vào đó dùng AppState listener bên dưới
    },
  },
});

// React Native dùng AppState thay cho window focus event của web
function useAppFocusManager() {
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);
}

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function AppTabs() {
  useAppFocusManager();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#aaa',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabIcon emoji="⚙️" />,
        }}
      />
    </Tab.Navigator>
  );
}

// Provider order: Redux → QueryClient → NavigationContainer
// Redux outermost vì RTK Query (nếu dùng) cần access Redux store qua middleware
export default function StateManagementDemo() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppTabs />
        </NavigationContainer>
      </QueryClientProvider>
    </Provider>
  );
}
