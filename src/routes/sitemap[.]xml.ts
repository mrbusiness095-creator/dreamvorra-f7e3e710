import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { usersDatabase } from "@/data/users";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "https://dreamvorra.site";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          ...usersDatabase.map((u) => ({
            path: `/chat/${encodeURIComponent(u.name)}`,
            changefreq: "weekly",
            priority: "0.7",
          })),
        ];

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              `    <changefreq>${e.changefreq}</changefreq>`,
              `    <priority>${e.priority}</priority>`,
              `  </url>`,
            ].join("\n"),
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});