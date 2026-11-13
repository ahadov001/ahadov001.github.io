-- =====================================================================
--  Sınaq — verilənlər bazası sxemi (Supabase / PostgreSQL)
--  Supabase paneli → SQL Editor-də BÜTÖVLÜKDƏ bir dəfə işə salın.
--  Təkrar işə salmaq təhlükəsizdir (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- cədvəllər

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  balance     numeric(10,2) not null default 0,   -- yalnız funksiyalar dəyişir
  created_at  timestamptz not null default now()
);

create table if not exists public.items (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  kind           text not null check (kind in ('topic','exam','mixed','bundle')),
  subject        text not null default 'azerbaycan-dili',
  title          text not null,
  subtitle       text,
  sort           int  not null default 0,
  price          numeric(8,2) not null default 0 check (price >= 0),
  question_count int  not null default 0,
  minutes        int  not null default 0,
  mode           text not null default 'learn' check (mode in ('learn','exam')),
  active         boolean not null default true
);

-- Suallar və dərs mətni AYRI cədvəldədir: heç bir siyasət yoxdur,
-- yalnız get_item() funksiyası (alışı yoxlayaraq) oxuya bilir.
create table if not exists public.item_content (
  item_id    uuid primary key references public.items(id) on delete cascade,
  lesson     text,
  questions  jsonb not null default '[]'::jsonb
);

create table if not exists public.purchases (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_id     uuid not null references public.items(id),
  price       numeric(8,2) not null,
  created_at  timestamptz not null default now(),
  unique (user_id, item_id)
);

-- Balans jurnalı: hər artım/azalma burada qeyd olunur.
create table if not exists public.transactions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  amount        numeric(10,2) not null,           -- + artım, − xərc
  kind          text not null check (kind in ('topup','purchase','refund','adjust')),
  ref           text unique,                      -- təkrar emalın qarşısı (Lemon Squeezy order id)
  item_id       uuid references public.items(id),
  note          text,
  balance_after numeric(10,2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

create table if not exists public.topup_packages (
  id            int generated always as identity primary key,
  amount        numeric(8,2) not null check (amount > 0),   -- balansa əlavə olunan AZN
  checkout_url  text not null,                              -- Lemon Squeezy "Buy link"
  variant_id    text not null unique,                       -- Lemon Squeezy variant id
  sort          int not null default 0,
  active        boolean not null default true
);

create table if not exists public.attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  item_id       uuid not null references public.items(id),
  answers       jsonb not null,
  score         int not null,
  total         int not null,
  duration_sec  int,
  created_at    timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts(user_id, created_at desc);

create table if not exists public.item_progress (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  item_id          uuid not null references public.items(id),
  status           text not null default 'started' check (status in ('started','completed')),
  started_at       timestamptz not null default now(),
  last_opened_at   timestamptz not null default now(),
  completed_at     timestamptz,
  primary key (user_id, item_id)
);

-- ------------------------------------------------- yeni istifadəçi → profil

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ icazələr (RLS)

alter table public.profiles       enable row level security;
alter table public.items          enable row level security;
alter table public.item_content   enable row level security;
alter table public.purchases      enable row level security;
alter table public.transactions   enable row level security;
alter table public.topup_packages enable row level security;
alter table public.attempts       enable row level security;
alter table public.item_progress  enable row level security;

-- əvvəlcə hər şeyi bağla, sonra lazım olanı aç
revoke all on public.profiles, public.items, public.item_content, public.purchases,
              public.transactions, public.topup_packages, public.attempts,
              public.item_progress from anon, authenticated;

drop policy if exists items_read on public.items;
create policy items_read on public.items for select to anon, authenticated using (active);
grant select on public.items to anon, authenticated;

drop policy if exists packages_read on public.topup_packages;
create policy packages_read on public.topup_packages for select to anon, authenticated using (active);
grant select (id, amount, checkout_url, sort, active) on public.topup_packages to anon, authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid());
grant select on public.profiles to authenticated;

-- istifadəçi yalnız öz adını dəyişə bilər; balans sütununa toxuna bilməz
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant update (full_name) on public.profiles to authenticated;

drop policy if exists purchases_read on public.purchases;
create policy purchases_read on public.purchases for select to authenticated using (user_id = auth.uid());
grant select on public.purchases to authenticated;

drop policy if exists transactions_read on public.transactions;
create policy transactions_read on public.transactions for select to authenticated using (user_id = auth.uid());
grant select on public.transactions to authenticated;

drop policy if exists attempts_read on public.attempts;
create policy attempts_read on public.attempts for select to authenticated using (user_id = auth.uid());
grant select on public.attempts to authenticated;

drop policy if exists progress_read on public.item_progress;
create policy progress_read on public.item_progress for select to authenticated using (user_id = auth.uid());
grant select on public.item_progress to authenticated;

-- ------------------------------------------------------------- funksiyalar

-- İstifadəçinin məhsula çıxışı varmı? (pulsuz / alınıb / tam paket)
create or replace function public.has_access(p_user uuid, p_item uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from items i where i.id = p_item and i.price = 0)
      or (p_user is not null and exists (
            select 1 from purchases p
            join items bought on bought.id = p.item_id
            where p.user_id = p_user
              and (p.item_id = p_item or bought.kind = 'bundle')));
$$;

-- Balansdan alış. Nəticə: ok | owned | insufficient
create or replace function public.purchase_item(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid  uuid := auth.uid();
  it   items%rowtype;
  bal  numeric(10,2);
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;

  select * into it from items where slug = p_slug and active;
  if not found then raise exception 'item_not_found' using errcode = 'P0001'; end if;

  -- balans sətrini kilidlə: eyni anda iki alış balansı mənfiyə sala bilməz
  select balance into bal from profiles where id = uid for update;
  if not found then raise exception 'profile_missing' using errcode = 'P0001'; end if;

  if has_access(uid, it.id) then
    return jsonb_build_object('status','owned','balance',bal);
  end if;

  if bal < it.price then
    return jsonb_build_object('status','insufficient','balance',bal,'price',it.price,'missing',it.price - bal);
  end if;

  update profiles set balance = balance - it.price where id = uid returning balance into bal;
  insert into purchases (user_id, item_id, price) values (uid, it.id, it.price);
  insert into transactions (user_id, amount, kind, item_id, note, balance_after)
  values (uid, -it.price, 'purchase', it.id, it.title, bal);

  return jsonb_build_object('status','ok','balance',bal,'price',it.price);
end $$;

-- Məhsulun məzmunu (dərs + suallar). Giriş yoxdursa xəta.
create or replace function public.get_item(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it  items%rowtype;
  c   item_content%rowtype;
begin
  select * into it from items where slug = p_slug and active and kind <> 'bundle';
  if not found then raise exception 'item_not_found' using errcode = 'P0001'; end if;

  if not has_access(uid, it.id) then
    raise exception 'access_denied' using errcode = 'P0001';
  end if;

  select * into c from item_content where item_id = it.id;

  if uid is not null then
    insert into item_progress (user_id, item_id) values (uid, it.id)
    on conflict (user_id, item_id) do update set last_opened_at = now();
  end if;

  return jsonb_build_object(
    'slug', it.slug, 'title', it.title, 'subtitle', it.subtitle, 'kind', it.kind,
    'mode', it.mode, 'minutes', it.minutes, 'price', it.price,
    'lesson', c.lesson, 'questions', coalesce(c.questions, '[]'::jsonb));
end $$;

-- Nəticəni qəbul edir. Bal SERVERDƏ hesablanır — brauzerdən gələn bal etibar olunmur.
create or replace function public.submit_attempt(p_slug text, p_answers jsonb, p_duration int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  it    items%rowtype;
  qs    jsonb;
  n     int;
  sc    int := 0;
  i     int;
  given jsonb;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;

  select * into it from items where slug = p_slug and active and kind <> 'bundle';
  if not found then raise exception 'item_not_found' using errcode = 'P0001'; end if;
  if not has_access(uid, it.id) then raise exception 'access_denied' using errcode = 'P0001'; end if;

  select questions into qs from item_content where item_id = it.id;
  n := jsonb_array_length(qs);
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> n then
    raise exception 'bad_answers' using errcode = 'P0001';
  end if;

  for i in 0 .. n - 1 loop
    given := p_answers -> i;
    if jsonb_typeof(given) = 'number' and given = (qs -> i -> 'a') then sc := sc + 1; end if;
  end loop;

  insert into attempts (user_id, item_id, answers, score, total, duration_sec)
  values (uid, it.id, p_answers, sc, n, least(greatest(coalesce(p_duration,0),0), 86400));

  insert into item_progress (user_id, item_id, status, completed_at)
  values (uid, it.id, 'completed', now())
  on conflict (user_id, item_id) do update
    set status = 'completed', completed_at = now(), last_opened_at = now();

  return jsonb_build_object('score', sc, 'total', n);
end $$;

-- ---- Yalnız server (webhook) üçün: balansı artırmaq / geri qaytarmaq ----

create or replace function public.credit_topup(p_user uuid, p_amount numeric, p_ref text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare bal numeric(10,2); inserted bigint;
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  select balance into bal from profiles where id = p_user for update;
  if not found then raise exception 'profile_missing'; end if;

  -- ref unikaldır: eyni ödəniş ikinci dəfə gəlsə, heç nə dəyişmir
  insert into transactions (user_id, amount, kind, ref, note, balance_after)
  values (p_user, p_amount, 'topup', p_ref, p_note, bal + p_amount)
  on conflict (ref) do nothing
  returning id into inserted;

  if inserted is null then
    return jsonb_build_object('status','duplicate','balance',bal);
  end if;
  update profiles set balance = balance + p_amount where id = p_user returning balance into bal;
  return jsonb_build_object('status','credited','balance',bal);
end $$;

create or replace function public.refund_topup(p_user uuid, p_amount numeric, p_ref text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare bal numeric(10,2); inserted bigint;
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  select balance into bal from profiles where id = p_user for update;
  if not found then raise exception 'profile_missing'; end if;

  insert into transactions (user_id, amount, kind, ref, note, balance_after)
  values (p_user, -p_amount, 'refund', p_ref, p_note, bal - p_amount)
  on conflict (ref) do nothing
  returning id into inserted;

  if inserted is null then
    return jsonb_build_object('status','duplicate','balance',bal);
  end if;
  update profiles set balance = balance - p_amount where id = p_user returning balance into bal;
  return jsonb_build_object('status','refunded','balance',bal);
end $$;

-- funksiyaların icazələri
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_item(text)                     to anon, authenticated;
grant execute on function public.purchase_item(text)                to authenticated;
grant execute on function public.submit_attempt(text, jsonb, int)   to authenticated;
grant execute on function public.credit_topup(uuid, numeric, text, text) to service_role;
grant execute on function public.refund_topup(uuid, numeric, text, text) to service_role;
