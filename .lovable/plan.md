
## Problem

- The runtime error `Expected to find a match below the root match in SPA mode` fires when opening `/live/<sessionId>`. Cause: `src/routes/live.tsx` is the listing page, but in TanStack's flat routing it is also the parent layout for `src/routes/live.$sessionId.tsx`. It does not render an `<Outlet />`, so the child route matches but has nowhere to render → crash. You never actually reach the YouTube player.
- The `toEmbed()` helper in `live.$sessionId.tsx` only recognises `youtube.com/watch?v=ID` and `youtu.be/ID`. Other valid YouTube URL shapes (live, shorts, embed, share links with `si=` / `t=` params) fall through and get loaded as an iframe src that YouTube blocks → blank black player.

## Fix

### 1. Split the listing from the dynamic route

- Rename `src/routes/live.tsx` → `src/routes/live.index.tsx` (no other code changes — the file already represents the `/live` listing). This removes the implicit parent-layout role.
- Result: `/live` renders the list, `/live/<sessionId>` renders the session page directly under root, no Outlet needed. Routes are regenerated automatically by the Vite plugin.

### 2. Broaden YouTube URL parsing in `src/routes/live.$sessionId.tsx`

Replace `toEmbed()` so it returns a proper `https://www.youtube.com/embed/<id>?autoplay=1&playsinline=1` URL for these inputs:

- `youtube.com/watch?v=ID` (with any extra query params)
- `youtu.be/ID`
- `youtube.com/live/ID`
- `youtube.com/shorts/ID`
- `youtube.com/embed/ID`
- URLs ending in `/live` for a channel handle → leave as-is (cannot be embedded by ID); fall back to showing a "Open on YouTube" link so the admin gets a clear signal instead of a blank frame.

Also update the player branch condition so any URL matched by the new YouTube/Vimeo parser uses the iframe path (current condition `/\.m3u8|youtube|youtu\.be|vimeo/.test(...) && /youtube|youtu\.be|vimeo/.test(...)` is redundant and brittle).

### 3. Verify

- Hard-reload `/live`, click the "Test Stream" card → `/live/<id>` loads without the SPA invariant error.
- Paste a `youtube.com/live/<id>` style URL in admin → player embeds and plays.
- Console + runtime errors clean.

## Files touched

- rename `src/routes/live.tsx` → `src/routes/live.index.tsx` (content unchanged)
- edit `src/routes/live.$sessionId.tsx` (rewrite `toEmbed` + simplify the iframe-vs-video condition; add graceful fallback for unembeddable YouTube channel-live URLs)

No DB, RLS, or `live.ts` changes required.
