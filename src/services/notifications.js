/**
 * Browser permissions requested during onboarding and system notifications.
 *
 * System notifications are shown through the service worker registration, which
 * is required on mobile browsers and lets the notification appear while the app
 * is in the background.
 */

/** Asks for location access; the browser shows its own permission prompt. */
export function requestLocationPermission() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    () => {},
    () => {},
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

/** Asks for permission to show notifications. Resolves to the resulting permission state. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Shows a system notification when the app is in the background and permission is granted.
 * In the foreground the in-app banner is enough, so nothing is shown twice.
 * @param {{ title: string, text: string, tag?: string }} notification
 */
export async function showSystemNotification({ title, text, tag }) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const options = { body: text, tag: tag || 'chron', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // Notifications are an addition to the in-app banner; failures are not critical.
  }
}
