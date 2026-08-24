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

export const Route = createFileRoute(
  "/_authenticated/admin/students",
)({
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

  const [presence, setPresence] = useState<
    Record<string, PresenceRow>
  >({});

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

      if (profiles.error) {
        throw profiles.error;
      }

      if (progress.error) {
        throw progress.error;
      }

      if (attempts.error) {
        throw attempts.error;
      }

      if (enrollments.error) {
        throw enrollments.error;
      }

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
   */
  useEffect(() => {
    let active = true;

    const loadPresence = async () => {
      const { data, error } = await supabase
        .from("user_presence")
        .select(
          "user_id,status,activity,detail,session_id,last_seen",
        );

      if (error) {
        console.error(
          "Presence error:",
          error,
        );
        return;
      }

      if (!active || !data) {
        return;
      }

      const mapped: Record<
        string,
        PresenceRow
      > = {};

      data.forEach((row) => {
        mapped[row.user_id] =
          row as PresenceRow;
      });

      setPresence(mapped);
    };

    void loadPresence();

    /*
     * Supabase Realtime
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

          if (
            payload.eventType === "DELETE"
          ) {
            const row =
              payload.old as {
                user_id: string;
              };

            setPresence((current) => {
              const next = {
                ...current,
              };

              delete next[row.user_id];

              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(
        channel,
      );
    };
  }, []);

  /*
   * الصفوف المتاحة
   */
  const grades = useMemo(() => {
    return Array.from(
      new Set(
        (data?.profiles ?? [])
          .map((p) => p.grade)
          .filter(Boolean),
      ),
    ) as string[];
  }, [data]);

  /*
   * تجهيز بيانات الطلاب
   */
  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.profiles
      .filter((p) => {
        return grade === "all"
          ? true
          : p.grade === grade;
      })
      .filter((p) => {
        const search =
          q.trim().toLowerCase();

        if (!search) {
          return true;
        }

        return `${p.full_name ?? ""} ${
          p.phone ?? ""
        }`
          .toLowerCase()
          .includes(search);
      })
      .map((p) => {
        const progress =
          data.progress.filter(
            (item) =>
              item.user_id === p.id,
          );

        const attempts =
          data.attempts.filter(
            (item) =>
              item.user_id === p.id,
          );

        const average =
          attempts.length > 0
            ? Math.round(
                attempts.reduce(
                  (total, item) =>
                    total +
                    item.percentage,
                  0,
                ) / attempts.length,
              )
            : 0;

        const live =
          presence[p.id];

        return {
          ...p,

          completed:
            progress.filter(
              (item) =>
                item.completed,
            ).length,

          watchHours: (
            progress.reduce(
              (total, item) =>
                total +
                (item.watch_seconds ??
                  0),
              0,
            ) / 3600
          ).toFixed(1),

          attempts:
            attempts.length,

          average,

          courses:
            data.enrollments.filter(
              (item) =>
                item.user_id ===
                p.id,
            ).length,

         online:
  live?.status === "online" &&
  !!live?.last_seen &&
  Date.now() -
    new Date(live.last_seen).getTime() <
    45_000,
          activity:
            live?.activity ??
            "offline",

          detail:
            live?.detail ?? "",

          lastSeen:
            live?.last_seen ?? null,
        };
      });
  }, [
    data,
    q,
    grade,
    presence,
  ]);

  /*
   * إحصائيات Live
   */
  const onlineCount =
    rows.filter(
      (student) =>
        student.online,
    ).length;

  const examCount =
    rows.filter(
      (student) =>
        student.activity ===
        "exam",
    ).length;

  const videoCount =
    rows.filter(
      (student) =>
        student.activity ===
        "video",
    ).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* الإحصائيات */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Circle className="size-5 fill-green-500 text-green-500" />

            <div>
              <p className="text-xs text-muted-foreground">
                متصل الآن
              </p>

              <p className="text-2xl font-bold">
                {onlineCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Video className="size-5 text-blue-500" />

            <div>
              <p className="text-xs text-muted-foreground">
                يشاهدون فيديو
              </p>

              <p className="text-2xl font-bold">
                {videoCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardCheck className="size-5 text-orange-500" />

            <div>
              <p className="text-xs text-muted-foreground">
                يؤدون امتحان
              </p>

              <p className="text-2xl font-bold">
                {examCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="size-5 text-primary" />

            <div>
              <p className="text-xs text-muted-foreground">
                إجمالي الطلاب
              </p>

              <p className="text-2xl font-bold">
                {rows.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول الطلاب */}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            الطلاب ({rows.length})
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={q}
                onChange={(event) =>
                  setQ(event.target.value)
                }
                placeholder="ابحث بالاسم أو رقم الهاتف"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <Badge
                className="cursor-pointer"
                variant={
                  grade === "all"
                    ? "default"
                    : "secondary"
                }
                onClick={() =>
                  setGrade("all")
                }
              >
                الكل
              </Badge>

              {grades.map((item) => (
                <Badge
                  key={item}
                  className="cursor-pointer"
                  variant={
                    grade === item
                      ? "default"
                      : "secondary"
                  }
                  onClick={() =>
                    setGrade(item)
                  }
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
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
                  المشاهدة
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
              {rows.map((student) => (
                <tr
                  key={student.id}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  {/* الطالب */}

                  <td className="p-2">
                    <p className="font-bold">
                      {student.full_name ||
                        "بدون اسم"}
                    </p>

                    <p
                      dir="ltr"
                      className="text-xs text-muted-foreground"
                    >
                      {student.phone ||
                        "—"}
                    </p>

                    <div className="mt-2 flex gap-1">
                      {student.phone ? (
                        <a
                          href={`https://wa.me/${String(
                            student.phone,
                          ).replace(
                            /\D/g,
                            "",
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          <MessageCircle className="size-3" />
                          الطالب
                        </a>
                      ) : null}

                      {student.parent_phone ? (
                        <a
                          href={`https://wa.me/${String(
                            student.parent_phone,
                          ).replace(
                            /\D/g,
                            "",
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          <MessageCircle className="size-3" />
                          ولي الأمر
                        </a>
                      ) : null}
                    </div>
                  </td>

                  {/* الحالة */}

                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Circle
                        className={`size-3 fill-current ${
                          student.online
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      />

                      <span
                        className={
                          student.online
                            ? "font-bold text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {student.online
                          ? "متصل الآن"
                          : "غير متصل"}
                      </span>
                    </div>

                    {student.lastSeen ? (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3 className="size-3" />

                        آخر ظهور:

                        <span dir="ltr">
                          {new Date(
                            student.lastSeen,
                          ).toLocaleString(
                            "ar-EG",
                          )}
                        </span>
                      </div>
                    ) : null}
                  </td>

                  {/* النشاط */}

                  <td className="p-2">
                    {student.activity ===
                    "exam" ? (
                      <Badge variant="destructive">
                        <ClipboardCheck className="me-1 size-3" />
                        أداء امتحان
                      </Badge>
                    ) : student.activity ===
                      "video" ? (
                      <Badge>
                        <Video className="me-1 size-3" />
                        مشاهدة فيديو
                      </Badge>
                    ) : student.activity ===
                        "idle" &&
                      student.online ? (
                      <Badge variant="secondary">
                        <Activity className="me-1 size-3" />
                        خامل
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        غير نشط
                      </Badge>
                    )}

                    {student.detail ? (
                      <p className="mt-1 max-w-44 truncate text-xs text-muted-foreground">
                        {student.detail}
                      </p>
                    ) : null}
                  </td>

                  {/* الصف */}

                  <td className="p-2">
                    {student.grade ||
                      "-"}
                  </td>

                  {/* الكورسات */}

                  <td className="p-2">
                    {student.courses}
                  </td>

                  {/* الدروس */}

                  <td className="p-2">
                    {student.completed}
                  </td>

                  {/* المشاهدة */}

                  <td className="p-2">
                    {student.watchHours} س
                  </td>

                  {/* الامتحانات */}

                  <td className="p-2">
                    {student.attempts}
                  </td>

                  {/* المتوسط */}

                  <td className="w-36 p-2">
                    <Progress
                      value={
                        student.average
                      }
                    />

                    <span className="text-xs text-muted-foreground">
                      {student.average}%
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
