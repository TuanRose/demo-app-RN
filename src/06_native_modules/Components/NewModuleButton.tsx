import React, {useState} from 'react';
import {Alert, Button, Text, StyleSheet, View} from 'react-native';
import NativeCalendarModule from '../NativeCalendarModule.legacy';

const NewModuleButton = () => {
  const [eventId, setEventId] = useState<string | null>(null);

  const onPress = async () => {
    const defaultName = NativeCalendarModule.getConstants().DEFAULT_EVENT_NAME;
    try {
      const id = await NativeCalendarModule.createCalendarEvent(defaultName, 'Ho Chi Minh City');
      setEventId(id);
      Alert.alert('Success', `Event created!\nID: ${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    }
  };

  return (
    <View>
      <Button
        title="Create Calendar Event"
        color="#841584"
        onPress={onPress}
      />
      {eventId && (
        <Text style={styles.eventId} numberOfLines={2}>
          Last event ID: {eventId}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventId: {fontSize: 10, color: '#555', marginTop: 8, fontFamily: 'monospace'},
});

export default NewModuleButton;