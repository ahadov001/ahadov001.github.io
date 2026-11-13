-- ═══════════════════════════════════════════════════════════════
--  SINAQ — Supabase bazası
--  Supabase → SQL Editor-da bu faylı bütöv halda işə salın.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────── 1. PROFİLLƏR (balans burada saxlanır)
create table if not exists public.profiller (
  id          uuid primary key references auth.users(id) on delete cascade,
  ad          text,
  balans      integer not null default 0 check (balans >= 0),  -- qəpiklə saxlanır
  yaradildi   timestamptz not null default now()
);

-- ─────────────────────────── 2. XİDMƏT QİYMƏTLƏRİ
-- Qiymətlər SERVERDƏ saxlanır. Brauzer "bu pulsuzdur" deyə bilməz.
create table if not exists public.qiymetler (
  acar    text primary key,          -- "kimya:rabite", "qbi-1", "paket"
  ad      text not null,
  qiymet  integer not null check (qiymet >= 0)   -- qəpiklə: 200 = 2 AZN
);

-- ─────────────────────────── 3. ALIŞLAR
create table if not exists public.alislar (
  id            bigserial primary key,
  istifadeci    uuid not null references auth.users(id) on delete cascade,
  acar          text not null references public.qiymetler(acar),
  odenilen      integer not null,
  tarix         timestamptz not null default now(),
  unique (istifadeci, acar)          -- eyni xidmət iki dəfə alınmır
);
create index if not exists alislar_istifadeci_ix on public.alislar(istifadeci);

-- ─────────────────────────── 4. TEST NƏTİCƏLƏRİ (transkript buradan qurulur)
create table if not exists public.neticeler (
  id          bigserial primary key,
  istifadeci  uuid not null references auth.users(id) on delete cascade,
  test_id     text not null,         -- "kimya-rabite-1", "qbi-1"
  fenn        text,
  movzu       text,
  nov         text,                  -- "test" | "imtahan"
  dogru       integer not null,
  umumi       integer not null,
  bal         numeric(6,2),          -- cərimə tətbiq olunmuş bal
  saniye      integer,
  tarix       timestamptz not null default now()
);
create index if not exists neticeler_istifadeci_ix on public.neticeler(istifadeci, tarix desc);

-- ─────────────────────────── 5. BALANS ARTIRMALARI
create table if not exists public.odenisler (
  id            bigserial primary key,
  istifadeci    uuid references auth.users(id) on delete set null,
  mebleg        integer not null,
  lemon_id      text unique,         -- təkrar webhook-u bloklayır
  email         text,
  tarix         timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
--  RLS — hər kəs yalnız öz məlumatını görür
-- ═══════════════════════════════════════════════════════════════
alter table public.profiller enable row level security;
alter table public.alislar   enable row level security;
alter table public.neticeler enable row level security;
alter table public.odenisler enable row level security;
alter table public.qiymetler enable row level security;

-- profil: öz sətrini oxuya və adını dəyişə bilər. BALANSI DƏYİŞƏ BİLMƏZ.
drop policy if exists "profil oxu" on public.profiller;
create policy "profil oxu" on public.profiller
  for select using (auth.uid() = id);

drop policy if exists "profil ad deyis" on public.profiller;
create policy "profil ad deyis" on public.profiller
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ƏN VACİB SƏTİRLƏR: balans sütununa yazma hüququ tamamilə alınır.
-- Sütun səviyyəsindəki bu qadağa RLS-dən ƏVVƏL yoxlanılır, yəni
-- brauzerdən gələn heç bir sorğu balansı dəyişə bilmir.
-- Balansı yalnız aşağıdaki xidmet_al() funksiyası və webhook azaldıb-artırır.
revoke update on public.profiller from authenticated, anon;
grant  update (ad) on public.profiller to authenticated;
revoke insert, delete on public.profiller from authenticated, anon;
revoke insert, update, delete on public.alislar   from authenticated, anon;
revoke insert, update, delete on public.odenisler from authenticated, anon;
revoke insert, update, delete on public.qiymetler from authenticated, anon;
revoke update, delete on public.neticeler from authenticated, anon;

-- alışlar: yalnız oxumaq. Yazmaq ancaq xidmet_al() funksiyası ilə.
drop policy if exists "alis oxu" on public.alislar;
create policy "alis oxu" on public.alislar
  for select using (auth.uid() = istifadeci);

-- nəticələr: öz nəticəsini yaza və oxuya bilər
drop policy if exists "netice oxu" on public.neticeler;
create policy "netice oxu" on public.neticeler
  for select using (auth.uid() = istifadeci);
drop policy if exists "netice yaz" on public.neticeler;
create policy "netice yaz" on public.neticeler
  for insert with check (auth.uid() = istifadeci);

-- ödənişlər: yalnız oxumaq (webhook service_role ilə yazır, RLS-dən keçir)
drop policy if exists "odenis oxu" on public.odenisler;
create policy "odenis oxu" on public.odenisler
  for select using (auth.uid() = istifadeci);

-- qiymətlər: hamı oxuyur, heç kim dəyişmir
drop policy if exists "qiymet oxu" on public.qiymetler;
create policy "qiymet oxu" on public.qiymetler
  for select using (true);

-- ═══════════════════════════════════════════════════════════════
--  Qeydiyyatdan sonra profil avtomatik yaranır
-- ═══════════════════════════════════════════════════════════════
create or replace function public.yeni_istifadeci()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, ad, balans)
  values (new.id, coalesce(new.raw_user_meta_data->>'ad', split_part(new.email,'@',1)), 0)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists auth_yeni_istifadeci on auth.users;
create trigger auth_yeni_istifadeci
  after insert on auth.users
  for each row execute function public.yeni_istifadeci();

-- ═══════════════════════════════════════════════════════════════
--  XİDMƏT ALMA — atomik. Balansı yalnız bu funksiya azalda bilər.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.xidmet_al(p_acar text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_qiymet integer;
  v_ad     text;
  v_balans integer;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'sebeb', 'giris_yoxdur');
  end if;

  select qiymet, ad into v_qiymet, v_ad from public.qiymetler where acar = p_acar;
  if v_qiymet is null then
    return json_build_object('ok', false, 'sebeb', 'xidmet_yoxdur');
  end if;

  -- artıq alıbsa, pulsuz açılır
  if exists (select 1 from public.alislar where istifadeci = v_uid and acar = p_acar) then
    select balans into v_balans from public.profiller where id = v_uid;
    return json_build_object('ok', true, 'sebeb', 'evvelce_alinib', 'balans', v_balans);
  end if;

  -- sətri kilidləyib balansı yoxlayırıq (iki eyni vaxtlı sorğu balansı iki dəfə silə bilməz)
  select balans into v_balans from public.profiller where id = v_uid for update;
  if v_balans is null then
    return json_build_object('ok', false, 'sebeb', 'profil_yoxdur');
  end if;
  if v_balans < v_qiymet then
    return json_build_object('ok', false, 'sebeb', 'balans_catmir',
                             'balans', v_balans, 'qiymet', v_qiymet);
  end if;

  update public.profiller set balans = balans - v_qiymet where id = v_uid
    returning balans into v_balans;
  insert into public.alislar (istifadeci, acar, odenilen) values (v_uid, p_acar, v_qiymet);

  return json_build_object('ok', true, 'sebeb', 'alindi',
                           'balans', v_balans, 'qiymet', v_qiymet, 'ad', v_ad);
end; $$;

revoke all on function public.xidmet_al(text) from public;
grant execute on function public.xidmet_al(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════
--  KABİNET XÜLASƏSİ — bir sorğu ilə hər şey
-- ═══════════════════════════════════════════════════════════════
create or replace function public.kabinet()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_net json; v_alis json; v_prof json;
begin
  if v_uid is null then return json_build_object('ok', false); end if;

  select json_build_object('ad', ad, 'balans', balans, 'yaradildi', yaradildi)
    into v_prof from public.profiller where id = v_uid;

  select coalesce(json_agg(x), '[]'::json) into v_alis
    from (select acar, tarix from public.alislar where istifadeci = v_uid) x;

  select coalesce(json_agg(x), '[]'::json) into v_net
    from (select test_id, fenn, movzu, nov, dogru, umumi, bal, saniye, tarix
          from public.neticeler where istifadeci = v_uid
          order by tarix desc limit 500) x;

  return json_build_object('ok', true, 'profil', v_prof,
                           'alislar', v_alis, 'neticeler', v_net);
end; $$;

revoke all on function public.kabinet() from public;
grant execute on function public.kabinet() to authenticated;

-- ═══════════════════════════════════════════════════════════════
--  BALANS ARTIRMA — yalnız webhook (service_role) çağıra bilər.
--  authenticated rolu bu funksiyaya çıxış ala BİLMƏZ, yoxsa
--  istifadəçi öz balansını özü artırardı.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.balans_artir(p_uid uuid, p_mebleg integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_yeni integer;
begin
  if p_mebleg is null or p_mebleg <= 0 then
    raise exception 'məbləğ müsbət olmalıdır';
  end if;
  update public.profiller set balans = balans + p_mebleg
    where id = p_uid returning balans into v_yeni;
  if v_yeni is null then
    raise exception 'profil tapılmadı: %', p_uid;
  end if;
  return v_yeni;
end; $$;

revoke all on function public.balans_artir(uuid, integer) from public, anon, authenticated;
grant execute on function public.balans_artir(uuid, integer) to service_role;

-- ═══════════════════════════════════════════════════════════════
--  SAHİBSİZ ÖDƏNİŞİ HESABA BAĞLAMAQ
--  Kimsə başqa e-poçtla ödəyibsə, SQL Editor-da bunu işə salın:
--    select public.odenisi_bagla('lemon_id_buraya', 'istifadeci@email.com');
-- ═══════════════════════════════════════════════════════════════
create or replace function public.odenisi_bagla(p_lemon_id text, p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_mebleg integer; v_balans integer;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then return json_build_object('ok', false, 'sebeb', 'hesab_yoxdur'); end if;

  select mebleg into v_mebleg from public.odenisler
    where lemon_id = p_lemon_id and istifadeci is null;
  if v_mebleg is null then
    return json_build_object('ok', false, 'sebeb', 'odenis_yoxdur_veya_baglanmis');
  end if;

  update public.odenisler set istifadeci = v_uid where lemon_id = p_lemon_id;
  v_balans := public.balans_artir(v_uid, v_mebleg);
  return json_build_object('ok', true, 'mebleg', v_mebleg, 'balans', v_balans);
end; $$;

revoke all on function public.odenisi_bagla(text, text) from public, anon, authenticated;
