import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createAdminSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().trim().min(2).max(80),
});

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAdminSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: "", parent_phone: "", grade: "" },
    });

    let userId = created.data.user?.id;
    if (!userId) {
      return { ok: false as const, message: "تعذّر إنشاء الحساب، ربما البريد مستخدم بالفعل" };
    }

    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.full_name });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError && !roleError.message.includes("duplicate")) {
      return { ok: false as const, message: "تم إنشاء الحساب لكن تعذّر منح صلاحية الأدمن" };
    }

    return { ok: true as const, message: "تم إنشاء حساب أدمن جديد", userId };
  });
