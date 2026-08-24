import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SupportChat } from "@/components/support-chat";

type Conversation = {
  student_id: string;
  last_message: string;
  last_message_at: string;
  unread: number;
};

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: AdminSupport,
});

function AdminSupport() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const grouped = new Map<string, Conversation>();

    for (const item of data ?? []) {
      if (!grouped.has(item.student_id)) {
        grouped.set(item.student_id, {
          student_id: item.student_id,
          last_message: item.body,
          last_message_at: item.created_at,
          unread: item.from_admin || item.read_at ? 0 : 1,
        });
      }
    }

    setConversations(Array.from(grouped.values()));
  };

  useEffect(() => {
    void loadConversations();

    const channel = supabase
      .channel("admin-support-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
        },
        () => {
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const deleteConversation = async (studentId: string) => {
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

    if (selectedStudent === studentId) {
      setSelectedStudent(null);
    }

    await loadConversations();
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black">محادثات الطلاب</h1>
        <p className="text-sm text-muted-foreground">
          الرد على أسئلة الطلاب ومتابعة رسائل الدعم
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="mb-3 flex items-center gap-2 px-2">
              <MessageCircle className="size-5 text-primary" />
              <h2 className="font-bold">الطلاب</h2>
            </div>

            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد محادثات حتى الآن.
                </p>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.student_id}
                    className={`rounded-xl border p-3 transition ${
                      selectedStudent === conversation.student_id
                        ? "border-primary bg-muted"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-right"
                      onClick={() =>
                        setSelectedStudent(conversation.student_id)
                      }
                    >
                      <p className="text-sm font-bold">
                        طالب
                      </p>

                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {conversation.last_message}
                      </p>
                    </button>

                    <div className="mt-2 flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          void deleteConversation(
                            conversation.student_id
                          )
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-[600px] lg:col-span-2">
          {selectedStudent ? (
            <AdminConversation
              studentId={selectedStudent}
              onDeleted={() => {
                setSelectedStudent(null);
                void loadConversations();
              }}
            />
          ) : (
            <Card className="flex h-full min-h-[600px] items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                اختر محادثة من القائمة
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminConversation({
  studentId,
  onDeleted,
}: {
  studentId: string;
  onDeleted: () => void;
}) {
  return (
    <div className="h-full">
      <SupportChat adminModeStudentId={studentId} onDeleted={onDeleted} />
    </div>
  );
}
