import { NativeModules } from 'react-native';

let appleAuthenticationModulePromise = null;

export const hasExpoNativeModule = (moduleName) => Boolean(
  globalThis.expo?.modules?.[moduleName] ||
  NativeModules?.NativeUnimoduleProxy?.exportedMethods?.[moduleName] ||
  NativeModules?.[moduleName]
);

export const hasExpoViewManager = (moduleName) => Boolean(
  NativeModules?.NativeUnimoduleProxy?.viewManagersMetadata?.[moduleName]
);

export const getAppleAuthenticationModule = async () => {
  if (!hasExpoNativeModule('ExpoAppleAuthentication')) {
    return null;
  }

  if (!appleAuthenticationModulePromise) {
    appleAuthenticationModulePromise = import('expo-apple-authentication').catch(() => null);
  }

  return appleAuthenticationModulePromise;
};
