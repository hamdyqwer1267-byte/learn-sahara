import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Moon, Sun, LogOut, LayoutDashboard, Ticket, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
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
          <span className="text-lg font-extrabold">منصة النخبة التعليمية</span>
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
              <Button variant="outline" size="icon" onClick={signOut} aria-label="تسجيل الخروج">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
