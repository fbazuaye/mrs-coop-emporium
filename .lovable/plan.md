
# MRS STAFF COOP STORE — Foundation & Design System

Scope: foundation only. No features (no auth, products, cart, checkout). Just brand theme, layout shell, reusable UI primitives, navigation, and installable PWA wiring.

Note on stack: the project is already on **TanStack Start (React + TypeScript + Vite + Tailwind v4)**, not plain Vite+React Router. I'll keep TanStack Start (it's the supported stack here) and treat your "React/Vite/Tailwind" requirement as satisfied. Supabase will be wired via Lovable Cloud later when we start auth/data features — not in this step.

---

## 1. Brand design system (`src/styles.css`)

Replace the default shadcn token palette with the MRS brand tokens (all in `oklch`):

- `--background` → #F8F8F8
- `--foreground` → #1F1F1F
- `--card` / `--popover` → #FFFFFF
- `--primary` → Burgundy #7A0E14, `--primary-foreground` → #FFFFFF
- `--primary-deep` → #5A090D (hover / pressed)
- `--accent` → Premium Gold #F4B400, `--accent-foreground` → #1F1F1F
- `--accent-soft` → Soft Gold #F9D76E
- `--secondary` / `--muted` → soft neutral off-white
- `--border`, `--input`, `--ring` → tuned to burgundy at low chroma
- Dark mode variants for all of the above

Additional design tokens:
- `--radius: 1rem` (rounded, premium feel)
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-gold` (soft layered shadows)
- `--gradient-burgundy`: linear-gradient(135deg, #7A0E14, #5A090D)
- `--gradient-gold`: linear-gradient(135deg, #F4B400, #F9D76E)

Register all new tokens in `@theme inline` so utilities like `bg-primary-deep`, `text-accent-soft`, `shadow-gold` work.

Typography: load **Poppins** (300/400/500/600/700) via `<link>` in `src/routes/__root.tsx` head, set `--font-sans: "Poppins", sans-serif` in `@theme`, apply to `body`.

---

## 2. Reusable UI components (`src/components/`)

Thin, branded wrappers on top of existing shadcn primitives — semantic tokens only, no hardcoded colors.

- `brand/Logo.tsx` — wordmark "MRS Staff Coop Store" with gold accent dot
- `brand/BrandButton.tsx` — variants: `primary` (burgundy), `gold` (premium gold), `outline`, `ghost`
- `layout/AppShell.tsx` — page shell: top bar + main + bottom nav (mobile) / sidebar (desktop)
- `layout/TopBar.tsx` — logo, search slot, account icon
- `layout/BottomNav.tsx` — mobile bottom tab bar (Home, Shop, Cart, Account)
- `layout/Sidebar.tsx` — desktop side nav (same destinations)
- `layout/Container.tsx` — responsive max-width wrapper
- `common/PremiumCard.tsx` — rounded-2xl, soft shadow, hover lift
- `common/SectionHeading.tsx` — display heading + subtitle
- `common/EmptyState.tsx` — placeholder for empty feature pages
- `pwa/InstallPrompt.tsx` — captures `beforeinstallprompt`, shows branded "Install app" banner with dismiss

All navigation uses TanStack Router `<Link>` with `activeProps` for active styling.

---

## 3. Routing & navigation shell

Update `src/routes/__root.tsx`:
- Add Poppins `<link>` tags + brand meta (title "MRS Staff Coop Store", description, theme-color #7A0E14, manifest link, apple-touch-icon)
- Wrap `<Outlet />` in `<AppShell>`

Create placeholder routes (each just an `EmptyState` for now — no features):
- `src/routes/index.tsx` — Home (replace placeholder)
- `src/routes/shop.tsx` — Shop
- `src/routes/cart.tsx` — Cart
- `src/routes/account.tsx` — Account

Each route gets its own `head()` with route-specific title and description.

---

## 4. PWA installability (manifest-only, per PWA skill)

You asked for offline caching, service workers, and push notifications. For this foundation step I'll deliver **installable across Android / iOS / iPad / Windows / Mac** via manifest + icons. Offline service worker and push notifications are deferred to a later prompt because:

- They must be guarded so they never register in the Lovable preview (otherwise the editor breaks).
- Push notifications need a provider decision (Firebase Cloud Messaging vs OneSignal vs Lovable Cloud) and a backend — that belongs with the Supabase/Cloud step.

Foundation PWA deliverables:
- `public/manifest.webmanifest` — name "MRS Staff Coop Store", short_name "MRS Coop", theme_color #7A0E14, background_color #F8F8F8, display "standalone", start_url "/", icons (192, 512, maskable 512)
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png` — generated burgundy + gold monogram
- Head tags in `__root.tsx`: manifest, theme-color, apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-title
- `InstallPrompt` component mounted in `AppShell`

When we add offline + push later, we'll use the guarded `vite-plugin-pwa` path and a separate FCM messaging worker.

---

## 5. Out of scope (explicitly deferred)

- Supabase / Lovable Cloud enablement
- Authentication, products, cart logic, checkout, orders, admin
- Service worker + offline caching
- Push notifications
- Any business data

---

## Technical notes

- Tailwind v4 CSS-first: all tokens in `src/styles.css` under `@theme inline`; no `tailwind.config.js`.
- Poppins loaded via `<link>` in root head (never `@import` URL in styles.css — breaks Lightning CSS).
- No hardcoded colors in components — only semantic utilities (`bg-primary`, `text-accent`, `shadow-gold`).
- Mobile-first: BottomNav < md, Sidebar ≥ md.
- All routes get distinct `head()` metadata.
