# DreamVora login fix

The previous build referenced a stale hosted logo URL (`/__l5e/assets-v1/...`) which returned 404. The logo is now local under `public/dreamvora-logo.svg` and all page metadata/footer references use local assets.

For production authentication, the Netlify site must have these runtime environment variables:

- `NETLIFY_DB_URL` — the production Netlify Database connection string.
- `DREAMVORA_ADMIN_PASSWORD` — the admin password.
- `DREAMVORA_AUTH_SECRET` — a random secret of at least 32 characters.

The server also accepts `NETLIFY_DATABASE_URL` or `DATABASE_URL` as database aliases for older deployments. After changing environment variables, redeploy the site; Netlify applies environment-variable changes on a new build/deploy.
