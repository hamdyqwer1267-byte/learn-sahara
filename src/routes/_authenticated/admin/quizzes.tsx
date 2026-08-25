import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({
    meta: [
      { title: "بنك الامتحانات | لوحة تحكم المدرّس" },
      { name: "description", content: "إنشاء امتحانات اختيار من متعدد بمؤقت ودرجة نجاح وتصحيح تلقائي." },
      { property: "og:title", content: "بنك الامتحانات" },
      { property: "og:description", content: "إنشاء امتحانات MCQ بمؤقت ودرجة نجاح وتصحيح تلقائي." },
    ],
  }),
  component: AdminQuizzes,
});

function AdminQuizzes() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-min"],
    queryFn: async () => (await supabase.from("courses").select("id,title").order("title")).data ?? [],
  });

 const { data: quizzes } = useQuery({
  queryKey: ["admin-quizzes"],
  queryFn: async () =>
    (
      await supabase
        .from("quizzes")
        .select("*, questions(id,text,options,correct_index,position)")
        .eq("is_homework", false)
        .order("created_at")
    ).data ?? [],
});

  const refresh = () => queryClient.invalidateQueries();

  const createQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("quizzes").insert({
  course_id: String(f.get("course_id") ?? ""),
  title: String(f.get("title") ?? ""),
  description: String(f.get("description") ?? ""),
  time_limit_minutes: Number(f.get("time_limit_minutes") ?? 15),
  passing_grade: Number(f.get("passing_grade") ?? 50),
  is_homework: false,
});
    if (error) {
      toast.error("تعذّر إنشاء الامتحان");
      return;
    }
    (e.target as HTMLFormElement).reset();
    toast.success("تم إنشاء الامتحان");
    await refresh();
  };

  const addQuestion = async (quizId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const options = [1, 2, 3, 4].map((i) => String(f.get(`opt${i}`) ?? "").trim()).filter(Boolean);
    if (options.length < 2) {
      toast.error("أضف خيارين على الأقل");
      return;
    }
    const correct = Number(f.get("correct") ?? 1) - 1;
    if (correct >= options.length) {
      toast.error("رقم الإجابة الصحيحة غير صالح");
      return;
    }
    const { error } = await supabase.from("questions").insert({
      quiz_id: quizId,
      text: String(f.get("text") ?? ""),
      options,
      correct_index: correct,
      position: Number(f.get("position") ?? 0),
    });
    if (error) {
      toast.error("تعذّر إضافة السؤال");
      return;
    }
    (e.target as HTMLFormElement).reset();
    toast.success("تمت إضافة السؤال");
    await refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg">امتحان جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createQuiz} className="space-y-3">
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
            <Input name="title" placeholder="عنوان الامتحان" required />
            <Textarea name="description" rows={2} placeholder="وصف مختصر" />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">المدة (دقيقة)</Label>
                <Input name="time_limit_minutes" type="number" defaultValue={15} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">درجة النجاح %</Label>
                <Input name="passing_grade" type="number" defaultValue={50} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="size-4" /> إنشاء
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        {(quizzes ?? []).map((quiz) => {
          const questions = (quiz.questions as { id: string; text: string; options: unknown; correct_index: number }[]) ?? [];
          const open = selected === quiz.id;
          return (
            <Card key={quiz.id}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4 text-primary" /> {quiz.title}
                  </CardTitle>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">{questions.length} سؤال</Badge>
                    <Badge variant="secondary">{quiz.time_limit_minutes} دقيقة</Badge>
                    <Badge variant="secondary">نجاح {quiz.passing_grade}%</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setSelected(open ? null : quiz.id)}>
                    {open ? "إغلاق" : "الأسئلة"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await supabase.from("quizzes").delete().eq("id", quiz.id);
                      toast.success("تم حذف الامتحان");
                      await refresh();
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {open ? (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-start justify-between rounded-lg bg-muted/50 p-3">
                        <div>
                          <p className="text-sm font-bold">
                            {i + 1}. {q.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            الإجابة الصحيحة: {((q.options as string[]) ?? [])[q.correct_index]}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            await supabase.from("questions").delete().eq("id", q.id);
                            await refresh();
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => addQuestion(quiz.id, e)} className="space-y-2 rounded-xl border border-border p-3">
                    <Input name="text" placeholder="نص السؤال" required />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[1, 2, 3, 4].map((i) => (
                        <Input key={i} name={`opt${i}`} placeholder={`الخيار ${i}`} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="correct" type="number" min="1" max="4" defaultValue={1} placeholder="رقم الإجابة الصحيحة" />
                      <Input name="position" type="number" defaultValue={questions.length + 1} placeholder="الترتيب" />
                    </div>
                    <Button type="submit" size="sm">
                      <Plus className="size-4" /> إضافة سؤال
                    </Button>
                  </form>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
        {!quizzes?.length ? <p className="text-muted-foreground">لا توجد امتحانات بعد.</p> : null}
      </div>
    </div>
  );
}
