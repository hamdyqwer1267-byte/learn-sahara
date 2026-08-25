import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, Lock, PlayCircle, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/course/$courseId")({
  head: () => ({
    meta: [
      { title: "محتوى الكورس | خليك علومنجي" },
      { name: "description", content: "وحدات ودروس الكورس مع الامتحانات ومتابعة الإنجاز." },
      { property: "og:title", content: "محتوى الكورس" },
      { property: "og:description", content: "وحدات ودروس الكورس مع الامتحانات ومتابعة الإنجاز." },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const [course, units, enrollment, progress, quizzes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase
          .from("units")
          .select("id,title,position, lessons(id,title,description,pdf_url,duration_minutes,is_free,position)")
          .eq("course_id", courseId)
          .order("position"),
        supabase.from("enrollments").select("id").eq("course_id", courseId).maybeSingle(),
        supabase.from("lesson_progress").select("lesson_id,completed"),
        supabase
  .from("quizzes")
  .select(
    "id,title,time_limit_minutes,passing_grade,lesson_id,is_homework",
  )
  .eq("course_id", courseId),
 
      ]);
      if (course.error) throw course.error;
      return {
        course: course.data,
        units: units.data ?? [],
        enrolled: !!enrollment.data,
        progress: progress.data ?? [],
        quizzes: quizzes.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </main>
    );
  }

  if (!data?.course) {
    return <main className="mx-auto max-w-5xl px-4 py-20 text-center">الكورس غير موجود.</main>;
  }

  const enrolled = data.enrolled || isAdmin;
  const completedIds = new Set(data.progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const allLessons = data.units.flatMap((u) => u.lessons ?? []);
 const pct = allLessons.length
  ? Math.round(
      (allLessons.filter((l) =>
        completedIds.has(l.id),
      ).length /
        allLessons.length) *
        100,
    )
  : 0;

const exams = data.quizzes.filter(
  (q) => !q.is_homework,
);

const homework = data.quizzes.filter(
  (q) => q.is_homework,
);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Card className="bg-hero-gradient border-0 text-primary-foreground">
        <CardHeader>
          <Badge className="bg-gold-gradient w-fit border-0 text-accent-foreground">
            {data.course.grade || "عام"}
          </Badge>
          <CardTitle className="pt-2 text-3xl">{data.course.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="opacity-90">{data.course.description}</p>
          {enrolled ? (
            <div className="max-w-md">
              <Progress value={pct} />
              <p className="mt-2 text-sm opacity-90">نسبة إنجازك في الكورس: {pct}%</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-primary-foreground/40">
                <Lock className="size-3" /> الكورس غير مُفعّل
              </Badge>
              <Button variant="secondary" asChild>
                <Link to="/redeem">فعّل بالكود</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-10 text-2xl font-black">محتوى الكورس</h2>
      <Accordion type="multiple" className="mt-4" defaultValue={data.units.map((u) => u.id)}>
        {data.units.map((unit) => (
          <AccordionItem key={unit.id} value={unit.id} className="surface-card mb-3 px-4">
            <AccordionTrigger className="text-lg font-bold">{unit.title}</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {[...(unit.lessons ?? [])]
                .sort((a, b) => a.position - b.position)
                .map((lesson) => {
                  const unlocked = enrolled || lesson.is_free;
                  const done = completedIds.has(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="size-5 text-success" />
                        ) : unlocked ? (
                          <PlayCircle className="size-5 text-primary" />
                        ) : (
                          <Lock className="size-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-bold">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : "درس فيديو"}
                            {lesson.pdf_url ? " • مرفق PDF" : ""}
                            {lesson.is_free ? " • معاينة مجانية" : ""}
                          </p>
                        </div>
                      </div>
                      {unlocked ? (
                        <Button size="sm" asChild>
                          <Link to="/lesson/$lessonId" params={{ lessonId: lesson.id }}>
                            مشاهدة
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          مغلق
                        </Button>
                      )}
                    </div>
                  );
                })}
              {(unit.lessons ?? []).length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">لا توجد دروس في هذه الوحدة بعد.</p>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
        {data.units.length === 0 ? (
          <p className="text-muted-foreground">لم تتم إضافة وحدات لهذا الكورس بعد.</p>
        ) : null}
      </Accordion>

      <h2 className="mt-10 text-2xl font-black">امتحانات الكورس</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {exams.map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="size-5 text-accent" /> {q.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                المدة: {q.time_limit_minutes} دقيقة • درجة النجاح: {q.passing_grade}%
              </p>
              {enrolled ? (
                <Button asChild className="w-full">
                  <Link to="/quiz/$quizId" params={{ quizId: q.id }}>
                    ابدأ الامتحان
                  </Link>
                </Button>
              ) : (
                <Button className="w-full" variant="outline" disabled>
                  <Lock className="size-4" /> فعّل الكورس أولاً
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {exams.length === 0 ? (
          <p className="text-muted-foreground">
            <FileText className="ms-1 inline size-4" /> لا توجد امتحانات متاحة حاليًا.
          </p>
        ) : null}
      </div>
      <h2 className="mt-10 text-2xl font-black">
  واجبات الكورس
</h2>

<div className="mt-4 grid gap-4 sm:grid-cols-2">
  {homework.map((q) => (
    <Card key={q.id}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="size-5 text-primary" />
          {q.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          المدة: {q.time_limit_minutes} دقيقة • درجة النجاح:{" "}
          {q.passing_grade}%
        </p>

        {enrolled ? (
          <Button asChild className="w-full">
            <Link
              to="/quiz/$quizId"
              params={{ quizId: q.id }}
              search={{ mode: "homework" }}
            >
              ابدأ الواجب
            </Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            variant="outline"
            disabled
          >
            <Lock className="size-4" />
            فعّل الكورس أولاً
          </Button>
        )}
      </CardContent>
    </Card>
  ))}

  {homework.length === 0 ? (
    <p className="text-muted-foreground">
      <FileText className="ms-1 inline size-4" />
      لا توجد واجبات متاحة حاليًا.
    </p>
  ) : null}
</div>
    </main>
  );
}
