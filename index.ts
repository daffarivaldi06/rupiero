import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import { configureReanimatedLogger } from 'react-native-reanimated';

import App from './App';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

// The widget is Android-only, and on web registering it throws (react-native-web has no headless tasks).
if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
// Strict mode flags third-party reads of shared values during render (the bottom sheet); dev-only noise.
configureReanimatedLogger({ strict: false });
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
