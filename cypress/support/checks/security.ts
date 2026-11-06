import type { SecurityContext } from '../../../lib/security';

export interface SecurityCheck {
  id: string;
  title: string;
  run: (ctx: SecurityContext) => { passed: boolean; detail: string };
}

const HSTS_MIN_SECONDS = 15_552_000; // about 180 days

export const SECURITY_CHECKS: SecurityCheck[] = [
  {
    id: 'https-redirect',
    title: 'Plain http:// redirects to https://',
    run: (ctx) => {
      if (!ctx.isHttps) return { passed: false, detail: 'base URL is not https' };
      return {
        passed: ctx.httpRedirectsToHttps === true,
        detail: ctx.httpRedirectsToHttps ? 'http redirects to https' : 'http does not redirect to https',
      };
    },
  },
  {
    id: 'strict-transport-security',
    title: 'Strict-Transport-Security (HSTS) is set with a long max-age',
    run: (ctx) => {
      const value = ctx.headers['strict-transport-security'];
      if (!value) return { passed: false, detail: 'header missing' };
      const maxAge = Number(/max-age=(\d+)/i.exec(value)?.[1] ?? 0);
      return { passed: maxAge >= HSTS_MIN_SECONDS, detail: `max-age=${maxAge} (${value})` };
    },
  },
  {
    id: 'x-content-type-options',
    title: 'X-Content-Type-Options is nosniff',
    run: (ctx) => {
      const value = ctx.headers['x-content-type-options'];
      return { passed: value?.toLowerCase() === 'nosniff', detail: value ?? 'header missing' };
    },
  },
  {
    id: 'clickjacking-protection',
    title: 'Page cannot be framed (X-Frame-Options or CSP frame-ancestors)',
    run: (ctx) => {
      const xfo = ctx.headers['x-frame-options'];
      const csp = ctx.headers['content-security-policy'] ?? '';
      const passed = Boolean(xfo) || /frame-ancestors/i.test(csp);
      return { passed, detail: xfo ?? (passed ? 'CSP frame-ancestors' : 'neither header present') };
    },
  },
  {
    id: 'content-security-policy',
    title: 'Content-Security-Policy is set',
    run: (ctx) => {
      const value = ctx.headers['content-security-policy'];
      return { passed: Boolean(value), detail: value ? 'present' : 'header missing' };
    },
  },
  {
    id: 'referrer-policy',
    title: 'Referrer-Policy is set',
    run: (ctx) => {
      const value = ctx.headers['referrer-policy'];
      return { passed: Boolean(value), detail: value ?? 'header missing' };
    },
  },
  {
    id: 'info-disclosure',
    title: 'Response does not reveal server software or version',
    run: (ctx) => {
      const leaks: string[] = [];
      const server = ctx.headers['server'];
      if (server && /\d+\.\d+/.test(server)) leaks.push(`Server: ${server}`);
      const poweredBy = ctx.headers['x-powered-by'];
      if (poweredBy) leaks.push(`X-Powered-By: ${poweredBy}`);
      return { passed: leaks.length === 0, detail: leaks.join('; ') || 'nothing revealed' };
    },
  },
  {
    id: 'cookie-flags',
    title: 'Cookies are Secure, HttpOnly and SameSite',
    run: (ctx) => {
      if (ctx.setCookies.length === 0) return { passed: true, detail: 'no cookies set on the first response' };
      const weak = ctx.setCookies
        .map((cookie) => {
          const missing = ['secure', 'httponly', 'samesite'].filter(
            (flag) => !new RegExp(`(^|;\\s*)${flag}(=|;|$)`, 'i').test(cookie),
          );
          return missing.length ? `${cookie.split('=')[0]} (missing ${missing.join(', ')})` : null;
        })
        .filter((entry): entry is string => entry !== null);
      return { passed: weak.length === 0, detail: weak.join('; ') || 'all cookies have the flags' };
    },
  },
  {
    id: 'tls-certificate',
    title: 'TLS certificate is valid and not expiring within 14 days',
    run: (ctx) => {
      if (!ctx.tls) return { passed: false, detail: 'site is not served over https' };
      if ('error' in ctx.tls) return { passed: false, detail: ctx.tls.error };
      return { passed: ctx.tls.daysUntilExpiry > 14, detail: `${ctx.tls.daysUntilExpiry} day(s) until expiry` };
    },
  },
];
