import type { GuanliRole, GuanliSession } from '../types';

const SESSION_KEY = 'guanli_session_v1';

export function getSession(): GuanliSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as GuanliSession : null;
  } catch {
    return null;
  }
}

export function setSession(session: GuanliSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem('guanli_token', session.token);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem('guanli_token');
}

export function isRoleAllowed(session: GuanliSession | null, roles: GuanliRole[]) {
  return Boolean(session && roles.includes(session.role));
}
