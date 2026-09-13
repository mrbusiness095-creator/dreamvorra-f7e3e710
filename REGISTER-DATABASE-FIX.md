# DreamVora Register + Database Fix

This update fixes the DreamVora registration flow and makes registration persist user data in the Netlify PostgreSQL database.

## What changed
- `/register` has a route-level error screen instead of falling through to the generic page error.
- Registration validates name, username, email, phone and password before submitting.
- Registration calls the server-side `registerDreamVoraAccount` function.
- User records are inserted into `dreamvora_users`.
- Passwords are stored as salted scrypt hashes, not plain text.
- Duplicate username/email errors are returned clearly to the user.
- The database schema migration now ensures `confirmed_at` exists on `dreamvora_payments`, matching the Admin/payment code.

## Netlify environment variables
Required:
- `NETLIFY_DB_URL` (provided by Netlify Database runtime)
- `DREAMVORA_AUTH_SECRET` (32+ random characters)
- `DREAMVORA_ADMIN_PASSWORD`
- `ZONMPAY_API_KEY`

After deploying, test:
1. Open `/register`.
2. Create a new test account.
3. Confirm one row appears in `dreamvora_users` in Netlify Database.
4. The user is redirected to `/payment` with their server-created session.
