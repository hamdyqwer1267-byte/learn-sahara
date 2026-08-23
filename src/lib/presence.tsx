import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Activity = "idle" | "video" | "exam" | "browsing";

type PresenceValue = {
  sessionId: string;
  setActivity: (activity: Activity, detail?: string) => void;
};

const PresenceContext = createContext<PresenceValue>({ sessionId: "", setActivity: () => {} });

const newSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionId] = useState(newSessionId);
  const state = useRef<{ activity: Activity; detail: string }>({ activity: "browsing", detail: "" });
  const kicked = useRef(false);

  const setActivity = useMemo(
    () => (activity: Activity, detail = "") => {
      state.current = { activity, detail };
    },
    [],
  );

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const beat = async (status: "online" | "offline" = "online") => {
      if (stopped && status === "online") return;
      await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          status,
          activity: state.current.activity,
          detail: state.current.detail,
          session_id: sessionId,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    void beat();
    const interval = setInterval(() => void beat(), 20000);

    // Single-session enforcement: another device overwrote our session id.
    const channel = supabase
      .channel(`presence-self-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { session_id?: string } | null;
          if (!row?.session_id || row.session_id === sessionId || kicked.current) return;
          kicked.current = true;
          stopped = true;
          toast.error("تم تسجيل الدخول من جهاز آخر — سيتم إنهاء هذه الجلسة");
          void supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
        },
      )
      .subscribe();

    const onHide = () => {
      if (document.visibilityState === "hidden") void beat("offline");
      else void beat("online");
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void supabase.removeChannel(channel);
      void beat("offline");
    };
  }, [user, sessionId, navigate]);

  const value = useMemo(() => ({ sessionId, setActivity }), [sessionId, setActivity]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export const usePresence = () => useContext(PresenceContext);

/** Declares what the student is currently doing while the component is mounted. */
export function useActivity(activity: Activity, detail = "") {
  const { setActivity } = usePresence();
  useEffect(() => {
    setActivity(activity, detail);
    return () => setActivity("browsing", "");
  }, [activity, detail, setActivity]);
}
