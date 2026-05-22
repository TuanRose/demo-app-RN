import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { linking } from '../config/linking';
import LoginScreen from '../screens/LoginScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import MainTabNavigator from './MainTabNavigator';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Inner component — reads auth state after AuthProvider is mounted
function Navigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    // NavigationContainer must sit inside AuthProvider so Navigator can read auth context
    <NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          // Auth group — only these screens exist when logged out
          // React Navigation automatically transitions here after signOut
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Main group — only these screens exist when logged in
          // React Navigation automatically transitions here after signIn
          <>
            <Stack.Screen name="Tabs" component={MainTabNavigator} />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{
                headerShown: true,
                title: 'Chi tiết giao dịch',
                presentation: 'card',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}
