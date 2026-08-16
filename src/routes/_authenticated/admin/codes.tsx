import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Ticket, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/codes")({
  head: () => ({
    meta: [
      { title: "أكواد التفعيل | لوحة تحكم المدرّس" },
      { name: "description", content: "توليد أكواد تفعيل للكورسات ومتابعة استخدامها." },
      { property: "og:title", content: "أكواد التفعيل" },
      { property: "og:description", content: "توليد أكواد تفعيل للكورسات ومتابعة استخدامها." },
    ],
  }),
  component: AdminCodes,
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () =>
  Array.from({ length: 12 }, (_, i) => ((i + 1) % 5 === 0 ? "-" : ALPHABET[Math.floor(Math.random() * ALPHABET.length)]))
    .join("")
    .replace(/-$/, "");

function AdminCodes() {
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-min"],
    queryFn: async () => (await supabase.from("courses").select("id,title").order("title")).data ?? [],
  });

  const { data: codes } = useQuery({
    queryKey: ["admin-codes"],
    queryFn: async () =>
      (await supabase
        .from("redemption_codes")
        .select("*, courses(title)")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const generate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const count = Math.min(Number(f.get("count") ?? 10), 200);
    const courseId = String(f.get("course_id") ?? "");
    const rows = Array.from({ length: count }, () => ({ course_id: courseId, code: randomCode() }));
    const { error } = await supabase.from("redemption_codes").insert(rows);
    if (error) {
      toast.error("تعذّر توليد الأكواد");
      return;
    }
    toast.success(`تم توليد ${count} كود`);
    await queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
  };

  const used = (codes ?? []).filter((c) => c.used_by).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="size-5 text-primary" /> توليد أكواد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={generate} className="space-y-3">
            <div className="space-y-1">
              <Label>الكورس</Label>
              <select
                name="course_id"
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">اختر الكورس</option>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>عدد الأكواد</Label>
              <Input name="count" type="number" min="1" max="200" defaultValue={10} />
            </div>
            <Button type="submit" className="w-full">
              توليد الأكواد
            </Button>
          </form>
          <div className="mt-4 flex gap-2 text-xs">
            <Badge variant="secondary">الإجمالي {codes?.length ?? 0}</Badge>
            <Badge variant="secondary">مستخدم {used}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">الأكواد</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const text = (codes ?? [])
                .filter((c) => !c.used_by)
                .map((c) => c.code)
                .join("\n");
              void navigator.clipboard.writeText(text);
              toast.success("تم نسخ الأكواد غير المستخدمة");
            }}
          >
            <Copy className="size-4" /> نسخ المتاح
          </Button>
        </CardHeader>
        <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
          {(codes ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p dir="ltr" className="font-mono font-bold">
                  {c.code}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(c.courses as { title: string } | null)?.title ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.used_by ? "secondary" : "default"}>{c.used_by ? "مستخدم" : "متاح"}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.from("redemption_codes").delete().eq("id", c.id);
                    await queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {!codes?.length ? <p className="py-10 text-center text-muted-foreground">لا توجد أكواد بعد.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
