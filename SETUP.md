# Quraşdırma (bir dəfəlik, ~30 dəqiqə)

Sayt GitHub Pages-də qalır. Hesablar, balans, alışlar və nəticələr **Supabase**-də (pulsuz plan) saxlanılır.
Lemon Squeezy yalnız **balans artırmaq** üçündür.

## 1. Supabase
1. https://supabase.com → yeni layihə yarat.
2. **SQL Editor** → `supabase/schema.sql` faylının məzmununu yapışdırıb **Run**. Sonra eyni qaydada `supabase/seed.sql`.
3. **Project Settings → API**: `Project URL` və `anon public` açarını `assets/config.js` faylına yaz. (`service_role` açarını heç yerə yazma.)
4. **Authentication → URL Configuration**: *Site URL* = `https://ahadov001.github.io`; *Redirect URLs*-ə `https://ahadov001.github.io/**` əlavə et.
5. **Authentication → Providers → Email**: təsdiq e-poçtu açıq qala bilər (tövsiyə). Şifrənin minimum uzunluğunu 8 et.

## 2. Webhook funksiyası (balansı avtomatik artırır)
```
npm i -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set LEMON_WEBHOOK_SECRET=<özünüz uydurduğunuz uzun təsadüfi mətn>
supabase functions deploy lemon-webhook --no-verify-jwt
```
Funksiyanın ünvanı: `https://<PROJECT_REF>.supabase.co/functions/v1/lemon-webhook`

## 3. Lemon Squeezy
1. Balans paketləri üçün məhsullar yarat (məs. 5, 10, 25, 50 AZN). Hər birinin **Redirect URL** sahəsinə `https://ahadov001.github.io/balans.html?odenis=1` yaz.
2. **Settings → Webhooks → Add**: URL = yuxarıdakı funksiya ünvanı, Signing secret = 2-ci addımdakı `LEMON_WEBHOOK_SECRET`, hadisələr: `order_created`, `order_refunded`.
3. Saytda 6 hazır paket var: 2, 5, 10, 20, 30, 50 AZN (`seed.sql` onları yaradır). Linki yazılmayan paket saytda "tezliklə" kimi bağlı görünür. Hər paket üçün Lemon Squeezy məhsulunun **Buy link**-ini və **variant id**-sini götür, SQL Editor-də işlət:
```sql
update topup_packages set checkout_url = 'https://testtoplusu.lemonsqueezy.com/checkout/buy/....', variant_id = '111111' where amount = 5;
```
Məbləğ **bu cədvəldən** götürülür, ona görə `amount` Lemon Squeezy məhsulunun qiymətinə uyğun olmalıdır. Bütün paketləri bağlamaq lazım deyil, hazır olanları bağla.
4. Test rejimində bir ödəniş et və `balans.html`-də balansın artdığını yoxla.

## 4. Sayta yüklə
Bu qovluğun məzmununu (`supabase/` və `SETUP.md` də qala bilər) repoya yüklə. Köhnə `assets/links.js` artıq lazım deyil.

## Qeydlər
- Sual və dərs mətnləri artıq HTML-də deyil, bazadadır: alınmamış test brauzerdə açılmır.
- Yeni test əlavə etmək: `items` və `item_content` cədvəllərinə sətir əlavə et (nümunə: `seed.sql`).
- Ödəniş geri qaytarılsa (`order_refunded`), balans həmin məbləğ qədər azalır və mənfiyə düşə bilər; balans müsbət olana qədər yeni alış mümkün olmur.
