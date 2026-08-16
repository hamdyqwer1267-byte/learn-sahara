
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_code(text) TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.is_enrolled_course(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled_course(uuid, uuid) TO authenticated;
