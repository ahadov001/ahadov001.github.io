-- ════════════════════════════════════════════════════════════
--  SINAQ — Geri bildirim (səhv / təklif / şikayət)
--  Supabase → SQL Editor → bu faylı bütöv işə salın.
--
--  Cədvəl yalnız Edge Function (geri-bildirim) tərəfindən doldurulur.
--  RLS açıqdır və heç bir siyasət yoxdur: sayt ziyarətçisi
--  başqalarının mesajlarını OXUYA bilməz, birbaşa da yaza bilməz.
--  Mesajlara yalnız Supabase → Table Editor-dan baxa bilərsiniz.
-- ════════════════════════════════════════════════════════════
create table if not exists public.geri_bildirimler (
  id        bigserial primary key,
  tarix     timestamptz not null default now(),
  nov       text not null check (nov in ('sehv','teklif','sikayet')),
  mesaj     text not null,
  sehife    text,          -- keçid (ünvan)
  bashliq   text,          -- səhifənin adı
  kontekst  text,          -- məs. "Sual 7/30: ..." (testlərdə)
  elaqe     text,          -- ixtiyari: cavab üçün e-poçt
  ip_hash   text,          -- spamın qarşısı üçün (IP-nin özü saxlanmır)
  baxildi   boolean not null default false
);
create index if not exists geri_bildirimler_ip_ix on public.geri_bildirimler(ip_hash, tarix desc);
alter table public.geri_bildirimler enable row level security;
