import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة السر | خليك علومنجي" },
      {
        name: "description",
        content: "اختر كلمة سر جديدة لحسابك على منصة خليك علومنجي واستعد الوصول لدروسك.",
      },
      { property: "og:title", content: "إعادة تعيين كلمة السر | خليك علومنجي" },
      { property: "og:description", content: "اختر كلمة سر جديدة لحسابك على منصة خليك علومنجي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      toast.error("كلمة السر يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا السر غير متطابقتين");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("انتهت صلاحية الرابط أو حدث خطأ، اطلب رابطًا جديدًا");
      return;
    }
    toast.success("تم تغيير كلمة السر بنجاح");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="bg-hero-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-primary-foreground">
          <span className="bg-gold-gradient flex size-10 items-center justify-center rounded-xl text-accent-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-xl font-extrabold">خليك علومنجي</span>
        </Link>

        <div className="surface-card animate-float-up space-y-4 p-6">
          <h1 className="text-xl font-extrabold">تعيين كلمة سر جديدة</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rp-pass">كلمة السر الجديدة</Label>
              <Input id="rp-pass" name="password" type="password" required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm">تأكيد كلمة السر</Label>
              <Input id="rp-confirm" name="confirm" type="password" required dir="ltr" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              حفظ كلمة السر
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
