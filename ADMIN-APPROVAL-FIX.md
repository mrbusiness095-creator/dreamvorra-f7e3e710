# Admin approval fix

Admin approval is now server-side and idempotent.

- `APPROVE & ACTIVATE` locks the payment row, activates the linked user, and credits the payment amount to balance exactly once.
- `balance_credited` is persisted on the payment record to prevent double credits.
- Approved payments can be re-opened with `ACTIVATE ACCOUNT` if an earlier deployment marked the payment approved but did not activate the user.
- Admin payment list now includes account activation and current balance.
- Rejecting an already approved payment is blocked to avoid corrupting an activated account.
- Existing approved + already-active records are marked as credited during the next schema initialization to preserve idempotency.
