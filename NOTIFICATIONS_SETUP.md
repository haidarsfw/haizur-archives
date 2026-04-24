# Notifikasi Push + Email — Setup Guide

Stack: Firebase Cloud Messaging (push) + Resend (email fallback) + Vercel
Serverless Function. Semua gratis.

> Notifikasi ga akan jalan sampai env var di bawah ini selesai di-set di
> Vercel. Kode sudah live di production — tinggal masukin secrets.

---

## 1. Generate Firebase VAPID key (untuk Web Push)

1. Buka **https://console.firebase.google.com** → pilih project `ours-90fd0`
   (atau nama project kamu).
2. ⚙️ Gear icon → **Project settings** → tab **Cloud Messaging**.
3. Scroll ke **Web configuration** → **Web Push certificates**.
4. Klik **Generate key pair**. Copy key yang muncul (format: string panjang
   dengan huruf + angka + dash).

Simpan key ini — nanti dipakai sebagai `VITE_FIREBASE_VAPID_KEY`.

---

## 2. Generate Firebase Service Account (untuk backend)

1. Masih di **Project settings** → tab **Service accounts**.
2. Klik **Generate new private key** → konfirmasi → file JSON otomatis
   terdownload.
3. Buka file JSON itu. Kamu bakal lihat isinya kayak:
   ```json
   {
     "type": "service_account",
     "project_id": "ours-90fd0",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxx@...",
     ...
   }
   ```
4. Copy SELURUH isi file (termasuk kurung kurawal).

Ini nanti jadi env var `FIREBASE_SERVICE_ACCOUNT_KEY`.

> ⚠️ **Jangan commit file JSON ini ke git.** Langsung paste ke Vercel env
> var dan delete file lokal.

---

## 3. Daftar Resend (email gratis, 3000/bulan)

1. Buka **https://resend.com/signup** → sign up pakai email kamu.
2. Verifikasi email.
3. Dashboard → **API Keys** → **Create API Key** → namanya bebas, pilih
   `Sending access` → Create.
4. Copy API key yang muncul (`re_xxxxx...`). Ini hanya muncul sekali.

Simpan sebagai `RESEND_API_KEY`.

**Email pengirim**: default pakai `onboarding@resend.dev` (domain
Resend — kerja tanpa setup tambahan, tapi kadang masuk spam). Kalau mau
pakai domain sendiri nanti, tambah domain di Resend → verify DNS →
ubah `NOTIFY_EMAIL_FROM`.

---

## 4. Bikin Shared Secret random

Di terminal Mac kamu, jalanin:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output 64-karakter itu. Ini jadi `NOTIFY_SHARED_SECRET` di server
DAN `VITE_NOTIFY_SHARED_SECRET` di client (nilai harus sama persis).

> Tujuan: hanya client kita yg boleh POST ke /api/notify. Tanpa secret
> orang lain bisa spam notif.

---

## 5. Masukkan semua ke Vercel Env Vars

1. Buka **https://vercel.com/dashboard** → pilih project `haizur-archives`.
2. **Settings** → **Environment Variables**.
3. Tambahin 5 env var berikut. Scope-nya: centang **Production**,
   **Preview**, dan **Development**:

| Name | Value |
|---|---|
| `VITE_FIREBASE_VAPID_KEY` | (VAPID key dari step 1) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | (seluruh isi JSON dari step 2) |
| `FIREBASE_DATABASE_URL` | `https://ours-90fd0-default-rtdb.firebaseio.com` (cek di firebase.js/env, harus match `VITE_FIREBASE_DATABASE_URL`) |
| `RESEND_API_KEY` | (API key dari step 3) |
| `NOTIFY_SHARED_SECRET` | (64-char hex dari step 4) |
| `VITE_NOTIFY_SHARED_SECRET` | **sama persis** dengan `NOTIFY_SHARED_SECRET` |
| `NOTIFY_EMAIL_FROM` | (opsional) contoh: `Haizur <onboarding@resend.dev>` |

Klik **Save** untuk tiap variabel.

---

## 6. Redeploy

Salah satu cara biar env baru aktif:

- Vercel dashboard → **Deployments** → titik tiga di deploy terakhir →
  **Redeploy**. Centang "Use existing Build Cache" untuk hemat waktu.

Atau push commit kecil ke `main` (gitignore file atau update whitespace).

---

## 7. Aktifkan di app

1. Buka https://haizur.site (di laptop Chrome).
2. Tombol **✉️ Aktifkan notifikasi** muncul di atas chat. Klik.
3. Browser minta izin notif. Pilih **Allow**.
4. Setelah muncul banner "email kamu (backup notif)" → isi email →
   Simpan.

### iOS (iPhone) — Web Push butuh install sebagai app

1. Buka https://haizur.site di **Safari** iOS 16.4+.
2. Tap tombol share (ikon kotak panah ke atas).
3. Scroll ke bawah → **Add to Home Screen** → Add.
4. **Buka dari home screen** (ikon muncul di layar HP).
5. Di app itu, buka chat → tombol aktifkan notif → Allow.

> Catatan: iOS Safari dalam tab browser biasa **tidak support** Web Push.
> Harus PWA install.

---

## 8. Test

1. Di HP (install PWA, notif aktif, email saved).
2. Tutup tab/app.
3. Di laptop, buka https://haizur.site, login role partner, kirim pesan.
4. HP bakal dapat push notif dalam ±5 detik.
5. Kalau HP mati total, cek inbox email — notif email masuk.

### Debugging

- Browser devtools → Network → filter "notify" → cek response. 200 =
  sukses, 401 = secret salah, 500 = service account invalid.
- Vercel dashboard → project → **Logs** → filter `/api/notify`. Error
  stack trace muncul di sini.
- FCM console: Firebase project → Messaging → **Send test message** →
  tes kirim notif manual (butuh token, copy dari notif-prefs Firestore
  doc).

---

## Cara kerja singkat

```
Client (kamu kirim pesan)
      ↓ POST /api/notify (x-haizur-secret header)
Vercel Serverless Function
      ├─ baca presence/{recipient} → skip kalau chatActive + fresh <30s
      ├─ baca notif-state/{recipient} → skip kalau <2 menit sejak notif terakhir
      ├─ baca notif-prefs/{recipient}
      │     ├─ fcmTokens: array → FCM sendEach() → push ke semua device
      │     └─ email: string → Resend (hanya kalau FCM gagal semua)
      └─ update notif-state/{recipient}.lastPushAt
```

- FCM token disimpan di `notif-prefs/{role}.fcmTokens.{token}` (map, bukan
  array — biar bisa delete by key).
- Token invalid otomatis di-prune saat send error
  (`registration-token-not-registered`).
- Debounce 2 menit + skip-if-active mencegah spam.

---

## Biaya

- **Firebase**: FCM unlimited free. Firestore/RTDB masih di Spark plan.
  Tidak perlu upgrade.
- **Resend**: 3000 email/bulan gratis. Kita cuma pakai email saat FCM
  gagal (tidak sering).
- **Vercel**: serverless function calls ~100k/bulan free di Hobby plan.
- **Total**: $0.

Kalau chat kalian 200 pesan/hari × 30 hari = 6000 trigger/bulan.
Setelah debounce (2 menit) + skip-if-active, actual notif push ~10-30%
= 600-1800 notif/bulan. Jauh di bawah semua limit.
