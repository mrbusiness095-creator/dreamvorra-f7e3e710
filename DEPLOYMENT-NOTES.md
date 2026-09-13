# DreamVora deployment notes

This project is configured to use the same source code on both Netlify and Vercel.

## Netlify

The build uses `@netlify/vite-plugin-tanstack-start` and the existing `netlify.toml`.
No application routes or server functions need to be changed.

## Vercel

When Vercel builds the project, the `VERCEL` environment variable selects Nitro's
`vercel` preset. This creates the Vercel-compatible server/function output needed
for TanStack Start SSR and server functions.

Do not add a static SPA rewrite such as `/* -> /index.html` for this project.
DreamVora uses TanStack Start SSR, so requests must reach the server function.

## Important

- Keep `netlify.toml` for Netlify.
- Do not remove `nitro` from `package.json`.
- Do not remove `@netlify/vite-plugin-tanstack-start` from `package.json`.
- Do not replace the TanStack Start routes with a static `index.html` fallback.
- Vercel should be allowed to auto-detect the TanStack Start/Nitro deployment.

## DreamVora final payment flow
- Registration UI remains the working local-storage registration flow from the Lipa Namba build.
- Payment uses ZonmPay USSD Push.
- After the push is paid, the user must press NIMELIPIA.
- Admin reviews PENDING_ADMIN requests at /admin and approves/rejects.
- Approval unlocks the account and returns the user to the pending chat.
- Set ZONMPAY_API_KEY, ZONMPAY_BASE_URL, ZONMPAY_WEBHOOK_URL, NETLIFY_DB_URL, DREAMVORA_AUTH_SECRET and DREAMVORA_ADMIN_PASSWORD in Netlify.
