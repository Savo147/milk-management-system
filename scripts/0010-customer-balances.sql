-- 0010 — what every customer owes, worked out by the database.
--
-- The dashboard wants one number: the money outstanding across everybody,
-- all time. Doing that in the app would mean pulling every milk entry and
-- every payment down and adding them up in JavaScript — thousands of rows
-- within a year, and PostgREST caps how many it will hand over in one go, so
-- the total would quietly start coming out short. Aggregate functions are
-- disabled on this project's API, so the sum has to live here instead.
--
-- SECURITY INVOKER matters. A view without it runs as its owner and ignores
-- row-level security, which would let any signed-in customer read the whole
-- dairy's balances. With it, the policies on customers, milk_entries and
-- payments apply to whoever is asking: the dairy sees everyone, a customer
-- sees only their own row.
--
-- Run this once in the Supabase SQL editor, after 0009.

create or replace view public.customer_balances
with (security_invoker = on) as
select
  c.id as customer_id,
  c.name,
  c.status,
  coalesce(m.billed, 0) as billed,
  coalesce(p.paid, 0) as paid,
  -- Paying ahead leaves payments above the milk. Nothing is owed then, and a
  -- negative figure would only read as broken.
  greatest(0, coalesce(m.billed, 0) - coalesce(p.paid, 0)) as due
from public.customers c
left join (
  select customer_id, sum(total_amount) as billed
  from public.milk_entries
  group by customer_id
) m on m.customer_id = c.id
left join (
  select customer_id, sum(amount) as paid
  from public.payments
  group by customer_id
) p on p.customer_id = c.id;

grant select on public.customer_balances to authenticated;
