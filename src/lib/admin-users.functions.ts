import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type MemberRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  staff_id: string | null;
  created_at: string | null;
  roles: AppRole[];
};

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin only");
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<MemberRow[]> => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, phone, staff_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const search = data.search?.trim();
    if (search) {
      q = q.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%,staff_id.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roleRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (rolesErr) throw new Error(rolesErr.message);

    const byUser = new Map<string, AppRole[]>();
    for (const r of roleRows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      byUser.set(r.user_id, arr);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      staff_id: p.staff_id,
      created_at: p.created_at,
      roles: byUser.get(p.id) ?? [],
    }));
  });

export const setMemberRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; roles: AppRole[] }) => {
    if (!input?.userId) throw new Error("userId required");
    if (!Array.isArray(input.roles)) throw new Error("roles required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const desired = Array.from(new Set(data.roles));

    // Safety: can't strip your own super_admin
    if (data.userId === context.userId && !desired.includes("super_admin")) {
      throw new Error("You cannot remove your own super_admin role.");
    }

    // Safety: at least one super_admin must remain
    if (!desired.includes("super_admin")) {
      const { data: others, error: cntErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact" })
        .eq("role", "super_admin")
        .neq("user_id", data.userId);
      if (cntErr) throw new Error(cntErr.message);
      if (!others || others.length === 0) {
        throw new Error("At least one super_admin must remain.");
      }
    }

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if (exErr) throw new Error(exErr.message);

    const current = new Set((existing ?? []).map((r) => r.role as AppRole));
    const toAdd = desired.filter((r) => !current.has(r));
    const toRemove = [...current].filter((r) => !desired.includes(r));

    if (toAdd.length) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert(toAdd.map((role) => ({ user_id: data.userId, role })));
      if (error) throw new Error(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .in("role", toRemove);
      if (error) throw new Error(error.message);
    }

    // Audit
    if (toAdd.length || toRemove.length) {
      await supabaseAdmin.from("activity_logs").insert({
        actor_id: context.userId,
        action: "user_roles.update",
        entity_type: "user",
        entity_id: data.userId,
        metadata: { added: toAdd, removed: toRemove },
      });
    }

    return { ok: true, added: toAdd, removed: toRemove };
  });
