import { getCurrentEnv } from '../../config/env';
import { SiteConfig, getBaseUrl } from '../../config/sites';

export const env = getCurrentEnv();

/** Full URL for a path on a site in the environment this run targets. */
export const urlFor = (site: SiteConfig, path = '') => `${getBaseUrl(site.id, env)}${path}`;

/** Prefix for describe blocks, so reports say which site and environment a result belongs to. */
export const label = (site: SiteConfig) => `${site.displayName} [${env}]`;
