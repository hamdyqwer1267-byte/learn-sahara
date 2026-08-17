import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, ShieldMinus, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createAdminUser } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  head: () => ({
    meta: [
      { title: "إدارة المشرفين | لوحة تحكم المدرّس" },
      { name: "description", content: "إنشاء حسابات أدمن جديدة ومنح أو سحب صلاحيات الإدارة." },
      { property: "og:title", content: "إدارة المشرفين" },
      { property: "og:description", content: "إنشاء حسابات أدمن جديدة ومنح أو سحب صلاحيات الإدارة." },
    ],
  }),
  component: AdminAdmins,
});

type ProfileRow = { id: string; full_name: string; phone: string; grade: string };

function AdminAdmins() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const createAdmin = useServerFn(createAdminUser);

  const { data } = useQuery({
    queryKey: ["admin-people"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,grade").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return { profiles: (profiles ?? []) as ProfileRow[], adminIds };
    },
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const result = await createAdmin({
        data: {
          email: String(f.get("email") ?? ""),
          password: String(f.get("password") ?? ""),
          full_name: String(f.get("full_name") ?? ""),
        },
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["admin-people"] });
    } catch {
      toast.error("تعذّر إنشاء حساب الأدمن");
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (userId: string, makeAdmin: boolean) => {
    const { error } = makeAdmin
      ? await supabase.from("user_roles").insert({ user_id: userId, role: "admin" })
      : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast.error("تعذّر تعديل الصلاحية");
      return;
    }
    toast.success(makeAdmin ? "تمت الترقية إلى أدمن" : "تم سحب صلاحية الأدمن");
    await queryClient.invalidateQueries({ queryKey: ["admin-people"] });
  };

  const people = (data?.profiles ?? []).filter((p) =>
    (p.full_name + p.phone).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-primary" /> إنشاء حساب أدمن
          </CardTitle>
          <CardDescription>يتم تفعيل البريد تلقائيًا ويمكن للحساب الدخول فورًا.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="na-name">الاسم</Label>
              <Input id="na-name" name="full_name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="na-email">البريد الإلكتروني</Label>
              <Input id="na-email" name="email" type="email" dir="ltr" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="na-pass">كلمة المرور</Label>
              <Input id="na-pass" name="password" type="password" dir="ltr" minLength={6} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">المستخدمون والصلاحيات</CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف"
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
          {people.map((p) => {
            const isAdmin = data?.adminIds.has(p.id) ?? false;
            const isSelf = p.id === user?.id;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="font-bold">{p.full_name || "بدون اسم"}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">
                    {p.phone || "—"} · {p.grade || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "أدمن" : "طالب"}</Badge>
                  <Button
                    size="sm"
                    variant={isAdmin ? "ghost" : "secondary"}
                    disabled={isSelf}
                    onClick={() => toggleRole(p.id, !isAdmin)}
                  >
                    {isAdmin ? <ShieldMinus className="size-4" /> : <ShieldCheck className="size-4" />}
                    {isAdmin ? "سحب الصلاحية" : "ترقية لأدمن"}
                  </Button>
                </div>
              </div>
            );
          })}
          {!people.length ? <p className="py-10 text-center text-muted-foreground">لا توجد نتائج.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
