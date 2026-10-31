import { registerRootComponent } from 'expo';
import { configureReanimatedLogger } from 'react-native-reanimated';

import App from './App';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
// Strict mode flags third-party reads of shared values during render (the bottom sheet); dev-only noise.
configureReanimatedLogger({ strict: false });
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
