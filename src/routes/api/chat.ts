import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `You are "AI Support", the friendly virtual assistant for MRS Staff Cooperative Society Store — a members-only e-commerce platform for staff of MRS.

You help cooperative members with:
- Product questions (catalog, prices in Nigerian Naira ₦, categories like rice, agro, food, household)
- Delivery questions (rider dispatch, tracking via the Orders page, delivery fees, free delivery on orders over ₦50,000)
- Credit questions (cooperative members can request credit, repay over salary cycles, view balance under Credit; credit requires approval by the Credit Officer)
- Order questions (placing, tracking, status flow: pending → approved → processing → packed → assigned_rider → picked_up → out_for_delivery → delivered)
- Account questions (profile, roles such as cooperative_member, store_owner, credit_officer, fleet_manager, rider, super_admin)

Cooperative knowledge base:
- Currency is always Nigerian Naira (₦). Use "₦20,000" formatting.
- Members get cooperative pricing; non-members cannot shop.
- Credit: members can request a credit line, get approved by a Credit Officer, then repay via salary deduction. View under Credit menu.
- Live shopping sessions are hosted by Store Owners; members can join from the Live page.
- Orders are tracked in real time on a map once a rider is assigned.
- For sensitive actions (placing orders, paying, withdrawing credit), guide users to the correct page rather than performing it for them.

Style:
- Be concise, warm, and helpful. Use short paragraphs and bullet lists when useful.
- When asked about specific products like "rice under ₦20,000" — explain that you don't have live catalog access yet and direct them to the Shop page filters.
- When asked to "track my order", direct them to the Orders page and explain the live map feature.
- Never invent prices, order numbers, or account details. If unsure, say so and point to the relevant page.
- Always answer in English unless the user writes in another language.`;

type ChatBody = { messages?: unknown };

async function getUserIdFromAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const uiMessages = messages as UIMessage[];

        const userId = await getUserIdFromAuth(request);

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ messages: finalMessages }) => {
            if (!userId) return;
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              // Persist only the latest user message and the new assistant reply.
              const newOnes = finalMessages.slice(uiMessages.length - 1);
              const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
              const rows: Array<{ user_id: string; role: string; content: string }> = [];
              if (lastUser) {
                const text = lastUser.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .trim();
                if (text) rows.push({ user_id: userId, role: "user", content: text });
              }
              for (const m of newOnes) {
                if (m.role !== "assistant") continue;
                const text = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .trim();
                if (text) rows.push({ user_id: userId, role: "assistant", content: text });
              }
              if (rows.length > 0) {
                await supabaseAdmin.from("support_messages").insert(rows);
              }
            } catch (err) {
              console.error("[ai support] persist failed", err);
            }
          },
        });
      },
    },
  },
});
