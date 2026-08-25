import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import {
  BookOpen,
ClipboardList,
ClipboardCheck,
MessageCircle,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  {
    to: "/admin",
    label: "المحتوى",
    icon: BookOpen,
  },
  {
    to: "/admin/quizzes",
    label: "الامتحانات",
    icon: ClipboardList,
  },
  {
  to: "/admin/homework",
  label: "الواجبات",
  icon: ClipboardCheck,
},
  {
    to: "/admin/students",
    label: "الطلاب",
    icon: Users,
  },
  {
    to: "/admin/codes",
    label: "أكواد التفعيل",
    icon: Ticket,
  },
  {
    to: "/admin/admins",
    label: "المشرفون",
    icon: ShieldCheck,
  },
  {
    to: "/admin/support",
    label: "محادثات الطلاب",
    icon: MessageCircle,
  },
] as const;

function AdminLayout() {
  const { isAdmin, loading } = useAuth();

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-black">
          صلاحيات غير كافية
        </h1>

        <p className="mt-2 text-muted-foreground">
          هذه الصفحة مخصصة للمدرّس / الإدارة فقط.
        </p>

        <Button className="mt-6" asChild>
          <Link to="/dashboard">
            العودة للوحة الطالب
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-black">
        لوحة تحكم المدرّس
      </h1>

      <nav className="mt-5 -mx-4 flex gap-2 overflow-x-auto border-b border-border px-4 pb-3 md:mx-0 md:flex-wrap md:px-0">
        {NAV.map((n) => (
          <Button
            key={n.to}
            variant={
              pathname === n.to
                ? "default"
                : "ghost"
            }
            asChild
            size="sm"
            className="shrink-0"
          >
            <Link to={n.to}>
              <n.icon className="size-4" />
              {n.label}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="pt-6">
        <Outlet />
      </div>
    </main>
  );
}
