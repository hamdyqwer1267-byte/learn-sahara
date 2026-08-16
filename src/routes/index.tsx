import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  FileCheck2,
  Ticket,
  BarChart3,
  ShieldCheck,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة النخبة التعليمية | دروس وامتحانات أونلاين" },
      {
        name: "description",
        content:
          "منصة تعليمية عربية متكاملة: شرح فيديو منظم في وحدات، امتحانات إلكترونية بمؤقت وتصحيح فوري، وتفعيل الكورسات بالأكواد.",
      },
      { property: "og:title", content: "منصة النخبة التعليمية | دروس وامتحانات أونلاين" },
      {
        property: "og:description",
        content: "دروس فيديو محمية، امتحانات بمؤقت وتصحيح فوري، ومتابعة كاملة لمستوى الطالب.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: PlayCircle, title: "شرح فيديو منظم", desc: "دروس مرتبة داخل وحدات مع مرفقات PDF وتتبع للمشاهدة." },
  { icon: FileCheck2, title: "امتحانات إلكترونية", desc: "أسئلة اختيار من متعدد بمؤقت زمني وتصحيح فوري ومراجعة للإجابات." },
  { icon: Ticket, title: "أكواد التفعيل", desc: "فعّل أي كورس بكود مسبق الإنشاء خلال ثوانٍ بدون تعقيد." },
  { icon: BarChart3, title: "متابعة المستوى", desc: "تقارير تفصيلية لدرجاتك ونسبة إنجازك في كل كورس." },
  { icon: ShieldCheck, title: "حماية المحتوى", desc: "علامة مائية باسم الطالب ورقمه أثناء التشغيل لمنع التسريب." },
  { icon: Clock, title: "متاح 24/7", desc: "ذاكر في أي وقت ومن أي جهاز — الموبايل واللابتوب والتابلت." },
];

function Landing() {
  const { data: courses } = useQuery({
    queryKey: ["landing-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,grade,price,cover_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="bg-hero-gradient relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div className="animate-float-up text-primary-foreground">
            <Badge className="bg-gold-gradient mb-4 border-0 text-accent-foreground">
              منصة تعليمية مصرية متكاملة
            </Badge>
            <h1 className="text-4xl leading-tight font-black md:text-5xl">
              ذاكر صح.. وامتحن أونلاين
              <span className="block text-accent">وتابع مستواك أولًا بأول</span>
            </h1>
            <p className="mt-5 max-w-xl text-base/8 opacity-90">
              دروس فيديو مرتبة داخل وحدات، امتحانات بمؤقت وتصحيح فوري، مرفقات PDF، وتفعيل فوري
              للكورسات بالأكواد.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/auth">ابدأ الآن مجانًا</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/courses">تصفح الكورسات</Link>
              </Button>
            </div>
          </div>

          <div className="surface-card animate-float-up bg-card/95 p-6 backdrop-blur">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { k: "+120", v: "درس فيديو" },
                { k: "+60", v: "امتحان إلكتروني" },
                { k: "98%", v: "رضا الطلاب" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="text-2xl font-black text-primary">{s.k}</p>
                  <p className="text-xs text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {FEATURES.slice(0, 3).map((f) => (
                <div key={f.title} className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <f.icon className="mt-1 size-5 text-accent" />
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-black">ليه المنصة دي؟</h2>
        <p className="mt-2 text-center text-muted-foreground">كل اللي محتاجه للمذاكرة في مكان واحد</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-transform hover:-translate-y-1">
              <CardHeader>
                <span className="bg-gold-gradient flex size-11 items-center justify-center rounded-xl text-accent-foreground">
                  <f.icon className="size-5" />
                </span>
                <CardTitle className="pt-2">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.desc}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {courses && courses.length > 0 ? (
        <section className="bg-muted/40 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">أحدث الكورسات</h2>
              <Button variant="ghost" asChild>
                <Link to="/courses">
                  عرض الكل <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit">
                      {c.grade || "عام"}
                    </Badge>
                    <CardTitle className="pt-2">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    <Button asChild className="w-full">
                      <Link to="/courses">تفاصيل الكورس</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} منصة النخبة التعليمية — جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
