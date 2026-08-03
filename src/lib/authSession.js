const SESSION_KEY = 'zyphor.auth.uid.v1';

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