const ONE_SIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const APP_ENV = import.meta.env.MODE || "development";

function parseEnvFlag(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isNotificationFeatureEnabled() {
  const envSpecificFlag = parseEnvFlag(import.meta.env[`VITE_NOTIFICATIONS_ENABLED_${APP_ENV.toUpperCase()}`]);
  const globalFlag = parseEnvFlag(import.meta.env.VITE_NOTIFICATIONS_ENABLED);
  const fallback = APP_ENV === "production";
  return envSpecificFlag ?? globalFlag ?? fallback;
}

export function getNotificationEnvironmentInfo() {
  const envFlagKey = `VITE_NOTIFICATIONS_ENABLED_${APP_ENV.toUpperCase()}`;
  return {
    mode: APP_ENV,
    enabledByFlag: isNotificationFeatureEnabled(),
    hasOneSignalAppId: !!ONE_SIGNAL_APP_ID,
    envFlagKey,
    envFlagValue: import.meta.env[envFlagKey] ?? "(não definido)",
    globalFlagValue: import.meta.env.VITE_NOTIFICATIONS_ENABLED ?? "(não definido)"
  };
}

export function isOneSignalConfigured() {
  return !!ONE_SIGNAL_APP_ID && isNotificationFeatureEnabled();
}

export function initOneSignal(user) {
  if (!ONE_SIGNAL_APP_ID || typeof window === "undefined") return;
  if (window.__jcdOneSignalInit) return;
  if (!window.OneSignalDeferred) window.OneSignalDeferred = [];

  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: ONE_SIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false }
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (OneSignal.User?.addTags) {
      await OneSignal.User.addTags({
        reminder_daily_hour: "08:00",
        reminder_timezone_mode: "device",
        reminder_quiet_hours: "22:00-07:00",
        reminder_timezone: timezone
      });
    } else if (OneSignal.sendTags) {
      OneSignal.sendTags({
        reminder_daily_hour: "08:00",
        reminder_timezone_mode: "device",
        reminder_quiet_hours: "22:00-07:00",
        reminder_timezone: timezone
      });
    }

    if (user?.email && OneSignal.login) {
      await OneSignal.login(user.email);
    }
  });

  window.__jcdOneSignalInit = true;
}

export async function requestPushPermission() {
  if (!ONE_SIGNAL_APP_ID || typeof window === "undefined") return false;
  if (!window.OneSignalDeferred) window.OneSignalDeferred = [];

  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (Notification?.permission === "granted") return resolve(true);
        if (OneSignal.Notifications?.requestPermission) {
          await OneSignal.Notifications.requestPermission();
          return resolve(Notification?.permission === "granted");
        }
        resolve(false);
      } catch {
        resolve(false);
      }
    });
  });
}

export async function applyNotificationTags(prefs) {
  if (!ONE_SIGNAL_APP_ID || typeof window === "undefined") return;
  if (!window.OneSignalDeferred) window.OneSignalDeferred = [];

  window.OneSignalDeferred.push(async (OneSignal) => {
    const tags = {
      reminder_daily_hour: prefs.hour,
      reminder_timezone_mode: "device",
      reminder_quiet_hours: prefs.quietHours ? "22:00-07:00" : "off",
      reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      reminder_daily_enabled: prefs.enabled ? "1" : "0",
      reminder_streak_enabled: prefs.enabled ? "1" : "0",
      reminder_challenge_enabled: prefs.enabled ? "1" : "0"
    };

    if (OneSignal.User?.addTags) await OneSignal.User.addTags(tags);
    else if (OneSignal.sendTags) OneSignal.sendTags(tags);

    if (OneSignal.User?.pushSubscription?.optOut) {
      if (prefs.enabled) await OneSignal.User.pushSubscription.optIn();
      else await OneSignal.User.pushSubscription.optOut();
    }
  });
}
