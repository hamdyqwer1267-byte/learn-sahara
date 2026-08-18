import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/redeem")({
  head: () => ({
    meta: [
      { title: "تفعيل كود الكورس | خليك علومنجي" },
      { name: "description", content: "أدخل كود التفعيل الخاص بك لفتح الكورس فورًا." },
      { property: "og:title", content: "تفعيل كود الكورس" },
      { property: "og:description", content: "أدخل كود التفعيل الخاص بك لفتح الكورس فورًا." },
    ],
  }),
  component: RedeemPage,
});

type RedeemResult = { ok: boolean; message: string; course_id?: string };

function RedeemPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error("أدخل كودًا صحيحًا");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_code", { _code: clean });
    setBusy(false);
    if (error) {
      toast.error("تعذّر تفعيل الكود، حاول مرة أخرى");
      return;
    }
    const result = data as unknown as RedeemResult;
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setCode("");
    await queryClient.invalidateQueries();
    if (result.course_id) {
      navigate({ to: "/course/$courseId", params: { courseId: result.course_id } });
    }
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col justify-center px-4 py-16">
      <Card className="animate-float-up">
        <CardHeader className="text-center">
          <span className="bg-gold-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-accent-foreground">
            <Ticket className="size-7" />
          </span>
          <CardTitle className="pt-3 text-2xl">تفعيل كود الكورس</CardTitle>
          <CardDescription>
            أدخل الكود الذي حصلت عليه من المدرّس أو مركز البيع لفتح الكورس فورًا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              dir="ltr"
              className="h-14 text-center text-lg font-bold tracking-widest"
              maxLength={32}
            />
            <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
              {busy ? "جاري التفعيل..." : "تفعيل الكورس"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
