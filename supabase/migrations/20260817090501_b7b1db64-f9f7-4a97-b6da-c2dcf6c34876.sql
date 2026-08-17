-- allow admins to manage roles
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "roles admin insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

-- enrolled students can see their (even unpublished) courses
DROP POLICY IF EXISTS "courses public read" ON public.courses;
CREATE POLICY "courses public read" ON public.courses FOR SELECT TO anon, authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin') OR public.is_enrolled_course(auth.uid(), id));

-- atomic single-use redemption
CREATE OR REPLACE FUNCTION public.redeem_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE rec public.redemption_codes; uid uuid := auth.uid(); claimed public.redemption_codes;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'يجب تسجيل الدخول'); END IF;
  SELECT * INTO rec FROM public.redemption_codes WHERE upper(code) = upper(trim(_code));
  IF rec.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'الكود غير صحيح'); END IF;
  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'انتهت صلاحية الكود'); END IF;

  UPDATE public.redemption_codes SET used_by = uid, used_at = now()
  WHERE id = rec.id AND used_by IS NULL
  RETURNING * INTO claimed;

  IF claimed.id IS NULL THEN
    IF rec.used_by = uid THEN
      RETURN jsonb_build_object('ok', false, 'course_id', rec.course_id, 'message', 'لقد استخدمت هذا الكود بالفعل');
    END IF;
    RETURN jsonb_build_object('ok', false, 'message', 'تم استخدام هذا الكود من قبل');
  END IF;

  INSERT INTO public.enrollments (user_id, course_id, source) VALUES (uid, claimed.course_id, 'code')
  ON CONFLICT (user_id, course_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'course_id', claimed.course_id, 'message', 'تم تفعيل الكورس بنجاح');
END; $function$;

REVOKE EXECUTE ON FUNCTION public.redeem_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_code(text) TO authenticated;