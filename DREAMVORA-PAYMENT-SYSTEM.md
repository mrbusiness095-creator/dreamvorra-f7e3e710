# DreamVora — Lipa Namba manual verification system

## Flow
1. User registers. Registration is stored in Netlify Database; password is stored as a salted scrypt hash, not plain text.
2. User sees the existing Lipa Namba instructions for `354136248` and `14,500 TZS`.
3. User enters the phone number used to pay and clicks **NIMELIPIA**.
4. A `PENDING` payment request is stored in the database.
5. Admin opens `/admin`, signs in, and sees new requests. The list refreshes every 5 seconds.
6. Admin verifies the real mobile-money transaction outside the website and clicks **APPROVE** or **REJECT**.
7. Approval changes the user's server-side `paid` flag to `TRUE`.
8. The payment page polls the server. After approval it automatically redirects to the pending Chat, or Dashboard if there is no pending Chat.

## Required Netlify environment variables
- `NETLIFY_DB_URL` — provided by Netlify Database after provisioning the database.
- `DREAMVORA_AUTH_SECRET` — random secret, minimum 32 characters.
- `DREAMVORA_ADMIN_PASSWORD` — private admin password.
- `FIMIPAY_API_KEY` — secret API key for the automatic mobile-money payment method. Keep this server-side; never expose it in client code.

## Netlify setup
Provision a database in Netlify under **Data & Storage → Database**, then add the three environment variables above under the site's environment variables. Deploy again. The application creates its two tables automatically on first server request.

Admin page: `/admin`

Important: this version intentionally does **not** mark a payment as paid just because the customer clicks **NIMELIPIA**. Only the admin approval changes the server-side paid state.


## Automatic payment
The payment page now has a separate automatic mobile-money option. The server creates the payment order and checks its order status. The provider name/API key is never rendered in the customer-facing UI. A successful payment activates the account automatically; a pending request sends the user to Dashboard while the Dashboard continues checking the payment status.

## Session
User/admin auth tokens now expire after 5 minutes. If the token has expired, protected pages redirect the user to Login instead of silently continuing with an old session.
