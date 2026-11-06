import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

/** What the security specs need to know about a site, gathered once in Node. */
export interface SecurityContext {
  baseUrl: string;
  isHttps: boolean;
  headers: Record<string, string>;
  setCookies: string[];
  /** true/false once tested; null when the site isn't served over https. */
  httpRedirectsToHttps: boolean | null;
  tls: { daysUntilExpiry: number } | { error: string } | null;
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
}

/** One request, no redirects followed, so we see the first answer the server gives. */
function head(url: string, timeoutMs = 15_000): Promise<RawResponse> {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(url, { timeout: timeoutMs, headers: { 'user-agent': 'cypress-framework/1.0' } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode ?? 0, headers: res.headers });
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
  });
}

function checkCertificate(hostname: string): Promise<{ daysUntilExpiry: number } | { error: string }> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 10_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return resolve({ error: 'no certificate returned' });
      resolve({ daysUntilExpiry: Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000) });
    });
    socket.on('error', (err) => resolve({ error: err.message }));
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ error: 'TLS connection timed out' });
    });
  });
}

export async function gatherSecurityContext(baseUrl: string): Promise<SecurityContext> {
  const url = new URL(baseUrl);
  const isHttps = url.protocol === 'https:';

  // Follow same-host redirects by hand (apex -> www is common) but stop at the first real page.
  let response = await head(baseUrl);
  for (let hops = 0; hops < 5 && response.status >= 300 && response.status < 400 && response.headers.location; hops++) {
    response = await head(new URL(response.headers.location, baseUrl).toString());
  }

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.headers)) {
    if (name !== 'set-cookie') headers[name] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
  const setCookies = response.headers['set-cookie'] ?? [];

  let httpRedirectsToHttps: boolean | null = null;
  if (isHttps) {
    try {
      const plain = await head(`http://${url.host}${url.pathname}`);
      httpRedirectsToHttps = plain.status >= 300 && plain.status < 400 && /^https:/i.test(String(plain.headers.location ?? ''));
    } catch {
      httpRedirectsToHttps = false;
    }
  }

  return {
    baseUrl,
    isHttps,
    headers,
    setCookies,
    httpRedirectsToHttps,
    tls: isHttps ? await checkCertificate(url.hostname) : null,
  };
}
