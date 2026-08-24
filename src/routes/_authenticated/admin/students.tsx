import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  MessageCircle,
  Circle,
  Activity,
  Video,
  ClipboardCheck,
  Clock3,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      {
        title: "متابعة الطلاب | لوحة تحكم المدرّس",
      },
      {
        name: "description",
        content:
          "متابعة تقدم الطلاب ودرجات الامتحانات ووقت المشاهدة والحالة المباشرة.",
      },
      {
        property: "og:title",
        content: "متابعة الطلاب",
      },
      {
        property: "og:description",
        content:
          "متابعة تقدم الطلاب ودرجات الامتحانات ووقت المشاهدة والحالة المباشرة.",
      },
    ],
  }),

  component: AdminStudents,
});

type PresenceRow = {
  user_id: string;
  status: string;
  activity: string;
  detail: string;
  session_id: string;
  last_seen: string;
};

function AdminStudents() {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");

  /*
   * حالة الطلاب Live
   *
   * المفتاح = user_id
   */
  const [presence, setPresence] = useState<
    Record<string, PresenceRow>
  >({});

  /*
   * جلب بيانات الطلاب الأساسية
   */
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],

    queryFn: async () => {
      const [
        profiles,
        progress,
        attempts,
        enrollments,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("lesson_progress")
          .select(
            "user_id,completed,watch_seconds",
          ),

        supabase
          .from("quiz_attempts")
          .select(
            "user_id,percentage,passed",
          ),

        supabase
          .from("enrollments")
          .select(
            "user_id,course_id",
          ),
      ]);

      return {
        profiles: profiles.data ?? [],
        progress: progress.data ?? [],
        attempts: attempts.data ?? [],
        enrollments: enrollments.data ?? [],
      };
    },
  });

  /*
   * تحميل حالة الطلاب الحالية
   * ثم الاشتراك في Supabase Realtime
   */
  useEffect(() => {
    let mounted = true;

    const loadPresence = async () => {
      const { data, error } = await supabase
        .from("user_presence")
        .select(
          "user_id,status,activity,detail,session_id,last_seen",
        );

      if (error) {
        console.error(
          "Failed to load student presence:",
          error,
        );

        return;
      }

      if (!mounted || !data) return;

      const mapped: Record<string, PresenceRow> = {};

      for (const item of data) {
        mapped[item.user_id] =
          item as PresenceRow;
      }

      setPresence(mapped);
    };

    void loadPresence();

    /*
     * Realtime subscription
     */
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
          /*
           * INSERT / UPDATE
           */
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const row =
              payload.new as PresenceRow;

            setPresence((current) => ({
              ...current,
              [row.user_id]: row,
            }));
          }

          /*
           * DELETE
           */
          if (
            payload.eventType === "DELETE"
          ) {
            const oldRow =
              payload.old as {
                user_id: string;
              };

            setPresence((current) => {
              const next = {
                ...current,
              };

              delete next[oldRow.user_id];

              return next;
            });
          }
        },
      )
      .subscribe((status) => {
        console.log(
          "Student presence realtime:",
          status,
        );
      });

    return () => {
      mounted = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, []);

  /*
   * الصفوف الموجودة
   */
  const grades = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.profiles ?? [])
            .map((p) => p.grade)
            .filter(Boolean),
        ),
      ) as string[],

    [data],
  );

  /*
   * تجهيز بيانات الجدول
   */
  const rows = useMemo(() => {
    if (!data) return [];

    return data.profiles
      .filter((p) =>
        grade === "all"
          ? true
          : p.grade === grade,
      )

      .filter((p) => {
        const text = q.trim();

        if (!text) return true;

        return `${p.full_name ?? ""} ${
          p.phone ?? ""
        }`
          .toLowerCase()
          .includes(text.toLowerCase());
      })

      .map((p) => {
        const prog =
          data.progress.filter(
            (x) => x.user_id === p.id,
          );

        const att =
          data.attempts.filter(
            (x) => x.user_id === p.id,
          );

        const avg = att.length
          ? Math.round(
              att.reduce(
                (a, b) =>
                  a + b.percentage,
                0,
              ) / att.length,
            )
          : 0;

        const live =
          presence[p.id];

        return {
          ...p,

          completed:
            prog.filter(
              (x) => x.completed,
            ).length,

          watchHours: (
            prog.reduce(
              (a, b) =>
                a +
                (b.watch_seconds ??
                  0),
              0,
            ) / 3600
          ).toFixed(1),

          attempts: att.length,

          avg,

          courses:
            data.enrollments.filter(
              (e) =>
                e.user_id === p.id,
            ).length,

          /*
           * Live information
           */
          online:
            live?.status ===
            "online",

          activity:
            live?.activity ??
            "offline",

          activityDetail:
            live?.detail ?? "",

          lastSeen:
            live?.last_seen ??
            null,
        };
      });
  }, [
    data,
    q,
    grade,
    presence,
  ]);

  /*
   * عدد الطلاب المتصلين
   */
  const onlineCount = useMemo(
    () =>
      rows.filter(
        (student) =>
          student.online,
      ).length,
    [rows],
  );

  /*
   * عدد الطلاب الذين يؤدون امتحان
   */
  const examCount = useMemo(
    () =>
      rows.filter(
        (student) =>
          student.activity ===
          "exam",
      ).length,
    [rows],
  );

  /*
   * عدد الطلاب الذين يشاهدون فيديو
   */
  const videoCount = useMemo(
    () =>
      rows.filter(
        (student) =>
          student.activity ===
          "video",
      ).length,
    [rows],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* =========================
          Live Statistics
         ========================= */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
              <Circle className="size-5 fill-current" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                متصل الآن
              </p>

              <p className="text-2xl font-black">
                {onlineCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Video className="size-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                يشاهدون فيديو
              </p>

              <p className="text-2xl font-black">
                {videoCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
              <ClipboardCheck className="size-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                يؤدون امتحان
              </p>

              <p className="text-2xl font-black">
                {examCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                إجمالي الطلاب
              </p>

              <p className="text-2xl font-black">
                {rows.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================
          Students
         ========================= */}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-primary" />

            الطلاب ({rows.length})
          </CardTitle>

          {/* Search + Filters */}

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={q}
                onChange={(e) =>
                  setQ(e.target.value)
                }
                placeholder="ابحث بالاسم أو رقم الهاتف"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <Badge
                onClick={() =>
                  setGrade("all")
                }
                className="cursor-pointer"
                variant={
                  grade === "all"
                    ? "default"
                    : "secondary"
                }
              >
                الكل
              </Badge>

              {grades.map((g) => (
                <Badge
                  key={g}
                  onClick={() =>
                    setGrade(g)
                  }
                  className="cursor-pointer"
                  variant={
                    grade === g
                      ? "default"
                      : "secondary"
                  }
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-start">
                <th className="p-2 text-start">
                  الطالب
                </th>

                <th className="p-2 text-start">
                  الحالة
                </th>

                <th className="p-2 text-start">
                  النشاط
                </th>

                <th className="p-2 text-start">
                  الصف
                </th>

                <th className="p-2 text-start">
                  الكورسات
                </th>

                <th className="p-2 text-start">
                  دروس مكتملة
                </th>

                <th className="p-2 text-start">
                  وقت المشاهدة
                </th>

                <th className="p-2 text-start">
                  الامتحانات
                </th>

                <th className="p-2 text-start">
                  المتوسط
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 transition-colors hover:bg-muted/40"
                >
                  {/* =====================
                      Student
                     ===================== */}

                  <td className="p-2">
                    <p className="font-bold">
                      {r.full_name ||
                        "بدون اسم"}
                    </p>

                    <p
                      dir="ltr"
                      className="text-xs text-muted-foreground"
                    >
                      {r.phone || "—"}
                    </p>

                    {/* WhatsApp */}

                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.phone ? (
                        <a
                          href={`https://wa.me/${String(
                            r.phone,
                          ).replace(
                            /\D/g,
                            "",
                          )}`}
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
                          href={`https://wa.me/${String(
                            r.parent_phone,
                          ).replace(
                            /\D/g,
                            "",
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-green-800"
                        >
                          <MessageCircle className="size-3" />

                          ولي الأمر
                        </a>
                      ) : null}
                    </div>
                  </td>

                  {/* =====================
                      Online Status
                     ===================== */}

                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Circle
                        className={`size-3 fill-current ${
                          r.online
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      />

                      <span
                        className={
                          r.online
                            ? "font-bold text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {r.online
                          ? "متصل الآن"
                          : "غير متصل"}
                      </span>
                    </div>

                    {r.lastSeen ? (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3 className="size-3" />

                        آخر ظهور:

                        <span dir="ltr">
                          {new Date(
                            r.lastSeen,
                          ).toLocaleString(
                            "ar-EG",
                          )}
                        </span>
                      </div>
                    ) : null}
                  </td>

                  {/* =====================
                      Current Activity
                     ===================== */}

                  <td className="p-2">
                    {r.activity ===
                    "exam" ? (
                      <Badge
                        variant="destructive"
                        className="gap-1"
                      >
                        <ClipboardCheck className="size-3" />

                        أداء امتحان
                      </Badge>
                    ) : r.activity ===
                      "video" ? (
                      <Badge
                        variant="default"
                        className="gap-1"
                      >
                        <Video className="size-3" />

                        مشاهدة فيديو
                      </Badge>
                    ) : r.activity ===
                      "idle" &&
                      r.online ? (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                      >
                        <Activity className="size-3" />

                        نشط
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                      >
                        غير نشط
                      </Badge>
                    )}

                    {r.activityDetail ? (
                      <p className="mt-1 max-w-44 truncate text-[10px] text-muted-foreground">
                        {r.activityDetail}
                      </p>
                    ) : null}
                  </td>

                  {/* =====================
                      Grade
                     ===================== */}

                  <td className="p-2">
                    {r.grade || "-"}
                  </td>

                  {/* =====================
                      Courses
                     ===================== */}

                  <td className="p-2">
                    {r.courses}
                  </td>

                  {/* =====================
                      Completed Lessons
                     ===================== */}

                  <td className="p-2">
                    {r.completed}
                  </td>

                  {/* =====================
                      Watch Time
                     ===================== */}

                  <td className="p-2">
                    {r.watchHours} س
                  </td>

                  {/* =====================
                      Exams
                     ===================== */}

                  <td className="p-2">
                    {r.attempts}
                  </td>

                  {/* =====================
                      Average
                     ===================== */}

                  <td className="w-36 p-2">
                    <Progress
                      value={r.avg}
                    />

                    <span className="text-xs text-muted-foreground">
                      {r.avg}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!rows.length ? (
            <p className="py-10 text-center text-muted-foreground">
              لا يوجد طلاب مطابقون.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
    </Card>
  );
}
