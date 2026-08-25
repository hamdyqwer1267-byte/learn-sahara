ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS is_homework boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS quizzes_is_homework_idx
ON public.quizzes(is_homework);
