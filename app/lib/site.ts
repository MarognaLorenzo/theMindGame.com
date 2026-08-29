// The canonical public origin of the site. Single source of truth for every
// absolute URL we hand to search engines - page metadata, Open Graph tags,
// JSON-LD, the sitemap and robots.txt. A mismatch between this and the domain
// actually served is read as a second, competing site, so keep it in sync with
// the Pages custom domain (and the ALLOWED_ORIGINS var in wrangler.toml).
export const SITE_URL = "https://themindgame.app";
