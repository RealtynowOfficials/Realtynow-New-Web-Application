// MSG91 OTP Widget loader + thin promise wrapper.
//
// Uses MSG91's publicly documented Widget JS integration (script tag +
// window.initSendOTP / window.sendOtp / window.verifyOtp / window.retryOtp).
// Cross-check method names/response shapes against the exact embed snippet
// shown in the MSG91 dashboard for this widget if MSG91 ever changes their
// SDK — this file is the single place that would need updating.
//
// Every step logs to the console prefixed "[MSG91]" and every promise has a
// timeout, specifically so failures are visible (console + toast) instead
// of the UI hanging silently forever — check the browser console if the
// "Send OTP" button ever seems stuck.

const WIDGET_SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js';
const INIT_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 15_000;

// MSG91 renders its captcha challenge into this DOM element when
// exposeMethods is true. Without a captchaRenderId, MSG91 has nowhere to
// run the captcha and every sendOtp call fails with "Invalid Captcha Token".
// The OTP login page must render an element with this id somewhere in the DOM.
export const MSG91_CAPTCHA_CONTAINER_ID = 'msg91-captcha-container';

interface Msg91SendSuccess {
  message: string; // request/reqId used by verifyOtp's failure paths
  type: 'success';
}
interface Msg91VerifySuccess {
  message: string; // MSG91 access token — send this to our edge function
  type: 'success';
}

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (
      identifier: string,
      onSuccess: (data: Msg91SendSuccess) => void,
      onFailure: (err: unknown) => void,
    ) => void;
    verifyOtp?: (
      otp: string,
      onSuccess: (data: Msg91VerifySuccess) => void,
      onFailure: (err: unknown) => void,
      reqId?: string,
    ) => void;
    // Channel codes per MSG91 docs: '11' = SMS, '4' = Voice, '3' = Email,
    // '12' = WhatsApp. `null` is documented as "default" but MSG91 rejects
    // it in practice ("Channel not provided in retryOtp() method"), so we
    // always pass an explicit code — SMS, matching this widget's configured
    // primary channel.
    retryOtp?: (
      channel: '11' | '4' | '3' | '12',
      onSuccess: (data: Msg91SendSuccess) => void,
      onFailure: (err: unknown) => void,
      reqId?: string,
    ) => void;
  }
}

// MSG91's failure callbacks don't consistently pass an Error instance — often
// a string, or an object like { message }/{ reason }/{ type }. Extract
// whatever's there so the real reason reaches the toast, not a generic one.
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    for (const key of ['message', 'reason', 'type', 'error']) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim()) return val;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

let scriptLoadPromise: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  console.log('[MSG91] loading widget script:', WIDGET_SCRIPT_SRC);
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (existing) {
      console.log('[MSG91] widget script already present in DOM');
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      console.log('[MSG91] widget script loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('[MSG91] widget script failed to load — check Network tab for', WIDGET_SCRIPT_SRC);
      reject(new Error('Failed to load MSG91 widget script'));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

let initPromise: Promise<void> | null = null;

function waitForExposedMethods(timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.sendOtp) {
        console.log('[MSG91] window.sendOtp is now available');
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('MSG91 widget did not expose sendOtp in time'));
        return;
      }
      setTimeout(check, 150);
    };
    check();
  });
}

// With exposeMethods: true, MSG91's initSendOTP config `success`/`failure`
// callbacks are for its own embedded verification UI (which we're not
// using) — they don't reliably fire just because init finished. So instead
// of trusting them, we call initSendOTP (fire-and-forget) and poll for
// window.sendOtp to actually exist, which is the real precondition we need.
export function initMsg91Widget(): Promise<void> {
  if (initPromise) return initPromise;

  const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID as string | undefined;
  const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH as string | undefined;
  if (!widgetId || !tokenAuth) {
    return Promise.reject(
      new Error('MSG91 widget is not configured (VITE_MSG91_WIDGET_ID / VITE_MSG91_TOKEN_AUTH missing)'),
    );
  }

  const run = loadWidgetScript().then(() => {
    if (window.sendOtp) return; // already exposed, e.g. from a previous mount
    if (!window.initSendOTP) {
      console.error('[MSG91] window.initSendOTP is not defined after script load');
      throw new Error('MSG91 widget script loaded but initSendOTP is unavailable');
    }
    console.log('[MSG91] calling initSendOTP with widgetId:', widgetId);
    window.initSendOTP({
      widgetId,
      tokenAuth,
      exposeMethods: true,
      captchaRenderId: MSG91_CAPTCHA_CONTAINER_ID,
      success: (data: unknown) => console.log('[MSG91] initSendOTP success callback', data),
      failure: (err: unknown) => console.warn('[MSG91] initSendOTP failure callback', extractErrorMessage(err, 'unknown')),
    });
    return waitForExposedMethods(INIT_TIMEOUT_MS);
  });

  initPromise = withTimeout(run, INIT_TIMEOUT_MS, 'MSG91 widget initialization').catch((err) => {
    initPromise = null; // allow retrying init on next call
    throw err;
  });
  return initPromise;
}

export async function sendMsg91Otp(mobileE164: string): Promise<string> {
  await initMsg91Widget();
  if (!window.sendOtp) throw new Error('MSG91 widget did not expose sendOtp — check widget config');
  // MSG91's sendOtp expects "country code + number" with no leading "+".
  const identifier = mobileE164.replace(/^\+/, '');
  console.log('[MSG91] calling sendOtp for', identifier);
  const run = new Promise<string>((resolve, reject) => {
    window.sendOtp!(
      identifier,
      (data) => {
        console.log('[MSG91] sendOtp success', data);
        resolve(data.message);
      },
      (err) => {
        console.error('[MSG91] sendOtp failure', err);
        reject(new Error(extractErrorMessage(err, 'Failed to send OTP')));
      },
    );
  });
  return withTimeout(run, SEND_TIMEOUT_MS, 'Sending OTP');
}

export async function verifyMsg91Otp(otp: string, reqId?: string): Promise<string> {
  if (!window.verifyOtp) throw new Error('MSG91 widget is not initialized — please resend the OTP');
  return new Promise((resolve, reject) => {
    window.verifyOtp!(
      otp,
      (data) => resolve(data.message),
      (err) => {
        console.error('[MSG91] verifyOtp failure', err);
        reject(new Error(extractErrorMessage(err, 'Invalid or expired OTP')));
      },
      reqId,
    );
  });
}

export async function retryMsg91Otp(reqId?: string): Promise<void> {
  if (!window.retryOtp) throw new Error('MSG91 widget is not initialized — please refresh and try again');
  return new Promise((resolve, reject) => {
    window.retryOtp!(
      '11', // SMS
      () => resolve(),
      (err) => {
        console.error('[MSG91] retryOtp failure', err);
        reject(new Error(extractErrorMessage(err, 'Failed to resend OTP')));
      },
      reqId,
    );
  });
}
