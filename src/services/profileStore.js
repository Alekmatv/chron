/**
 * User profile edited in the app (name and contact), kept on the device.
 * Without an account backend, this is the source of the profile shown in the app.
 */

const STORAGE_KEY = 'chron_profile';

/** Saved profile fields ({ name?, contact? }), or an empty object. */
export function loadProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/** Saves profile fields on the device. */
export function saveProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The profile still applies for this session.
  }
}

/** Initials for the avatar: first letters of the first two words of the name. */
export function initialsOf(name) {
  return (
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
  );
}
