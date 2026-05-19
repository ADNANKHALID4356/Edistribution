import React from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import RootNavigator from '../src/navigation/RootNavigator';
import ErrorBoundary from '../src/components/ErrorBoundary';

// ===== COMPREHENSIVE ERROR SUPPRESSION =====
// Ignore ALL logs to prevent any error/warning boxes from showing to users
LogBox.ignoreAllLogs(true);

// Additionally suppress specific warning patterns
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'Setting a timer',
  'Possible Unhandled Promise Rejection',
  'Warning:',
  'Error:',
]);

// Override global promise rejection handler to prevent error display
const originalHandler = global.Promise.prototype.catch;
global.Promise.prototype.catch = function(onRejected) {
  return originalHandler.call(this, function(error) {
    // Silently handle promise rejections
    if (onRejected) {
      return onRejected(error);
    }
  });
};

// Suppress console methods that cause red boxes
if (__DEV__) {
  const noop = () => {};
  console.error = noop;
  console.warn = noop;
  // Keep console.log for debugging but make it less noisy
  const originalLog = console.log;
  console.log = (...args) => {
    // Filter out service logs
    const stack = new Error().stack || '';
    if (!stack.includes('/services/') && !stack.includes('\\services\\')) {
      originalLog(...args);
    }
  };
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    error: '#ef4444',
  },
};

export default function Index() {
  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ToastProvider>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
