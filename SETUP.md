# Fieldwork merchant setup

The application is Next.js App Router + React + TypeScript. Supabase supplies PostgreSQL, merchant authentication and row-level access. R2 stores uploaded product photos. Razorpay supplies INR checkout. OpenNext adapts the app for Cloudflare Workers.

## Run locally

Use Node 24 LTS and npm. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Without Supabase credentials the catalog shows six explicitly marked sample products. The bag and saved products work locally. `/admin` opens a clearly marked demo studio before Supabase is connected; edits are stored only in that browser and can be reset. Real merchant sign-in, shared products/orders and payment require connected accounts. Demo mode never grants access to the protected admin API.

## Connect Supabase

1. Create a Supabase project. Run `supabase/schema.sql` once in its SQL editor on a fresh project. Run `supabase/seed.sql` if you want the six sample products in your database. The seed does not overwrite existing product edits.
2. Put the project URL, publishable key and secret service key (using the environment names in `.env.example`) in the server environment variables shown in `.env.example`. The service key must remain server-only. Only the URL and anon key are returned by `/api/config` for merchant authentication.
3. Create your merchant user through Supabase Authentication. Copy its user UUID and run this in the SQL editor, replacing the placeholder:

```sql
insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');
```

4. Open `/admin`, sign in, and manage names, descriptions, categories, images, pack sizes, INR prices, available stock and published status. Hide a product to remove it from the storefront. Existing SKUs cannot move between products. Reload and retry if stock changes while editing. Prices in the database use paise (49900 = ₹499).

Once Supabase is connected, it becomes the catalog source; a database failure is reported rather than silently reverting to sample stock. Admin API calls validate the authenticated user and database admin membership on every request.

## Connect R2 images

Create an R2 bucket and scoped API credentials with object read/write access for that bucket. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL` (the bucket's public custom-domain base URL). The admin uploader accepts PNG, JPEG and WebP up to 5 MB, validates the file signature, generates a unique key, and returns its public URL. Configure public image delivery on that bucket domain; do not expose R2 credentials to the browser. Existing HTTPS image URLs can also be entered directly.

## Connect Razorpay in test mode first

Set `RAZORPAY_KEY_ID=rzp_test_...`, its matching secret, and a webhook secret. In Razorpay, configure automatic payment capture and an HTTPS webhook at `/api/payments/webhook` on the final storefront domain. Subscribe to `payment.captured` and `order.paid`. Test a successful payment, cancellation, provider failure and webhook replay before enabling live keys.

Checkout currently supports Indian addresses, INR, delivery included, and tax-inclusive catalog prices. There are no separately calculated shipping fees or tax invoices. Set actual inclusive selling prices and confirm these delivery/tax policies before real selling; changing the policy requires adding a server-side fee/tax calculation and matching checkout display.

Stock is reserved transactionally for 20 minutes. Reservations expire on subsequent checkout and receipt requests. For unattended expiry, schedule `select public.expire_reservations(100);` every minute with Supabase Cron; repeat if more than 100 expire in one minute. Order totals are built from database prices. Browser-provided prices are ignored. Payment signatures and webhook HMACs are checked server-side. Successful captures are idempotent; late captures after stock release require merchant review. The private receipt link reconciles captured payments with Razorpay if the browser callback was missed. Treat receipt links as confidential.

Set `STORE_MODE=live` only after replacing or hiding all sample products, entering real stock, configuring live Razorpay keys/webhook, merchant identity, support contact, shipping/return/privacy policies and completing a live low-value test. Without valid provider configuration the payment button stays disabled.

## Hosting and checks

`npm run typecheck`, `npm test`, `npm run build:cloudflare` build/verify the app. `npx wrangler deploy` deploys using `wrangler.jsonc` to your own Cloudflare account; configure the same runtime secrets there. The Sites publication keeps the existing private demo audience. A public customer store/custom domain still needs its hosting/access configured deliberately.

`tests/commerce.sql` is a transaction-based database check for a disposable test database after applying the schema; it rolls its test changes back. It must never be used as a schema migration. The payment tests use mocked provider responses; real Razorpay/Supabase/R2 integration testing remains required once accounts are connected.

Orders appear in `/admin` with contact/delivery information. Paid orders can be marked processing, shipped or delivered. Shipment booking, order notification emails, refunds and tax invoices are not implemented; arrange fulfillment manually or add those integrations before promising them to customers.

The original storefront layout, loader, navigation, seven homepage sections and motion scripts are retained as a client component in `components/restored-storefront.tsx`, with assets under `public/storefront`. It reads the Next.js product API and shares the cart storage format with checkout. Admin and checkout use full-page navigation so the retained storefront scripts stay within their own document.


## Customer accounts

Run `supabase/migrations/20261114_customer_accounts.sql` in the existing project SQL Editor. This migration was applied successfully during setup. It adds customer profiles, saved products and recently viewed products with row-level policies; products and orders are preserved.

Customer routes are `/account/signup`, `/account/login`, `/account/forgot-password`, `/account/reset-password` and `/account`. The account dashboard includes signed-in order history, favorites, recent products and preferred delivery details. Checkout links orders only to the verified signed-in customer and prefills blank delivery fields. Guest orders remain accessible through their private receipts. Guest favorites stay on the device and separate from signed-in account favorites. Merchant access still requires membership in `admin_users`.

In Supabase Authentication URL Configuration, set the Site URL to the storefront origin and allow the exact `/auth/callback` and `/account/reset-password` redirects on that origin (plus localhost only for development). Email confirmation and password reset use PKCE; open the email link in the same browser that requested it.

Configure custom SMTP before opening signup to the public: Supabase's default email service is restricted to project-team recipients. Real external confirmation/reset email delivery is not verified yet. Google sign-in appears only when the Google provider is enabled in Supabase; it currently remains disabled pending Google OAuth client credentials. OAuth Server settings are unnecessary for customer sign-in.

Verification: API ownership/origin/session-switch tests, database RLS isolation checks, and browser checks with two disposable customers cover login, logout, separate favorites, recent products, profile saving and checkout prefill. Payment and external email delivery still require their provider setup and end-to-end checks.
