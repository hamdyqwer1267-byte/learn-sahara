import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Trophy, Ticket, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب | خليك علومنجي" },
      { name: "description", content: "تابع كورساتك ونسبة إنجازك ودرجات امتحاناتك في مكان واحد." },
      { property: "og:title", content: "لوحة الطالب | خليك علومنجي" },
      { property: "og:description", content: "تابع كورساتك ودرجاتك ونسبة إنجازك." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const [enroll, progress, attempts] = await Promise.all([
        supabase.from("enrollments").select("course_id, courses(id,title,grade,description)"),
        supabase.from("lesson_progress").select("lesson_id,completed"),
        supabase
          .from("quiz_attempts")
          .select("id,score,total,percentage,passed,created_at, quizzes(title)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (enroll.error) throw enroll.error;
      if (progress.error) throw progress.error;
      if (attempts.error) throw attempts.error;

      const courseIds = enroll.data.map((e) => e.course_id);
      let totalLessons = 0;
      if (courseIds.length) {
        const { data: units } = await supabase.from("units").select("id").in("course_id", courseIds);
        const unitIds = (units ?? []).map((u) => u.id);
        if (unitIds.length) {
          const { count } = await supabase
            .from("lessons")
            .select("id", { count: "exact", head: true })
            .in("unit_id", unitIds);
          totalLessons = count ?? 0;
        }
      }

      return {
        enrollments: enroll.data,
        completed: progress.data.filter((p) => p.completed).length,
        totalLessons,
        attempts: attempts.data,
      };
    },
  });

  const avgScore =
    data && data.attempts.length
      ? Math.round(data.attempts.reduce((a, b) => a + b.percentage, 0) / data.attempts.length)
      : 0;
  const completionPct =
    data && data.totalLessons ? Math.round((data.completed / data.totalLessons) * 100) : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">أهلاً {profile?.full_name || "بك"} 👋</h1>
          <p className="mt-1 text-muted-foreground">{profile?.grade || "طالب"} — تابع تقدمك اليوم.</p>
        </div>
        <Button asChild>
          <Link to="/redeem">
            <Ticket className="size-4" /> تفعيل كود جديد
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: BookOpen, label: "الكورسات المفعّلة", value: data?.enrollments.length ?? 0 },
          { icon: CheckCircle2, label: "دروس مكتملة", value: data?.completed ?? 0 },
          { icon: Trophy, label: "متوسط الدرجات", value: `${avgScore}%` },
          { icon: PlayCircle, label: "نسبة الإنجاز", value: `${completionPct}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <span className="bg-gold-gradient flex size-11 items-center justify-center rounded-xl text-accent-foreground">
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>نسبة إنجاز الدروس</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={completionPct} />
            <p className="mt-2 text-sm text-muted-foreground">
              أكملت {data?.completed ?? 0} من {data?.totalLessons ?? 0} درسًا.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-10 text-2xl font-black">كورساتي</h2>
      {isLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : data && data.enrollments.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.enrollments.map((e) => (
            <Card key={e.course_id}>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {e.courses?.grade || "عام"}
                </Badge>
                <CardTitle className="pt-2">{e.courses?.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{e.courses?.description}</p>
                <Button asChild className="w-full">
                  <Link to="/course/$courseId" params={{ courseId: e.course_id }}>
                    متابعة المذاكرة
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">
            لم تفعّل أي كورس بعد.{" "}
            <Link to="/redeem" className="font-bold text-primary underline">
              فعّل كودك الآن
            </Link>
          </CardContent>
        </Card>
      )}

      <h2 className="mt-10 text-2xl font-black">آخر الامتحانات</h2>
      <Card className="mt-4">
        <CardContent className="divide-y divide-border pt-6">
          {data?.attempts.length ? (
            data.attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold">{a.quizzes?.title ?? "امتحان"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">
                    {a.score}/{a.total}
                  </span>
                  <Badge className={a.passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                    {a.percentage}% {a.passed ? "ناجح" : "راسب"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-muted-foreground">لا توجد محاولات امتحان بعد.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
