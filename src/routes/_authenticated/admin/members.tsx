import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Shield, UserCog, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import {
  listMembers,
  setMemberRoles,
  type MemberRow,
  type AppRole,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/members")({
  component: MembersPage,
});

const ALL_ROLES: AppRole[] = [
  "super_admin",
  "store_owner",
  "fleet_manager",
  "credit_officer",
  "rider",
  "cooperative_member",
];

function MembersPage() {
  const { role, user } = useAuth();
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MemberRow | null>(null);

  async function load() {
    try {
      const data = await listMembers({ data: {} });
      setMembers(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load members");
      setMembers([]);
    }
  }

  useEffect(() => {
    if (role === "super_admin") void load();
  }, [role]);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.staff_id ?? "").toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q),
    );
  }, [members, query]);

  if (role !== "super_admin") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 font-display text-xl font-semibold">Super Admin only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need Super Admin access to manage member roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone or staff ID"
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {members?.length ?? 0} members
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="hidden grid-cols-[1.4fr_1.6fr_1fr_2fr_120px] gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
          <div>Member</div>
          <div>Contact</div>
          <div>Staff ID</div>
          <div>Roles</div>
          <div className="text-right">Action</div>
        </div>
        {members === null ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No members found.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1.4fr_1.6fr_1fr_2fr_120px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {m.full_name || "—"}
                    {m.id === user?.id && (
                      <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-primary">
                        you
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground md:hidden">
                    {m.email}
                  </div>
                </div>
                <div className="hidden min-w-0 text-sm text-muted-foreground md:block">
                  <div className="truncate">{m.email ?? "—"}</div>
                  <div className="truncate text-xs">{m.phone ?? ""}</div>
                </div>
                <div className="hidden text-sm text-muted-foreground md:block">
                  {m.staff_id ?? "—"}
                </div>
                <div className="hidden flex-wrap gap-1 md:flex">
                  {m.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No role</span>
                  ) : (
                    m.roles.map((r) => (
                      <Badge
                        key={r}
                        variant={r === "super_admin" ? "default" : "secondary"}
                        className={
                          r === "super_admin"
                            ? "bg-gradient-burgundy text-primary-foreground"
                            : ""
                        }
                      >
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                    <UserCog className="h-4 w-4" /> Manage
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditDrawer
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setMembers((prev) =>
            prev ? prev.map((m) => (m.id === updated.id ? updated : m)) : prev,
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditDrawer({
  member,
  onClose,
  onSaved,
}: {
  member: MemberRow | null;
  onClose: () => void;
  onSaved: (m: MemberRow) => void;
}) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) setSelected(member.roles);
  }, [member]);

  if (!member) return null;
  const isSelf = member.id === user?.id;

  function toggle(r: AppRole) {
    setSelected((curr) =>
      curr.includes(r) ? curr.filter((x) => x !== r) : [...curr, r],
    );
  }

  async function save() {
    if (!member) return;
    if (
      selected.includes("super_admin") &&
      !member.roles.includes("super_admin") &&
      !confirm(`Grant SUPER ADMIN access to ${member.full_name || member.email}?`)
    ) {
      return;
    }
    setSaving(true);
    try {
      await setMemberRoles({
        data: { userId: member.id, roles: selected },
      });
      toast.success("Roles updated");
      onSaved({ ...member, roles: selected });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update roles");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage roles
          </SheetTitle>
          <SheetDescription>
            {member.full_name || member.email}
            {member.staff_id && (
              <span className="ml-2 text-xs">· {member.staff_id}</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {ALL_ROLES.map((r) => {
            const checked = selected.includes(r);
            const disableSelf = isSelf && r === "super_admin" && checked;
            return (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:bg-muted/40 ${
                  checked ? "border-primary/60 bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={checked}
                  disabled={disableSelf}
                  onCheckedChange={() => toggle(r)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{ROLE_LABELS[r]}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[r]}
                  </div>
                  {disableSelf && (
                    <div className="mt-1 text-[11px] text-amber-600">
                      You cannot remove your own super admin role.
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full access to everything, including role management.",
  store_owner: "Manage products, categories, orders, and analytics.",
  fleet_manager: "Manage riders, assignments, and fleet operations.",
  credit_officer: "Review and approve credit requests and repayments.",
  rider: "Use the rider app to fulfill deliveries.",
  cooperative_member: "Default member — shop, order, and request credit.",
};
