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
