# DreamVora Chat Reward Fix

Chat rewards now follow a server-authoritative flow:

1. A paid/active user sends the 10th message.
2. The chat creates a user-scoped `chatKey`.
3. `recordDreamVoraChatEarning` writes the reward to `dreamvora_chat_earnings` with a unique key.
4. In one database transaction, the reward is added to both `dreamvora_users.earnings` (Net Income) and `dreamvora_users.balance` (withdrawable/current balance).
5. The server returns the authoritative balance and earnings.
6. The browser stores those returned values and shows the completion reward.
7. Returning to Dashboard fetches the same server values, so the reward remains visible after refresh/login.
8. Repeating the same reward key cannot pay twice.
9. If the server cannot confirm the reward, the chat is not falsely marked as paid; the user gets a retry action.

The chat reward key is user-scoped so two different users chatting with the same foreigner do not collide.


## 2026-09-24 database compatibility fix
The reward ledger now uses `dreamvora_chat_rewards` instead of the legacy `dreamvora_chat_earnings` table. This avoids schema/trigger conflicts on deployments where the legacy table was created by an older build. Reward completion is transactional and updates both `earnings` and `balance` from the server.


## Deployment settings

No special browser setting is required for the reward flow. The deployment must have these server environment variables:

- `NETLIFY_DB_URL` — connection string for the same PostgreSQL database used by the site.
- `DREAMVORA_AUTH_SECRET` — long random secret used for sessions.
- `DREAMVORA_ADMIN_PASSWORD` — admin login password.

The reward migration is additive. On first request after deployment it creates `dreamvora_chat_rewards` and also adds the missing legacy `name` column to `dreamvora_chat_earnings` if that table already exists.

The chat completion now explicitly submits `messageCount: 10` on the tenth user message. This avoids the previous race where React state still contained 9 messages when the reward request was sent.
