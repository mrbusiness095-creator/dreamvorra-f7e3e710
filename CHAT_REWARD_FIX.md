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
