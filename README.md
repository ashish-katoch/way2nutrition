# Way2Nutrition

NOW vitamins and adult supplements storefront built with Next.js, React, TypeScript and Supabase, with Razorpay checkout and optional Cloudflare R2 images.

## Run locally

1. Install Node.js 24 LTS.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and configure your own credentials.
4. Set `NEXT_PUBLIC_SITE_URL` to your final website origin for SEO and sitemap URLs.
5. Run `npm run dev` and open http://127.0.0.1:3000.

Run `npm run build` for production and `npm test` for tests. See [SETUP.md](SETUP.md) for database, admin, email, payment and hosting setup. No private credentials are included.

## Brand assets

- `public/logo.svg`: scalable Way2Nutrition leaf wordmark.
- `app/icon.svg`: favicon.
- `app/opengraph-image.tsx`: generated 1200×630 social preview.
- `app/robots.ts` and `app/sitemap.ts`: crawler rules and dynamic catalog sitemap.

Keep payment configuration in test mode until merchant setup and end-to-end payment tests are complete.
