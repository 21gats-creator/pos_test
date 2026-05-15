# Setup

## 1. แก้ไข env.js
ใส่ค่าของตัวเองทั้งหมด
- `SUPABASE_URL` และ `SUPABASE_ANON_KEY` — Supabase → Settings → API
- `OMISE_PUBLIC_KEY` — Omise → Settings → Keys
- `OMISE_API_ENDPOINT` — URL ของ Edge Function (ได้หลังทำข้อ 3)

## 2. แก้ไข api/config.php (XAMPP เท่านั้น)
ใส่ Omise Secret Key ของตัวเอง

## 3. Deploy Supabase Edge Function (ทำครั้งเดียว)
```
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set OMISE_SECRET_KEY=skey_...
supabase functions deploy omise-payment --no-verify-jwt
```
> `PROJECT_REF` = ตัวเลขใน URL เช่น `supabase.com/dashboard/project/xxxxxx`

URL ของ Edge Function หลัง deploy:
`https://<PROJECT_REF>.supabase.co/functions/v1/omise-payment`

## 4. Push ขึ้น GitHub Pages
```
git add .
git commit -m "init"
git push
```
