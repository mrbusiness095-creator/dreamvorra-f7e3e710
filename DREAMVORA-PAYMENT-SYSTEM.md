# DreamVora — ZonmPay USSD Push + Manual Admin Approval

## Flow
1. User registers.
2. User opens Payment and enters the phone number/network used for payment.
3. DreamVora starts a ZonmPay USSD Push for TZS 14,500.
4. User enters the mobile-money PIN on their phone.
5. User presses **NIMELIPIA** and submits the phone number used for payment.
6. Admin sees the request at `/admin` and can **APPROVE** or **REJECT** it.
7. Only an Admin approval sets `dreamvora_users.paid = TRUE` and unlocks the account.
8. The user page polls the status. After approval, the user is redirected to the pending chat (if one exists) or Dashboard.

## Netlify Environment Variables
- `NETLIFY_DB_URL` — provided by Netlify Database at runtime.
- `DREAMVORA_AUTH_SECRET` — random secret, 32+ characters.
- `DREAMVORA_ADMIN_PASSWORD` — your private admin password.
- `ZONMPAY_API_KEY` — secret API key from ZonmPay Developer Settings.
- `ZONMPAY_BASE_URL` — normally `https://zonmpay.com/api`.
- `ZONMPAY_WEBHOOK_URL` — `https://dreamvorra.site/api/zonmpay/webhook`.

## ZonmPay Developer Settings
Register the website domain:
`https://dreamvorra.site`

Set the webhook URL to:
`https://dreamvorra.site/api/zonmpay/webhook`

The webhook records ZonmPay's provider status but does **not** unlock the account. Admin approval remains the final gate.
