import { getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig, getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// Firebase's messaging SW is a plain static file (no Vite env access at
// build time), so config is passed through the registration URL's query
// string instead — see public/firebase-messaging-sw.js.
async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const params = new URLSearchParams(firebaseConfig);
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
}

export interface EnablePushResult {
  success: boolean;
  /** Permission was granted but FCM registration didn't happen (not configured/unsupported) — foreground-only notifications still work. */
  degraded?: boolean;
  error?: string;
}

// Requests notification permission, registers a Firebase Cloud Messaging
// token for this device, and persists it to push_tokens so the send-push
// edge function (triggered from every fn_send_notification() call) can
// actually deliver background pushes to this browser.
export async function enablePushNotifications(userId: string): Promise<EnablePushResult> {
  if (!('Notification' in window)) {
    return { success: false, error: 'This browser does not support notifications' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission was not granted' };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging || !VAPID_KEY) {
    // Permission granted, but FCM isn't configured — GlobalNotificationListener's
    // realtime-driven notifications still work while a tab is open.
    return { success: true, degraded: true };
  }

  try {
    const swRegistration = (await registerMessagingServiceWorker()) ?? undefined;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });

    if (!token) {
      return { success: true, degraded: true };
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform: 'web', is_active: true, last_used: new Date().toISOString() },
        { onConflict: 'token' },
      );
    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: true, degraded: true, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isPushRegistered(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('push_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// Foreground push handler — fires when a push arrives while a tab is
// focused (FCM does not auto-show a system notification in that case).
export async function listenForForegroundPush(
  onPush: (payload: { title?: string; body?: string; link?: string }) => void,
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    onPush({
      title: payload.notification?.title,
      body: payload.notification?.body,
      link: (payload.data as Record<string, string> | undefined)?.link,
    });
  });
}
