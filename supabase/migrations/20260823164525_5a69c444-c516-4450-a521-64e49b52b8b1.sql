
-- 1. Support chat
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.support_messages FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "send own" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "mark read" ON public.support_messages FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX support_messages_student_idx ON public.support_messages(student_id, created_at DESC);

-- 2. Presence / live activity
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online',
  activity text NOT NULL DEFAULT 'idle',
  detail text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT '',
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence read" ON public.user_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "presence upsert" ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence update" ON public.user_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Exam proctoring events
CREATE TABLE public.exam_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  warning_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exam_events TO authenticated;
GRANT ALL ON public.exam_events TO service_role;
ALTER TABLE public.exam_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.exam_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "events insert own" ON public.exam_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE INDEX exam_events_created_idx ON public.exam_events(created_at DESC);

-- 4. Admin remote commands during exams
CREATE TABLE public.exam_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  action text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.exam_commands TO authenticated;
GRANT ALL ON public.exam_commands TO service_role;
ALTER TABLE public.exam_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commands read" ON public.exam_commands FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "commands insert admin" ON public.exam_commands FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "commands consume" ON public.exam_commands FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. Scheduled content release
ALTER TABLE public.lessons ADD COLUMN publish_at timestamptz;

-- Realtime
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.exam_events REPLICA IDENTITY FULL;
ALTER TABLE public.exam_commands REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_commands;
