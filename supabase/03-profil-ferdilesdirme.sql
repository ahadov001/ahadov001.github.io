-- ═══════════════════════════════════════════════════════════════
--  DƏRS TOPLUSU — profil fərdiləşdirmə (şəkil, bio, hədəf, rəng)
--  Supabase → SQL Editor-da bu faylı bir dəfə, bütöv halda işə salın.
--  Təhlükəsizdir: balans və digər sütunlara toxunmur, istənilən vaxt
--  təkrar işlədilə bilər.
--
--  İşə salınmayıbsa da sayt işləyir — profil dəyişiklikləri yalnız
--  həmin cihazda saxlanır. Bunu işlətdikdən sonra bütün cihazlarda
--  eyni profil görünür.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiller add column if not exists avatar text;
alter table public.profiller add column if not exists reng   text;
alter table public.profiller add column if not exists bio    text;
alter table public.profiller add column if not exists hedef  text;

-- ölçü məhdudiyyətləri (kiçildilmiş şəkil ~10–20 KB olur)
alter table public.profiller drop constraint if exists profil_avatar_olcu;
alter table public.profiller add  constraint profil_avatar_olcu check (avatar is null or length(avatar) <= 60000);
alter table public.profiller drop constraint if exists profil_reng_olcu;
alter table public.profiller add  constraint profil_reng_olcu   check (reng   is null or length(reng)   <= 20);
alter table public.profiller drop constraint if exists profil_bio_olcu;
alter table public.profiller add  constraint profil_bio_olcu    check (bio    is null or length(bio)    <= 200);
alter table public.profiller drop constraint if exists profil_hedef_olcu;
alter table public.profiller add  constraint profil_hedef_olcu  check (hedef  is null or length(hedef)  <= 40);
alter table public.profiller drop constraint if exists profil_ad_olcu;
alter table public.profiller add  constraint profil_ad_olcu     check (ad     is null or length(ad)     <= 60);

-- İstifadəçi yalnız bu sütunları dəyişə bilər. BALANS siyahıda YOXDUR.
revoke update on public.profiller from authenticated, anon;
grant  update (ad, avatar, reng, bio, hedef) on public.profiller to authenticated;
