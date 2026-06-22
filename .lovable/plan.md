## Problem

The `live-thumbnails` storage bucket is **private** (Is Public: No), but the upload code uses `supabase.storage.from("live-thumbnails").getPublicUrl(path)`. `getPublicUrl` only works for public buckets — for private ones it returns a URL that 404s, which is why the `<img>` shows a broken-image icon.

## Fix

Make the `live-thumbnails` bucket public via a migration. Thumbnails are meant to be displayed on the public homepage and live session pages, so a public bucket is the right model (same as typical product images for an e-commerce storefront).

### Migration
```sql
update storage.buckets set public = true where id = 'live-thumbnails';
```

No code changes needed — `getPublicUrl` will then return a working URL, and the already-uploaded thumbnail (the one shown broken in the screenshot) will start rendering immediately.

### Why not signed URLs
Signed URLs expire and would force every viewer (including unauthenticated homepage visitors) to mint a URL per view. Public read is simpler and matches how the thumbnails are used.
