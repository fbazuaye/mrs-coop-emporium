# Members & Roles management (Super Admin)

Right now there is **no UI** for assigning roles — the only way is editing the `user_roles` table directly in the backend. Every new signup is auto-assigned `cooperative_member` by the `handle_new_user` trigger, and there is no screen for a Super Admin to promote them to `store_owner`, `fleet_manager`, `credit_officer`, `rider`, or `super_admin`.

I'll add a proper role management page.

## What gets built

**New route:** `/admin/members` (added to the existing Admin tab bar, visible only to `super_admin`)

Features:
- Searchable, paginated list of all members (name, email, phone, staff ID, current roles, joined date)
- Per-member **role editor**: checkboxes for each of the 6 app roles; save adds/removes rows in `user_roles`
- Safety guards:
  - A super admin cannot remove their **own** `super_admin` role (prevents lockout)
  - At least one `super_admin` must always exist in the system
  - Confirmation dialog before granting `super_admin`
- Audit: every grant/revoke writes to `activity_logs`

## Technical details

- New server functions in `src/lib/admin-users.functions.ts`:
  - `listMembers({ search, page })` — uses `requireSupabaseAuth` + verifies caller has `super_admin` via the existing `app_private.has_role` helper, then loads `supabaseAdmin` inside the handler to read `auth.users` joined with `profiles` and `user_roles`
  - `setMemberRoles({ userId, roles })` — verifies caller is `super_admin`, applies safety guards, diffs and writes `user_roles` rows, logs to `activity_logs`
- New page `src/routes/_authenticated/admin/members.tsx` with the table + edit drawer (reusing existing `Sheet`, `Checkbox`, `Input` components)
- Add a "Members" pill to the admin tab nav in `src/routes/_authenticated/admin/route.tsx`, shown only when `role === "super_admin"`

No schema changes — uses the existing `user_roles` table and `app_role` enum.

## Out of scope

- Inviting brand-new users by email (signup still happens via `/auth`)
- Editing profile fields like name/phone (this page is roles-only)

Let me know if you'd like invites or profile editing included, otherwise I'll build the above.
