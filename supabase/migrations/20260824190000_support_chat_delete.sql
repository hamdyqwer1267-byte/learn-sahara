-- السماح للأدمن فقط بحذف رسائل الدعم
CREATE POLICY "admin delete support messages"
ON public.support_messages
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);
