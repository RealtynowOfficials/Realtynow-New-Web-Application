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
export const MSG91_CAPTCHA_CONTAINER_ID = 'msg91-captcha-container';

/**
 * Finds or ensures the captcha container element is in the document DOM.
 */
export async function ensureCaptchaContainer(): Promise<HTMLElement> {
  let el = document.getElementById(MSG91_CAPTCHA_CONTAINER_ID);
  if (el) return el;

  // Poll for up to 1500ms while React mounts the DOM node
  const start = Date.now();
  while (!el && Date.now() - start < 1500) {
    await new Promise((r) => setTimeout(r, 50));
    el = document.getElementById(MSG91_CAPTCHA_CONTAINER_ID);
  }

  if (!el) {
    el = document.createElement('div');
    el.id = MSG91_CAPTCHA_CONTAINER_ID;
    el.className = 'flex justify-center items-center min-h-[78px] my-2';
    const form = document.querySelector('form') || document.body;
    form.appendChild(el);
  }

  return el;
}

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
let initSettled = false;

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
let lastInitError: string | null = null;

export function getMsg91InitError(): string | null {
  return lastInitError;
}

export function initMsg91Widget(forceRemount = false): Promise<void> {
  const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID as string | undefined;
  const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH as string | undefined;
  if (!widgetId || !tokenAuth) {
    return Promise.reject(
      new Error('MSG91 widget is not configured (VITE_MSG91_WIDGET_ID / VITE_MSG91_TOKEN_AUTH missing)'),
    );
  }

  if (initPromise && !forceRemount && initSettled) {
    const container = document.getElementById(MSG91_CAPTCHA_CONTAINER_ID);
    if (container && container.children.length > 0) {
      return initPromise;
    }
  }

  initSettled = false;
  const run = loadWidgetScript().then(async () => {
    if (!window.initSendOTP) {
      console.error('[MSG91] window.initSendOTP is not defined after script load');
      throw new Error('MSG91 widget script loaded but initSendOTP is unavailable');
    }

    const container = await ensureCaptchaContainer();
    console.log('[MSG91] calling initSendOTP with widgetId:', widgetId, 'into container:', container.id);

    window.initSendOTP({
      widgetId,
      tokenAuth,
      exposeMethods: true,
      captchaRenderId: MSG91_CAPTCHA_CONTAINER_ID,
      success: (data: unknown) => {
        lastInitError = null;
        console.log('[MSG91] initSendOTP success callback', data);
      },
      failure: (err: unknown) => {
        const msg = extractErrorMessage(err, 'unknown');
        lastInitError = msg;
        console.warn('[MSG91] initSendOTP failure callback', msg);
      },
    });

    return waitForExposedMethods(INIT_TIMEOUT_MS);
  });

  initPromise = withTimeout(run, INIT_TIMEOUT_MS, 'MSG91 widget initialization')
    .then(() => {
      initSettled = true;
    })
    .catch((err) => {
      initPromise = null; // allow retrying init on next call
      initSettled = false;
      throw err;
    });
  return initPromise;
}

export async function sendMsg91Otp(mobileE164: string): Promise<string> {
  await initMsg91Widget();
  if (!window.sendOtp) throw new Error('MSG91 widget did not expose sendOtp — please refresh and try again.');
  const identifier = mobileE164.replace(/^\+/, '');
  console.log('[MSG91] Sending OTP for', identifier);
  const run = new Promise<string>((resolve, reject) => {
    window.sendOtp!(
      identifier,
      (data) => {
        console.log('[MSG91] sendOtp success', data);
        resolve(data.message);
      },
      (err) => {
        console.error('[MSG91] sendOtp failure', err);
        const errMsg = extractErrorMessage(err, '');
        if (lastInitError === 'IPBlocked' || errMsg.includes('IPBlocked') || errMsg.includes('Blocked')) {
          reject(new Error('Security Block: Your IP or domain is not whitelisted in MSG91. Please check allowed origins in your MSG91 widget dashboard.'));
        } else if (errMsg.toLowerCase().includes('captcha')) {
          reject(new Error('Security verification required. Please complete the captcha check above.'));
        } else {
          reject(new Error(errMsg || 'Failed to send OTP. Please try again.'));
        }
      },
    );
  });
  return await withTimeout(run, SEND_TIMEOUT_MS, 'Sending OTP');
}

export async function verifyMsg91Otp(otp: string, reqId?: string): Promise<string> {
  if (!window.verifyOtp) {
    throw new Error('OTP session expired. Please go back and request a new OTP.');
  }

  return new Promise((resolve, reject) => {
    window.verifyOtp!(
      otp,
      (data) => resolve(data.message),
      (err) => {
        console.error('[MSG91] verifyOtp failure', err);
        reject(new Error(extractErrorMessage(err, 'Invalid or expired OTP. Please try again.')));
      },
      reqId,
    );
  });
}

export async function retryMsg91Otp(reqId?: string): Promise<void> {
  if (!window.retryOtp) {
    throw new Error('OTP session expired. Please go back and request a new OTP.');
  }
  return new Promise((resolve, reject) => {
    window.retryOtp!(
      '11', // SMS
      () => resolve(),
      (err) => {
        console.error('[MSG91] retryOtp failure', err);
        reject(new Error(extractErrorMessage(err, 'Could not resend OTP. Please try again.')));
      },
      reqId,
    );
  });
}
