/**
 * Audio and haptic alarm signals in the browser.
 *
 * Sound is synthesized with the Web Audio API, so no audio files are needed.
 * Vibration only works on devices that support navigator.vibrate.
 * Every function is a safe no-op when the browser lacks the required API.
 */

/** Shared audio context: browsers limit how many contexts can exist at once. */
let sharedAudioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

/**
 * A single tone with a smooth fade-in and fade-out.
 * @param {AudioContext} ctx audio context
 * @param {number} freq frequency, Hz
 * @param {number} start delay from now, s
 * @param {number} duration duration, s
 * @param {number} volume volume 0–1
 */
function beep(ctx, freq, start, duration, volume) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const startAt = ctx.currentTime + start;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.linearRampToValueAtTime(0, startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

/**
 * Air raid siren: three 600 → 1100 → 600 Hz sweeps over 1.8 seconds.
 * @param {number} volumePercent volume from settings, 0–100
 */
export function playSiren(volumePercent) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(600, now);
  for (let wave = 0; wave < 3; wave++) {
    oscillator.frequency.linearRampToValueAtTime(1100, now + wave * 0.6 + 0.3);
    oscillator.frequency.linearRampToValueAtTime(600, now + wave * 0.6 + 0.6);
  }
  gain.gain.setValueAtTime((volumePercent / 100) * 0.25, now);
  gain.gain.linearRampToValueAtTime(0, now + 1.8);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(now + 1.8);
}

/**
 * Double short warning beep (yellow level).
 * @param {number} volumePercent volume from settings, 0–100
 */
export function playAlertBeeps(volumePercent) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const volume = (volumePercent / 100) * 0.3;
  beep(ctx, 880, 0, 0.18, volume);
  beep(ctx, 880, 0.3, 0.18, volume);
}

/**
 * Vibrates the device with a pattern; 0 stops vibration.
 * @param {number | number[]} pattern vibration and pause durations, ms
 */
export function vibrateDevice(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // Some browsers block vibration without a user gesture.
  }
}
