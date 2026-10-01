-- 0013 — every row says which look it is, always.
--
-- 0012 made theme_mode nullable so that "never chosen" could be told apart
-- from "chose light". That was there to rescue a choice made before the column
-- existed, when it could only reach the cookie. Everyone has had the chance to
-- pick again since, so the rescue is done — and what it leaves behind is a
-- column that reads "not chosen" for most people, which is not something the
-- dairy should have to interpret.
--
-- Back to a value on every row. The cookie keeps the one job it cannot be
-- replaced for: the login and sign-up screens, where nobody is signed in to
-- ask.
--
-- Run this once in the Supabase SQL editor, after 0012.

update public.users set theme_mode = 'light' where theme_mode is null;

alter table public.users
  alter column theme_mode set default 'light',
  alter column theme_mode set not null;
