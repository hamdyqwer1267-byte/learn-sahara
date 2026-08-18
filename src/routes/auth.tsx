import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | خليك علومنجي" },
      { name: "description", content: "سجّل دخولك أو أنشئ حسابًا جديدًا للوصول إلى دروسك وامتحاناتك." },
      { property: "og:title", content: "تسجيل الدخول | خليك علومنجي" },
      { property: "og:description", content: "سجّل دخولك للوصول إلى دروسك وامتحاناتك." },
    ],
  }),
  component: AuthPage,
});

const GRADES = ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];

const signUpSchema = z.object({
  full_name: z.string().trim().min(3, "الاسم قصير جدًا").max(80),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(255),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(72),
  phone: z.string().trim().min(8, "رقم هاتف غير صحيح").max(20),
  parent_phone: z.string().trim().max(20),
  grade: z.string().min(1, "اختر الصف الدراسي"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("تعذّر إرسال رابط الاستعادة، حاول لاحقًا");
      return;
    }
    toast.success("تم إرسال رابط إعادة التعيين إلى بريدك");
    setForgot(false);
  };

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      toast.error("فشل تسجيل الدخول: بيانات غير صحيحة");
      return;
    }
    toast.success("مرحبًا بك مجددًا!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      password: form.get("password"),
      phone: form.get("phone"),
      parent_phone: form.get("parent_phone") ?? "",
      grade: form.get("grade") ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          parent_phone: parsed.data.parent_phone,
          grade: parsed.data.grade,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("already") ? "هذا البريد مسجل بالفعل" : "تعذّر إنشاء الحساب");
      return;
    }
    toast.success("تم إنشاء الحساب! تفقد بريدك لتأكيد الحساب إذا لزم الأمر.");
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

        <div className="surface-card animate-float-up p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">دخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {forgot ? (
                <form onSubmit={handleForgot} className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة السر.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="fp-email">البريد الإلكتروني</Label>
                    <Input id="fp-email" name="email" type="email" required dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    إرسال رابط الاستعادة
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setForgot(false)}
                  >
                    الرجوع لتسجيل الدخول
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">البريد الإلكتروني</Label>
                    <Input id="si-email" name="email" type="email" required dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pass">كلمة المرور</Label>
                    <Input id="si-pass" name="password" type="password" required dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    تسجيل الدخول
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgot(true)}
                    className="w-full text-sm text-primary underline-offset-4 hover:underline"
                  >
                    نسيت كلمة السر؟
                  </button>
                </form>
              )}
            </TabsContent>


            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">الاسم رباعي</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-phone">رقم الطالب</Label>
                    <Input id="su-phone" name="phone" required dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pphone">رقم ولي الأمر</Label>
                    <Input id="su-pphone" name="parent_phone" dir="ltr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الصف الدراسي</Label>
                  <Select name="grade" defaultValue={GRADES[2] ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">البريد الإلكتروني</Label>
                  <Input id="su-email" name="email" type="email" required dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">كلمة المرور</Label>
                  <Input id="su-pass" name="password" type="password" required dir="ltr" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  إنشاء الحساب
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
