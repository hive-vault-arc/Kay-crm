# Next.js 16.4.0: offline documentation snapshot

This is a copy of the official, version-matched Markdown documentation bundled with the `next@16.4.0` npm package. It was collected on 2026-10-14 for offline reference while building KEPVY for KAY. It is third-party reference material, not a KAY product decision or an implementation.

- Source: `https://registry.npmjs.org/next/-/next-16.4.0.tgz`, package path `dist/docs/`.
- Package integrity: `sha512-N2C+9q89Z/oLrsepSRS4jRMtwmUZAoZuAHU0e9T6+sAB5DdhADmrnOW+zjYijlrYFmVfmQhGVGy9eMFoB7UgKg==`.
- Contents: 472 original Markdown pages, unchanged, covering App Router, Pages Router, architecture, and community documentation. The package [license](license.md) is included.
- Online sources: [current documentation](https://nextjs.org/docs), [16.4 release notes](https://nextjs.org/blog/next-16-4), and [version-matched docs explanation](https://nextjs.org/docs/app/guides/ai-agents#version-matched-documentation).

## Browse offline

Start at the [documentation index](docs/index.md), then choose [App Router](docs/01-app/index.md), [Pages Router](docs/02-pages/index.md), or [architecture](docs/03-architecture/index.md). Search all pages with `rg -n "term" docs/reference/nextjs/16.4.0/docs` from the KAY project root.

For KAY's proposed Next.js frontend, useful starting points are [installation](docs/01-app/01-getting-started/01-installation.md), [Server and Client Components](docs/01-app/01-getting-started/05-server-and-client-components.md), [authentication](docs/01-app/02-guides/authentication.md), [data security](docs/01-app/02-guides/data-security.md), [backend-for-frontend](docs/01-app/02-guides/backend-for-frontend.md), [Route Handlers](docs/01-app/01-getting-started/15-route-handlers.md), [Proxy](docs/01-app/01-getting-started/16-proxy.md), and [Playwright testing](docs/01-app/02-guides/testing/playwright.md). These are references to evaluate against KAY's existing architecture and API contracts, not automatic changes to them.

This snapshot is pinned and does not update itself. Once KAY has a Next.js application, the installed package's `node_modules/next/dist/docs/` should be the first reference for its actual version. The official package does not bundle individual error-message pages; the [official agent documentation](https://nextjs.org/docs/app/guides/ai-agents#docs-over-the-network) explains how to read those online when an error occurs.
