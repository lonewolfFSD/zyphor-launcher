const SESSION_KEY = 'zyphor.auth.uid.v1';
// saveUid()    — call this after every successful login (AuthGate + auto-login restore)
// loadUid()    — call this on app boot to attempt session restore
// clearSession() — call this on logout or when rememberLogin is disabled

export function saveUid(uid) {
  try {
    localStorage.setItem(SESSION_KEY, uid);
  } catch {}
}

export function loadUid() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}