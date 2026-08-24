import { useEffect, useState } from "react";
import { MessageCircle, Send, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SupportMessage = {
  id: string;
  student_id: string;
  sender_id: string;
  from_admin: boolean;
  body: string;
  read_at: string | null;
  created_at: string;
};

type SupportChatProps = {
  adminMode?: boolean;
};

export function SupportChat({ adminMode = false }: SupportChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [message, setMessage] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMessages = async (userId: string) => {
    const query = supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: true });

    const { data, error } = adminMode
      ? await query
      : await query.eq("student_id", userId);

    if (!error) {
      setMessages((data ?? []) as SupportMessage[]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) return;

      setStudentId(user.id);

      await loadMessages(user.id);
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [adminMode]);

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel(`support-chat-${adminMode ? "admin" : studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          ...(adminMode
            ? {}
            : {
                filter: `student_id=eq.${studentId}`,
              }),
        },
        () => {
          void loadMessages(studentId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, adminMode]);

  const sendMessage = async () => {
    const body = message.trim();

    if (!body || !studentId || loading) return;

    setLoading(true);

    const { error } = await supabase.from("support_messages").insert({
      student_id: studentId,
      sender_id: studentId,
      from_admin: adminMode,
      body,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    setMessage("");
    await loadMessages(studentId);
  };

  const deleteConversation = async () => {
    if (!adminMode || !studentId) return;

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف المحادثة بالكامل؟"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("support_messages")
      .delete()
      .eq("student_id", studentId);

    if (error) {
      console.error(error);
      return;
    }

    setMessages([]);
  };

  if (adminMode) {
    return (
      <div className="flex h-full flex-col rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-bold">محادثة الطالب</h2>
            <p className="text-xs text-muted-foreground">
              المحادثة مع الطالب
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={deleteConversation}
          >
            <Trash2 className="ml-2 size-4" />
            حذف المحادثة
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              لا توجد رسائل.
            </p>
          ) : (
            messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${
                  item.from_admin ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    item.from_admin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {item.body}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب ردك للطالب..."
              rows={2}
            />

            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!message.trim() || loading}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
            <div>
              <h3 className="font-bold">تواصل مع الإدارة</h3>
              <p className="text-xs opacity-80">
                اكتب سؤالك وسيتم الرد عليك
              </p>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <p>
                  اكتب رسالتك للإدارة
                  <br />
                  وسيتم الرد عليك هنا.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${
                    item.from_admin ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      item.from_admin
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {item.body}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />

              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!message.trim() || loading}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"
        aria-label="التواصل مع الإدارة"
      >
        <MessageCircle className="size-7" />
      </button>
    </>
  );
}
