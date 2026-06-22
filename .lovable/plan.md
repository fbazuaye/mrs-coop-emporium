
## Why it's slow

`/live/$sessionId` shows "Loading live session…" until `session` is set in state. Today the page does:

```ts
Promise.all([fetchSession, fetchSessionProducts, fetchRecentMessages]).then(([s,p,m]) => { setSession(s); setProducts(p); setMessages(m); });
```

So the player + title + chat shell don't render until the **slowest** of the three resolves. The two slow ones are:

- `fetchSessionProducts` does a deep nested embed `products(...,product_images(...))` — Supabase has to plan a 3-table join for every featured product.
- `fetchRecentMessages` pulls up to 80 rows with `ORDER created_at DESC`.

If either query is slow (cold cache, lots of messages, lots of products), the whole page is blocked even though the session row itself returns in ~50ms. There is no per-section loading state and no error surfacing — a failure in any query also leaves the page stuck on the loader forever.

`bumpViewerPeak` also calls `db.rpc("noop")` which doesn't exist; it's caught silently but is an unnecessary round trip.

Indexes and RLS are fine — this is purely a frontend data-loading issue.

## Fix

Decouple the three fetches in `src/routes/live.$sessionId.tsx` so the page renders as soon as the session row arrives.

1. **Independent effects** for `fetchSession`, `fetchSessionProducts`, `fetchRecentMessages`. Each sets its own state, surfaces its own error via `toast.error`, and does not block the others.
2. **Render gate uses only `session`** — exactly as today, but now it resolves on a single fast query (~1 row by id) instead of the slowest of three.
3. **Per-section skeletons** for products grid and chat list so users see structure immediately ("Loading chat…", "Loading products…") instead of a single blank page.
4. **Trim chat** initial fetch from 80 → 40 messages. Realtime fills in new ones; older history is rarely scrolled on first paint.
5. **Drop the dead `db.rpc("noop")` call** inside `bumpViewerPeak` in `src/lib/live.ts` — pure latency with no purpose.

No DB changes, no RLS changes, no route changes.

## Files

- `src/routes/live.$sessionId.tsx` — split the single Promise.all into 3 effects; add skeletons; reduce message limit.
- `src/lib/live.ts` — remove the no-op RPC call from `bumpViewerPeak`.
