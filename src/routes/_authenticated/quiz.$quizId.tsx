import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Timer, XCircle, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "الامتحان الإلكتروني | خليك علومنجي" },
      { name: "description", content: "امتحان بمؤقت زمني وتصحيح فوري ومراجعة تفصيلية للإجابات." },
      { property: "og:title", content: "الامتحان الإلكتروني" },
      { property: "og:description", content: "امتحان بمؤقت زمني وتصحيح فوري ومراجعة للإجابات." },
    ],
  }),
  component: QuizPage,
});

type Question = { id: string; text: string; options: string[]; correct_index: number; position: number };
type Result = { score: number; total: number; percentage: number; passed: boolean };

function QuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const [quiz, questions] = await Promise.all([
        supabase.from("quizzes").select("*, courses(id,title)").eq("id", quizId).maybeSingle(),
        supabase.from("questions").select("*").eq("quiz_id", quizId).order("position"),
      ]);
      if (quiz.error) throw quiz.error;
      return {
        quiz: quiz.data,
        questions: (questions.data ?? []).map((q) => ({
          ...q,
          options: (q.options as unknown as string[]) ?? [],
        })) as Question[],
      };
    },
  });

  const questions = useMemo(() => data?.questions ?? [], [data]);

  const submit = useMemo(
    () => async (auto = false) => {
      if (!user || !data?.quiz || submitting) return;
      setSubmitting(true);
      const total = questions.length;
      const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_index ? 1 : 0), 0);
      const percentage = total ? Math.round((score / total) * 100) : 0;
      const passed = percentage >= data.quiz.passing_grade;

      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        total,
        percentage,
        passed,
        answers,
      });
      setSubmitting(false);
      if (error) {
        toast.error("تعذّر حفظ النتيجة");
        return;
      }
      setResult({ score, total, percentage, passed });
      setStarted(false);
      toast[passed ? "success" : "error"](
        auto ? "انتهى الوقت! تم تسليم الامتحان" : passed ? "مبروك، لقد نجحت!" : "للأسف لم تجتز الامتحان",
      );
    },
    [user, data, questions, answers, quizId, submitting],
  );

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          void submit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, submit]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </main>
    );
  }

  if (!data?.quiz) {
    return <main className="mx-auto max-w-3xl px-4 py-20 text-center">الامتحان غير موجود.</main>;
  }

  const quiz = data.quiz;
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  const answeredCount = Object.keys(answers).length;

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card className="animate-float-up text-center">
          <CardHeader>
            <span
              className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
                result.passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
              }`}
            >
              <Trophy className="size-8" />
            </span>
            <CardTitle className="pt-3 text-3xl">{result.percentage}%</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              أجبت بشكل صحيح على {result.score} من {result.total} سؤالًا — درجة النجاح {quiz.passing_grade}%
            </p>
            <Progress value={result.percentage} />
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/dashboard">لوحتي</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/course/$courseId" params={{ courseId: quiz.course_id }}>
                  محتوى الكورس
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8 text-2xl font-black">مراجعة الإجابات</h2>
        <div className="mt-4 space-y-3">
          {questions.map((q, i) => {
            const mine = answers[q.id];
            const correct = mine === q.correct_index;
            return (
              <Card key={q.id}>
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle2 className="mt-1 size-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-1 size-5 shrink-0 text-destructive" />
                    )}
                    <p className="font-bold">
                      {i + 1}. {q.text}
                    </p>
                  </div>
                  <div className="space-y-1 ps-7 text-sm">
                    {q.options.map((opt, idx) => (
                      <p
                        key={idx}
                        className={
                          idx === q.correct_index
                            ? "font-bold text-success"
                            : idx === mine
                              ? "text-destructive line-through"
                              : "text-muted-foreground"
                        }
                      >
                        {opt}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{quiz.description}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary">عدد الأسئلة: {questions.length}</Badge>
              <Badge variant="secondary">المدة: {quiz.time_limit_minutes} دقيقة</Badge>
              <Badge variant="secondary">درجة النجاح: {quiz.passing_grade}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              بمجرد البدء يبدأ المؤقت ولا يمكن إيقافه — تأكد من جاهزيتك.
            </p>
            <Button
              size="lg"
              disabled={questions.length === 0}
              onClick={() => {
                setRemaining(quiz.time_limit_minutes * 60);
                setStarted(true);
              }}
            >
              ابدأ الامتحان
            </Button>
            {questions.length === 0 ? (
              <p className="text-sm text-destructive">لم تتم إضافة أسئلة لهذا الامتحان بعد.</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="surface-card sticky top-20 z-10 mb-6 flex items-center justify-between p-4">
        <div>
          <p className="font-bold">{quiz.title}</p>
          <p className="text-xs text-muted-foreground">
            تمت الإجابة على {answeredCount} من {questions.length}
          </p>
        </div>
        <Badge className={remaining < 60 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
          <Timer className="size-4" /> {mins}:{secs}
        </Badge>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {i + 1}. {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[q.id]?.toString() ?? ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
              >
                {q.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <RadioGroupItem value={String(idx)} id={`${q.id}-${idx}`} />
                    <Label htmlFor={`${q.id}-${idx}`} className="flex-1 cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="mt-6 h-12 w-full text-base" onClick={() => void submit(false)} disabled={submitting}>
        تسليم الامتحان
      </Button>
    </main>
  );
}
