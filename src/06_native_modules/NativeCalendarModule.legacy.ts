/**
 * This exposes the native CalendarModule module as a JS module. This has a
 * function 'createCalendarEvent' which takes the following parameters:
 *
 * 1. String name: A string representing the name of the event
 * 2. String location: A string representing the location of the event
 */
import {NativeModules} from 'react-native';
const {CalendarModule} = NativeModules;

interface CalendarInterface {
  // Returns eventIdentifier (string) on success — use to query/delete event later
  createCalendarEvent(name: string, location: string): Promise<string>;
  getConstants(): {DEFAULT_EVENT_NAME: string};
}

export default CalendarModule as CalendarInterface;