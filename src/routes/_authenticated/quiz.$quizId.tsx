import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Timer, XCircle, Trophy, ShieldAlert } from "lucide-react";
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
      {
        name: "description",
        content: "امتحان بمؤقت زمني وتصحيح فوري ومراجعة تفصيلية للإجابات.",
      },
      { property: "og:title", content: "الامتحان الإلكتروني" },
      {
        property: "og:description",
        content: "امتحان بمؤقت زمني وتصحيح فوري ومراجعة للإجابات.",
      },
    ],
  }),
  component: QuizPage,
});

type Question = {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  position: number;
};

type Result = {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
};

function QuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [forcedMessage, setForcedMessage] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const lastVisibilityEvent = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const [quiz, questions] = await Promise.all([
        supabase
          .from("quizzes")
          .select("*, courses(id,title)")
          .eq("id", quizId)
          .maybeSingle(),

        supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("position"),
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

  /*
   * تحديث حالة الطالب في لوحة الإدارة.
   */
  const updatePresence = async (
    activity: "idle" | "exam",
    status: "online" | "offline" = "online",
  ) => {
    if (!user) return;

    await supabase.from("user_presence").upsert(
      {
        user_id: user.id,
        status,
        activity,
        detail: activity === "exam" ? `امتحان: ${quizId}` : "",
        session_id: user.id,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );
  };

  /*
   * حساب عدد التحذيرات الحقيقي من قاعدة البيانات.
   */
  const loadWarnings = async () => {
    if (!user) return 0;

    const { count, error } = await supabase
      .from("exam_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .eq("event_type", "tab_switch");

    if (error) return warnings;

    const totalWarnings = count ?? 0;
    setWarnings(totalWarnings);

    return totalWarnings;
  };

  /*
   * تسليم الامتحان.
   */
  const submit = useMemo(
    () =>
      async (
        auto = false,
        reason?: "timeout" | "third_warning" | "admin",
      ) => {
        if (!user || !data?.quiz || submittingRef.current) return;

        submittingRef.current = true;
        setSubmitting(true);

        const total = questions.length;

        const score = questions.reduce(
          (acc, q) =>
            acc + (answers[q.id] === q.correct_index ? 1 : 0),
          0,
        );

        const percentage = total
          ? Math.round((score / total) * 100)
          : 0;

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

        if (error) {
          submittingRef.current = false;
          setSubmitting(false);
          toast.error("تعذّر حفظ النتيجة");
          return;
        }

        await supabase
          .from("user_presence")
          .update({
            activity: "idle",
            detail: "انتهى الامتحان",
            last_seen: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        setSubmitting(false);
        setResult({
          score,
          total,
          percentage,
          passed,
        });

        setStarted(false);

        if (reason === "third_warning") {
          setForcedMessage(
            "تم إنهاء الامتحان تلقائياً بسبب تجاوز الحد المسموح لمغادرة صفحة الامتحان.",
          );

          toast.error(
            "تم إنهاء الامتحان تلقائياً بسبب تجاوز 3 تحذيرات",
          );
        } else if (reason === "admin") {
          setForcedMessage(
            "تم إنهاء الامتحان عن طريق إدارة المنصة.",
          );

          toast.error("تم إنهاء الامتحان بواسطة الإدارة");
        } else {
          toast[
            passed ? "success" : "error"
          ](
            auto
              ? "انتهى الوقت! تم تسليم الامتحان"
              : passed
                ? "مبروك، لقد نجحت!"
                : "للأسف لم تجتز الامتحان",
          );
        }
      },
    [
      user,
      data,
      questions,
      answers,
      quizId,
    ],
  );

  /*
   * بدء الامتحان.
   */
  const startExam = async () => {
    if (!user || !data?.quiz || questions.length === 0) return;

    submittingRef.current = false;

    await supabase.from("exam_events").insert({
      user_id: user.id,
      quiz_id: quizId,
      event_type: "exam_started",
      warning_count: 0,
    });

    await updatePresence("exam", "online");

    await loadWarnings();

    setForcedMessage(null);
    setRemaining(data.quiz.time_limit_minutes * 60);
    setStarted(true);
  };

  /*
   * مراقبة خروج الطالب من صفحة الامتحان.
   */
  useEffect(() => {
    if (!started || !user) return;

    const handleVisibility = async () => {
      if (!document.hidden) return;

      /*
       * منع تسجيل أكثر من Warning بسبب browser events المتكررة.
       */
      const now = Date.now();

      if (now - lastVisibilityEvent.current < 1500) {
        return;
      }

      lastVisibilityEvent.current = now;

      if (submittingRef.current) return;

      const currentWarnings = await loadWarnings();

      const nextWarning = currentWarnings + 1;

      await supabase.from("exam_events").insert({
        user_id: user.id,
        quiz_id: quizId,
        event_type: "tab_switch",
        warning_count: nextWarning,
      });

      setWarnings(nextWarning);

      /*
       * التحذير الثالث = تسليم فوري.
       */
      if (nextWarning >= 3) {
        await submit(false, "third_warning");
        return;
      }

      toast.error(
        `تحذير ${nextWarning}/3: لا يمكنك مغادرة صفحة الامتحان.`,
        {
          duration: 5000,
        },
      );
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [started, user, quizId, submit]);

  /*
   * استقبال أوامر الإدارة لحظياً.
   */
  useEffect(() => {
    if (!started || !user) return;

    const channel = supabase
      .channel(`exam-commands-${user.id}-${quizId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "exam_commands",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const command = payload.new as {
            id: string;
            user_id: string;
            quiz_id: string | null;
            action: string;
            message: string;
            consumed_at: string | null;
          };

          if (
            command.quiz_id &&
            command.quiz_id !== quizId
          ) {
            return;
          }

          if (command.action === "warning") {
            toast.error(
              command.message ||
                "تحذير من إدارة المنصة: يرجى الالتزام بتعليمات الامتحان.",
              {
                duration: 8000,
              },
            );
          }

          if (command.action === "terminate_exam") {
            await supabase
              .from("exam_commands")
              .update({
                consumed_at: new Date().toISOString(),
              })
              .eq("id", command.id);

            await submit(false, "admin");
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [started, user, quizId, submit]);

  /*
   * تحديث Presence كل 15 ثانية أثناء الامتحان.
   */
  useEffect(() => {
    if (!started || !user) return;

    const interval = setInterval(() => {
      void updatePresence("exam", "online");
    }, 15000);

    return () => clearInterval(interval);
  }, [started, user, quizId]);

  /*
   * Timer.
   */
  useEffect(() => {
    if (!started) return;

    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          void submit(true, "timeout");
          return 0;
        }

        return r - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [started, submit]);

  /*
   * عند الخروج من صفحة الامتحان نهائياً.
   */
  useEffect(() => {
    return () => {
      if (!user) return;

      void supabase
        .from("user_presence")
        .update({
          activity: "idle",
          last_seen: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    };
  }, [user]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </main>
    );
  }

  if (!data?.quiz) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        الامتحان غير موجود.
      </main>
    );
  }

  const quiz = data.quiz;

  const mins = String(
    Math.floor(remaining / 60),
  ).padStart(2, "0");

  const secs = String(
    remaining % 60,
  ).padStart(2, "0");

  const answeredCount = Object.keys(answers).length;

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        {forcedMessage ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" />
            <p className="font-bold">{forcedMessage}</p>
          </div>
        ) : null}

        <Card className="animate-float-up text-center">
          <CardHeader>
            <span
              className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
                result.passed
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              <Trophy className="size-8" />
            </span>

            <CardTitle className="pt-3 text-3xl">
              {result.percentage}%
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              أجبت بشكل صحيح على {result.score} من{" "}
              {result.total} سؤالًا — درجة النجاح{" "}
              {quiz.passing_grade}%
            </p>

            <Progress value={result.percentage} />

            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/dashboard">لوحتي</Link>
              </Button>

              <Button variant="outline" asChild>
                <Link
                  to="/course/$courseId"
                  params={{
                    courseId: quiz.course_id,
                  }}
                >
                  محتوى الكورس
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-8 text-2xl font-black">
          مراجعة الإجابات
        </h2>

        <div className="mt-4 space-y-3">
          {questions.map((q, i) => {
            const mine = answers[q.id];
            const correct =
              mine === q.correct_index;

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
            <CardTitle className="text-2xl">
              {quiz.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {quiz.description}
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary">
                عدد الأسئلة: {questions.length}
              </Badge>

              <Badge variant="secondary">
                المدة: {quiz.time_limit_minutes} دقيقة
              </Badge>

              <Badge variant="secondary">
                درجة النجاح: {quiz.passing_grade}%
              </Badge>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-bold text-destructive">
                تنبيه مهم
              </p>

              <p className="mt-1 text-muted-foreground">
                ممنوع مغادرة صفحة الامتحان أو الانتقال إلى
                تبويب آخر. الحد الأقصى 3 تحذيرات، وبعد
                التحذير الثالث سيتم تسليم الامتحان تلقائياً.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              بمجرد البدء يبدأ المؤقت ولا يمكن إيقافه —
              تأكد من جاهزيتك.
            </p>

            <Button
              size="lg"
              disabled={questions.length === 0}
              onClick={() => void startExam()}
            >
              ابدأ الامتحان
            </Button>

            {questions.length === 0 ? (
              <p className="text-sm text-destructive">
                لم تتم إضافة أسئلة لهذا الامتحان بعد.
              </p>
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
            تمت الإجابة على {answeredCount} من{" "}
            {questions.length}
          </p>

          <p className="mt-1 text-xs font-bold text-destructive">
            تحذيرات مغادرة الصفحة: {warnings}/3
          </p>
        </div>

        <Badge
          className={
            remaining < 60
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }
        >
          <Timer className="size-4" />
          {mins}:{secs}
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
                value={
                  answers[q.id]?.toString() ?? ""
                }
                onValueChange={(v) =>
                  setAnswers((a) => ({
                    ...a,
                    [q.id]: Number(v),
                  }))
                }
              >
                {q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <RadioGroupItem
                      value={String(idx)}
                      id={`${q.id}-${idx}`}
                    />

                    <Label
                      htmlFor={`${q.id}-${idx}`}
                      className="flex-1 cursor-pointer"
                    >
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="mt-6 h-12 w-full text-base"
        onClick={() => void submit(false)}
        disabled={submitting}
      >
        {submitting
          ? "جاري التسليم..."
          : "تسليم الامتحان"}
      </Button>
    </main>
  );
}
