# DreamVora merge update

Homepage (`src/routes/index.tsx`) was updated using the homepage structure/design from `dreamvora.site12`,
while keeping the main project's TanStack Router navigation and existing routes intact.

- Homepage visual/card/pagination styles are scoped under `.dv-home` to avoid changing chat, register, payment, or dashboard styling.
- START CHAT continues to use the main app route `/chat/$name`.
- Withdraw, balance, contact, and app-install controls remain functional in the React app.
- Homepage SEO/canonical/OG URLs use `https://dreamvorra.site`.
- Homepage logo assets from `dreamvora.site12` were copied to `public/assets/images/`.
