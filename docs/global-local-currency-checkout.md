# Global display currency and local checkout disclosure

## Offer presentation
- The Elite NG offer cards display their configured USD list price.
- USD display price is not a live FX quote, guaranteed converted amount, or evidence that a USD charge is enabled.
- Before any payment authorization, the checkout must clearly state the actual currency and amount that Paystack will charge.
- If the merchant requires NGN settlement, prefer an NGN-priced Paystack transaction and show the final NGN amount before redirecting to Paystack. The customer's issuing bank may perform its own cardholder-currency conversion.
- Never show a stale or hardcoded NGN equivalent as the payable amount.

## Backend contract
- Frontend repository: `EliteFitness101/elite101`.
- Payment orchestration: `EliteFitness101/chatb2k-f9d8a04d`.
- Payment and settlement authority: Paystack transaction verification and the canonical ResoFit Supabase ledger.
- The server must choose the charge currency and amount; the browser must not be trusted to set payable amount.
- The signed webhook records the verified charge currency/amount. The settlement reconciler matches transaction reference, gross amount, and currency against a successful Paystack settlement.
- An FX reporting rate is stored only with an explicit source and observation timestamp. It must not be represented as Paystack's own rate unless sourced from a verified Paystack API/account record.
- A ledger row marked `matched` confirms gross transaction inclusion and matching currency/amount, not per-transaction net payout or bank-credit confirmation.

## Release gates
- Implement server-side checkout initialization for each fixed offer, including recurring billing only where subscription support is verified.
- Pass display currency/amount as descriptive metadata only; compute and validate actual charge amount server-side.
- Show final charge currency/amount and terms before redirect.
- Test failed/duplicate webhooks, refunds, settlement variances, and delayed payouts.
- Do not enable checkout or claim production readiness until end-to-end tests pass.
