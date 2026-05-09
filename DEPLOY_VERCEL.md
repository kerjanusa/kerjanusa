# Deploy Frontend + Backend ke Vercel

Project ini memakai dua project Vercel terpisah:

- `frontend/` untuk React + Vite
- `backend/` untuk Laravel API via `vercel-php`

Database tidak dijalankan di dalam Vercel. Backend harus memakai database eksternal yang bisa diakses dari internet. Untuk setup yang paling aman di project ini, gunakan Supabase Postgres.

## 1. Link project ke Vercel

Jalankan sekali:

```bash
(cd backend && vercel link)
(cd frontend && vercel link)
```

Jika project sudah ada di dashboard, pilih project yang sesuai. Jika belum, Vercel akan membuatkannya.

## 2. Set environment variables

### Backend

Gunakan template [backend/.env.vercel.example](/home/lutfi/Dokumen/lutfi/dani/v3/backend/.env.vercel.example).

Variable penting:

- `APP_KEY`
- `APP_URL`
- `FRONTEND_APP_URL`
- `APP_STORAGE_PATH=/tmp/pintarnya-storage`
- `DB_CONNECTION=pgsql`
- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SSLMODE=require`
- `LOG_CHANNEL=stderr`
- `CACHE_DRIVER=array`
- `SESSION_DRIVER=array`
- `QUEUE_CONNECTION=sync`
- `SANCTUM_STATEFUL_DOMAINS`
- `CORS_ALLOWED_ORIGINS`
- `MAIL_MAILER`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`

Jika ingin forgot/reset password benar-benar mengirim email, backend production harus memakai mailer sungguhan seperti SMTP. Jika `MAIL_MAILER=log`, request reset password tetap sukses tetapi email hanya masuk ke log backend, bukan ke inbox pengguna.

Untuk Supabase, mulailah dari Session pooler / shared pooler pada port `5432` agar kompatibilitas Laravel lebih aman.

Contoh add lewat CLI:

```bash
(cd backend && vercel env add APP_KEY production)
(cd backend && vercel env add DB_HOST production)
```

### Frontend

Gunakan template [frontend/.env.vercel.example](/home/lutfi/Dokumen/lutfi/dani/v3/frontend/.env.vercel.example).

Variable penting:

- `VITE_API_URL=https://your-backend-project.vercel.app/api`

## 3. Deploy sekali jalan

```bash
./deploy-vercel.sh
```

Jika ingin deploy sambil menjalankan migrasi production:

```bash
RUN_PROD_MIGRATIONS=1 ./deploy-vercel.sh
```

Jika ingin sekaligus memperbarui akun demo/seed data production:

```bash
RUN_PROD_SEED=1 ./deploy-vercel.sh
```

Jika ingin menjalankan keduanya:

```bash
RUN_PROD_MIGRATIONS=1 RUN_PROD_SEED=1 ./deploy-vercel.sh
```

## 4. Catatan penting

- Backend memakai [backend/vercel.json](/home/lutfi/Dokumen/lutfi/dani/v3/backend/vercel.json) dan entrypoint [backend/api/index.php](/home/lutfi/Dokumen/lutfi/dani/v3/backend/api/index.php).
- Frontend memakai SPA rewrite di [frontend/vercel.json](/home/lutfi/Dokumen/lutfi/dani/v3/frontend/vercel.json) supaya route React seperti `/about` dan `/jobs` tidak 404 saat refresh.
- Script deploy butuh dua project sudah pernah di-`vercel link`.
- `vercel env run -e production` dipakai untuk menjalankan `php artisan migrate --force` dengan env production backend yang ada di Vercel.
- `RUN_PROD_SEED=1` menjalankan `php artisan db:seed --force`, berguna untuk sinkronisasi akun demo seperti `recruiter@example.com`.
