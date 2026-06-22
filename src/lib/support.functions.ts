import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SupportMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const getSupportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportMessageRow[]> => {
    const { data, error } = await context.supabase
      .from("support_messages")
      .select("id, role, content, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? [])
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        content: r.content,
      }));
  });

export const clearSupportHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("support_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
