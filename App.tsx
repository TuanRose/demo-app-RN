import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import TurboModuleScreen from './src/06_native_modules/screens/TurboModuleScreen';

export default function App() {
  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <SafeAreaProvider>
      <TurboModuleScreen />
    </SafeAreaProvider>
  );
}
