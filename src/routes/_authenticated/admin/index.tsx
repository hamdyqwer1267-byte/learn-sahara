import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Video, FolderPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploadField } from "@/components/media-upload-field";


export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "إدارة المحتوى | لوحة تحكم المدرّس" },
      { name: "description", content: "إضافة وتعديل الكورسات والوحدات ودروس الفيديو." },
      { property: "og:title", content: "إدارة المحتوى" },
      { property: "og:description", content: "إضافة وتعديل الكورسات والوحدات ودروس الفيديو." },
    ],
  }),
  component: AdminContent,
});

type LessonRow = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  pdf_url: string | null;
  duration_minutes: number;
  is_free: boolean;
  position: number;
  unit_id: string;
};

function AdminContent() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{ unitId: string; lesson?: LessonRow } | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: units } = useQuery({
    queryKey: ["admin-units", selectedCourse],
    enabled: !!selectedCourse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,title,position, lessons(*)")
        .eq("course_id", selectedCourse!)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => queryClient.invalidateQueries();

  const saveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("courses").insert({
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      grade: String(f.get("grade") ?? ""),
      price: Number(f.get("price") ?? 0),
      is_published: true,
    });
    if (error) {
      toast.error("تعذّر إنشاء الكورس");
      return;
    }
    toast.success("تم إنشاء الكورس");
    (e.target as HTMLFormElement).reset();
    await refresh();
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم حذف الكورس");
    if (selectedCourse === id) setSelectedCourse(null);
    await refresh();
  };

  const togglePublish = async (id: string, value: boolean) => {
    await supabase.from("courses").update({ is_published: value }).eq("id", id);
    await refresh();
  };

  const addUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("units").insert({
      course_id: selectedCourse!,
      title: String(f.get("title") ?? ""),
      position: Number(f.get("position") ?? 0),
    });
    if (error) {
      toast.error("تعذّر إضافة الوحدة");
      return;
    }
    (e.target as HTMLFormElement).reset();
    toast.success("تمت إضافة الوحدة");
    await refresh();
  };

  const saveLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lessonDialog) return;
    const f = new FormData(e.currentTarget);
    const payload = {
      unit_id: lessonDialog.unitId,
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      video_url: String(f.get("video_url") ?? ""),
      pdf_url: String(f.get("pdf_url") ?? "") || null,
      duration_minutes: Number(f.get("duration_minutes") ?? 0),
      position: Number(f.get("position") ?? 0),
      is_free: f.get("is_free") === "on",
    };
    const { error } = lessonDialog.lesson
      ? await supabase.from("lessons").update(payload).eq("id", lessonDialog.lesson.id)
      : await supabase.from("lessons").insert(payload);
    if (error) {
      toast.error("تعذّر حفظ الدرس");
      return;
    }
    toast.success("تم حفظ الدرس");
    setLessonDialog(null);
    await refresh();
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("lessons").delete().eq("id", id);
    toast.success("تم حذف الدرس");
    await refresh();
  };

  const deleteUnit = async (id: string) => {
    await supabase.from("units").delete().eq("id", id);
    toast.success("تم حذف الوحدة");
    await refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إضافة كورس جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveCourse} className="space-y-3">
              <Input name="title" placeholder="اسم الكورس" required />
              <Input name="grade" placeholder="الصف الدراسي" />
              <Input name="price" type="number" min="0" step="1" placeholder="السعر بالجنيه" />
              <Textarea name="description" placeholder="وصف مختصر" rows={3} />
              <Button type="submit" className="w-full">
                <Plus className="size-4" /> إنشاء الكورس
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الكورسات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(courses ?? []).map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border border-border p-3 ${selectedCourse === c.id ? "bg-muted" : ""}`}
              >
                <button className="w-full text-start" onClick={() => setSelectedCourse(c.id)}>
                  <p className="font-bold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.grade || "عام"}</p>
                </button>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={c.is_published} onCheckedChange={(v) => togglePublish(c.id, v)} />
                    منشور
                  </label>
                  <Button size="icon" variant="ghost" onClick={() => deleteCourse(c.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!courses?.length ? <p className="text-sm text-muted-foreground">لا توجد كورسات بعد.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedCourse ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الوحدات والدروس</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={addUnit} className="flex flex-wrap gap-2">
                <Input name="title" placeholder="اسم الوحدة" required className="flex-1" />
                <Input name="position" type="number" placeholder="الترتيب" className="w-28" />
                <Button type="submit">
                  <FolderPlus className="size-4" /> إضافة وحدة
                </Button>
              </form>

              {(units ?? []).map((u) => (
                <div key={u.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{u.title}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setLessonDialog({ unitId: u.id })}>
                        <Plus className="size-4" /> درس
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteUnit(u.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[...((u.lessons as LessonRow[]) ?? [])]
                      .sort((a, b) => a.position - b.position)
                      .map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                          <div className="flex items-center gap-2">
                            <Video className="size-4 text-primary" />
                            <span className="text-sm font-medium">{l.title}</span>
                            {l.is_free ? <Badge variant="secondary">مجاني</Badge> : null}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setLessonDialog({ unitId: u.id, lesson: l })}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteLesson(l.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {!units?.length ? <p className="text-sm text-muted-foreground">لا توجد وحدات في هذا الكورس.</p> : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-20 text-center text-muted-foreground">
              اختر كورسًا من القائمة لعرض وحداته ودروسه.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!lessonDialog} onOpenChange={(o) => !o && setLessonDialog(null)}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{lessonDialog?.lesson ? "تعديل الدرس" : "درس جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveLesson} className="space-y-3">
            <div className="space-y-1">
              <Label>عنوان الدرس</Label>
              <Input name="title" defaultValue={lessonDialog?.lesson?.title ?? ""} required />
            </div>
            <MediaUploadField
              label="الفيديو (رابط YouTube / Vimeo / MP4 أو ارفع ملفًا)"
              name="video_url"
              folder="videos"
              accept="video/*"
              hint="https://... أو ارفع الفيديو"
              defaultValue={lessonDialog?.lesson?.video_url ?? ""}
            />
            <MediaUploadField
              label="ملف PDF (اختياري)"
              name="pdf_url"
              folder="pdfs"
              accept="application/pdf"
              hint="https://... أو ارفع الملف"
              defaultValue={lessonDialog?.lesson?.pdf_url ?? ""}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>المدة (دقيقة)</Label>
                <Input
                  name="duration_minutes"
                  type="number"
                  defaultValue={lessonDialog?.lesson?.duration_minutes ?? 0}
                />
              </div>
              <div className="space-y-1">
                <Label>الترتيب</Label>
                <Input name="position" type="number" defaultValue={lessonDialog?.lesson?.position ?? 0} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea name="description" rows={3} defaultValue={lessonDialog?.lesson?.description ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_free" defaultChecked={lessonDialog?.lesson?.is_free ?? false} />
              معاينة مجانية (متاح بدون تفعيل)
            </label>
            <DialogFooter>
              <Button type="submit">حفظ الدرس</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
