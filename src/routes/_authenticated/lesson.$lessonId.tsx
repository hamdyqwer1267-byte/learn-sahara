import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Download, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video-player";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";


export const Route = createFileRoute("/_authenticated/lesson/$lessonId")({
  head: () => ({
    meta: [
      { title: "مشاهدة الدرس | خليك علومنجي" },
      { name: "description", content: "مشغل الدروس مع المرفقات وتحديد الدرس كمكتمل." },
      { property: "og:title", content: "مشاهدة الدرس" },
      { property: "og:description", content: "مشغل الدروس مع المرفقات وتحديد الدرس كمكتمل." },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("*, units(id,title,course_id, courses(id,title))")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      if (!lesson) return null;

      const courseId = lesson.units?.course_id;
      const [enrollment, progress, quizzes, siblings] = await Promise.all([
        courseId
          ? supabase.from("enrollments").select("id").eq("course_id", courseId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("lesson_progress").select("*").eq("lesson_id", lessonId).maybeSingle(),
        supabase.from("quizzes").select("id,title").eq("lesson_id", lessonId),
        supabase.from("lessons").select("id,title,position").eq("unit_id", lesson.unit_id).order("position"),
      ]);

      return {
        lesson,
        enrolled: !!enrollment.data,
        progress: progress.data,
        quizzes: quizzes.data ?? [],
        siblings: siblings.data ?? [],
      };
    },
  });

  const saveWatch = useCallback(
    async (seconds: number) => {
      if (!user) return;
      await supabase
        .from("lesson_progress")
        .upsert(
          { user_id: user.id, lesson_id: lessonId, watch_seconds: seconds, updated_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
    },
    [user, lessonId],
  );

  const markComplete = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, lesson_id: lessonId, completed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
    if (error) {
      toast.error("تعذّر حفظ التقدم");
      return;
    }
    toast.success("تم تسجيل الدرس كمكتمل ✅");
    await queryClient.invalidateQueries();
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="aspect-video rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </main>
    );
  }

  if (!data?.lesson) {
    return <main className="mx-auto max-w-5xl px-4 py-20 text-center">الدرس غير موجود.</main>;
  }

  const lesson = data.lesson;
  const locked = !data.enrolled && !lesson.is_free;
  const courseId = lesson.units?.course_id;

  if (locked) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-black">هذا الدرس مغلق</h1>
        <p className="mt-2 text-muted-foreground">فعّل الكورس بالكود للوصول إلى كل الدروس.</p>
        <Button className="mt-6" asChild>
          <Link to="/redeem">تفعيل كود</Link>
        </Button>
      </main>
    );
  }

  const watermark = `${profile?.full_name || "طالب"} • ${profile?.phone || user?.email || ""}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {courseId ? (
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/course/$courseId" params={{ courseId }}>
            <ArrowRight className="size-4" /> العودة لمحتوى الكورس
          </Link>
        </Button>
      ) : null}

      <VideoPlayer url={lesson.video_url} watermark={watermark} onHeartbeat={saveWatch} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">{lesson.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{lesson.description || "لا يوجد وصف لهذا الدرس."}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={markComplete} disabled={data.progress?.completed}>
                <CheckCircle2 className="size-4" />
                {data.progress?.completed ? "تم إكمال الدرس" : "تحديد كمكتمل"}
              </Button>
              {lesson.pdf_url ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const href = await resolveMediaUrl(lesson.pdf_url);
                    if (href) window.open(href, "_blank", "noreferrer");
                  }}
                >
                  <Download className="size-4" /> تحميل المرفق PDF
                </Button>
              ) : null}

            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {data.quizzes.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">امتحان الدرس</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.quizzes.map((q) => (
                  <Button key={q.id} variant="secondary" className="w-full" asChild>
                    <Link to="/quiz/$quizId" params={{ quizId: q.id }}>
                      <ClipboardList className="size-4" /> {q.title}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">دروس الوحدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.siblings.map((s) => (
                <Link
                  key={s.id}
                  to="/lesson/$lessonId"
                  params={{ lessonId: s.id }}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    s.id === lessonId ? "bg-muted font-bold text-primary" : ""
                  }`}
                >
                  {s.title}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
