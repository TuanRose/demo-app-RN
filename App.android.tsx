import React, {useEffect} from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';

export default function App() {
  useEffect(() => {
    BootSplash.hide({fade: true});
  }, []);

  return (
    <SafeAreaProvider>
      <AndroidHome />
    </SafeAreaProvider>
  );
}

function AndroidHome() {
  const {top, bottom} = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {paddingTop: top + 24, paddingBottom: bottom + 32},
      ]}>
      <Text style={styles.title}>Demo App</Text>
      <Text style={styles.subtitle}>Android · {Platform.Version}</Text>

      <InfoCard
        label="CI/CD"
        accent="#1452CC"
        description="Built and deployed via Fastlane + GitHub Actions → Google Play Internal Testing"
      />

      <InfoCard
        label="iOS ONLY"
        accent="#C84B11"
        description="Native module screens (NativeDeviceBattery, TurboModule) are iOS-only — built with Swift and not available on Android."
      />

      <InfoCard
        label="ARCHITECTURE"
        accent="#2E7D32"
        description="This branch (feat/demo_deploy_Android) ships a safe Android build. iOS screens are excluded via App.android.tsx platform split."
      />
    </ScrollView>
  );
}

type InfoCardProps = {
  label: string;
  accent: string;
  description: string;
};

function InfoCard({label, accent, description}: InfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.chip, {backgroundColor: accent + '18', borderColor: accent + '40'}]}>
        <Text style={[styles.chipText, {color: accent}]}>{label}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F0F2F5'},
  content: {paddingHorizontal: 16, gap: 14},

  title: {fontSize: 26, fontWeight: '800', color: '#0D0D0D', letterSpacing: -0.5},
  subtitle: {fontSize: 13, color: '#888', marginTop: 2, marginBottom: 4},

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {fontSize: 11, fontWeight: '800', letterSpacing: 1.2},
  description: {fontSize: 14, color: '#555', lineHeight: 20},
});
