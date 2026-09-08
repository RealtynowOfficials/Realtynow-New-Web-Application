declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
export const BUILD_ENV = import.meta.env.MODE;

if (typeof window !== 'undefined') {
  (window as any).__REALTYNOW_VERSION__ = {
    version: APP_VERSION,
    buildTime: BUILD_TIME,
    env: BUILD_ENV,
  };

  if (import.meta.env.DEV) {
    console.log(
      `%c[RealtyNow DEV]%c Hot Reload & HMR Active | v${APP_VERSION} (${BUILD_TIME})`,
      'color: #ffffff; background: #059669; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      'color: #059669; font-weight: bold; margin-left: 6px;',
    );
  } else {
    console.log(
      `%c[RealtyNow]%c v${APP_VERSION} (built ${BUILD_TIME}) [${BUILD_ENV}]`,
      'color: #ffffff; background: #b61f24; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      'color: #64748b; margin-left: 6px;',
    );
  }
}
