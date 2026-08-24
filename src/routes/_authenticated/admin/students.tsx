import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, MessageCircle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "متابعة الطلاب | لوحة تحكم المدرّس" },
      { name: "description", content: "متابعة تقدم الطلاب ودرجات الامتحانات ووقت المشاهدة." },
      { property: "og:title", content: "متابعة الطلاب" },
      { property: "og:description", content: "متابعة تقدم الطلاب ودرجات الامتحانات ووقت المشاهدة." },
    ],
  }),
  component: AdminStudents,
});

function AdminStudents() {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [presence, setPresence] = useState<
  Record<
    string,
    {
      status: string;
      activity: string;
      detail: string;
      last_seen: string;
    }
  >
>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const [profiles, progress, attempts, enrollments] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("lesson_progress").select("user_id,completed,watch_seconds"),
        supabase.from("quiz_attempts").select("user_id,percentage,passed"),
        supabase.from("enrollments").select("user_id,course_id"),
      ]);
      useEffect(() => {
  const loadPresence = async () => {
    const { data } = await supabase
      .from("user_presence")
      .select("user_id,status,activity,detail,last_seen");

    if (!data) return;

    const mapped: Record<string, (typeof data)[number]> = {};

    for (const item of data) {
      mapped[item.user_id] = item;
    }

    setPresence(mapped);
  };

  void loadPresence();

  const channel = supabase
    .channel("admin-student-presence")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_presence",
      },
      (payload) => {
        const row = payload.new as {
          user_id: string;
          status: string;
          activity: string;
          detail: string;
          last_seen: string;
        };

        setPresence((current) => ({
          ...current,
          [row.user_id]: row,
        }));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}, []);
      return {
        profiles: profiles.data ?? [],
        progress: progress.data ?? [],
        attempts: attempts.data ?? [],
        enrollments: enrollments.data ?? [],
      };
    },
  });

  const grades = useMemo(
    () => Array.from(new Set((data?.profiles ?? []).map((p) => p.grade).filter(Boolean))) as string[],
    [data],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return data.profiles
      .filter((p) => (grade === "all" ? true : p.grade === grade))
      .filter((p) => {
        const t = q.trim();
        if (!t) return true;
        return `${p.full_name ?? ""} ${p.phone ?? ""}`.includes(t);
      })
      .map((p) => {
        const prog = data.progress.filter((x) => x.user_id === p.id);
        const att = data.attempts.filter((x) => x.user_id === p.id);
        const avg = att.length ? Math.round(att.reduce((a, b) => a + b.percentage, 0) / att.length) : 0;
        const live = presence[p.id];
        return {
          online: live?.status === "online",
activity: live?.activity ?? "offline",
activityDetail: live?.detail ?? "",
lastSeen: live?.last_seen ?? null,
          ...p,
          completed: prog.filter((x) => x.completed).length,
          watchHours: (prog.reduce((a, b) => a + (b.watch_seconds ?? 0), 0) / 3600).toFixed(1),
          attempts: att.length,
          avg,
          courses: data.enrollments.filter((e) => e.user_id === p.id).length,
        };
      });
  }, [data, q, grade]);

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="size-5 text-primary" /> الطلاب ({rows.length})
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge
              onClick={() => setGrade("all")}
              className="cursor-pointer"
              variant={grade === "all" ? "default" : "secondary"}
            >
              الكل
            </Badge>
            {grades.map((g) => (
              <Badge
                key={g}
                onClick={() => setGrade(g)}
                className="cursor-pointer"
                variant={grade === g ? "default" : "secondary"}
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-start">
              <th className="p-2 text-start">الطالب</th>
              <th className="p-2 text-start">الحالة</th>
              <th className="p-2 text-start">النشاط</th>
              <th className="p-2 text-start">الصف</th>
              <th className="p-2 text-start">الكورسات</th>
              <th className="p-2 text-start">دروس مكتملة</th>
              <th className="p-2 text-start">وقت المشاهدة</th>
              <th className="p-2 text-start">الامتحانات</th>
              <th className="p-2 text-start">المتوسط</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="p-2">
                  <p className="font-bold">{r.full_name || "بدون اسم"}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">
                    {r.phone || "—"}
                    <div className="mt-2 flex gap-1">
  {r.phone ? (
    <a
      href={`https://wa.me/${String(r.phone).replace(/\D/g, "")}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-green-700"
    >
      <MessageCircle className="size-3" />
      الطالب
    </a>
  ) : null}

  {r.parent_phone ? (
    <a
      href={`https://wa.me/${String(r.parent_phone).replace(/\D/g, "")}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-green-800"
    >
      <MessageCircle className="size-3" />
      ولي الأمر
    </a>
  ) : null}
</div>
                  </p>
                </td>
                <td className="p-2">
  <div className="flex items-center gap-2">
    <Circle
      className={`size-3 fill-current ${
        r.online
          ? "text-green-500"
          : "text-muted-foreground"
      }`}
    />

    <span>
      {r.online ? "متصل الآن" : "غير متصل"}
    </span>
  </div>

  {r.lastSeen ? (
    <p className="mt-1 text-[10px] text-muted-foreground">
      آخر ظهور:{" "}
      {new Date(r.lastSeen).toLocaleString("ar-EG")}
    </p>
  ) : null}
</td>

<td className="p-2">
  {r.activity === "exam" ? (
    <Badge variant="destructive">
      أداء امتحان
    </Badge>
  ) : r.activity === "video" ? (
    <Badge variant="default">
      مشاهدة فيديو
    </Badge>
  ) : r.online ? (
    <Badge variant="secondary">
      نشط
    </Badge>
  ) : (
    <Badge variant="outline">
      غير نشط
    </Badge>
  )}

  {r.activityDetail ? (
    <p className="mt-1 max-w-40 truncate text-[10px] text-muted-foreground">
      {r.activityDetail}
    </p>
  ) : null}
</td>
                <td className="p-2">{r.grade || "-"}</td>
                <td className="p-2">{r.courses}</td>
                <td className="p-2">{r.completed}</td>
                <td className="p-2">{r.watchHours} س</td>
                <td className="p-2">{r.attempts}</td>
                <td className="p-2 w-36">
                  <Progress value={r.avg} />
                  <span className="text-xs text-muted-foreground">{r.avg}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="py-10 text-center text-muted-foreground">لا يوجد طلاب مطابقون.</p> : null}
      </CardContent>
    </Card>
  );
}
