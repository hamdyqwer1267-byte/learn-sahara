import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Lock, Unlock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "الكورسات | خليك علومنجي" },
      { name: "description", content: "تصفح جميع الكورسات المتاحة حسب الصف الدراسي وفعّلها بالكود." },
      { property: "og:title", content: "الكورسات | خليك علومنجي" },
      { property: "og:description", content: "تصفح جميع الكورسات المتاحة حسب الصف الدراسي." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,grade,price,cover_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("course_id");
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-black">الكورسات المتاحة</h1>
        <p className="mt-2 text-muted-foreground">اختر كورسك وابدأ المذاكرة فورًا بعد التفعيل.</p>

        {isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const enrolled = enrollments?.includes(c.id) ?? false;
              return (
                <Card key={c.id} className="flex flex-col transition-transform hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{c.grade || "عام"}</Badge>
                      {enrolled ? (
                        <Badge className="bg-success text-success-foreground">
                          <Unlock className="size-3" /> مُفعّل
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Lock className="size-3" /> يحتاج تفعيل
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="pt-2">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                    <p className="font-bold text-accent">
                      {Number(c.price) > 0 ? `${c.price} جنيه` : "مجاني"}
                    </p>
                    {user ? (
                      <Button asChild className="w-full">
                        <Link to="/course/$courseId" params={{ courseId: c.id }}>
                          <BookOpen className="size-4" /> فتح الكورس
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link to="/auth">سجّل للدخول للكورس</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="mt-10 text-muted-foreground">لا توجد كورسات منشورة حاليًا.</p>
        )}
      </main>
    </div>
  );
}
