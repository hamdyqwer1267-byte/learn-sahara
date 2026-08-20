import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  Moon,
  Sun,
  LogOut,
  LayoutDashboard,
  Ticket,
  Shield,
  Menu,
  BookOpen,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-gold-gradient flex size-9 items-center justify-center rounded-xl text-accent-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-extrabold">خليك علومنجي</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild>
            <Link to="/courses">الكورسات</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" /> لوحتي
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/redeem">
                  <Ticket className="size-4" /> تفعيل كود
                </Link>
              </Button>
              {isAdmin ? (
                <Button variant="ghost" asChild>
                  <Link to="/admin">
                    <Shield className="size-4" /> لوحة التحكم
                  </Link>
                </Button>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="تبديل المظهر">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile?.full_name || user.email}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={signOut}
                aria-label="تسجيل الخروج"
                className="hidden md:inline-flex"
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild className="hidden md:inline-flex">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="القائمة">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" dir="rtl" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-start">القائمة</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-1 px-4 pb-6">
                <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                  <Link to="/courses">
                    <BookOpen className="size-4" /> الكورسات
                  </Link>
                </Button>
                {user ? (
                  <>
                    <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                      <Link to="/dashboard">
                        <LayoutDashboard className="size-4" /> لوحتي
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                      <Link to="/redeem">
                        <Ticket className="size-4" /> تفعيل كود
                      </Link>
                    </Button>
                    {isAdmin ? (
                      <Button variant="secondary" className="justify-start" asChild onClick={() => setOpen(false)}>
                        <Link to="/admin">
                          <Shield className="size-4" /> لوحة التحكم
                        </Link>
                      </Button>
                    ) : null}
                    <Button variant="outline" className="mt-3 justify-start" onClick={signOut}>
                      <LogOut className="size-4" /> تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <Button className="mt-3" asChild onClick={() => setOpen(false)}>
                    <Link to="/auth">تسجيل الدخول</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
