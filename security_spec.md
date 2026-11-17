# Security Specification — My Earnings & EMI Manager

## 1. Data Invariants
1. Every document across `/users/{userId}` and its subcollections (`earnings`, `emis`, `emiPayments`, `expenses`) belongs strictly to `request.auth.uid == userId` with `request.auth.token.email_verified == true`.
2. Every subcollection document contains `userId` matching `request.auth.uid` and requires the parent `/users/{userId}` document to exist (Master Gate).
3. All `userId`, `earningId`, `emiId`, `paymentId`, `expenseId` path parameters must pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. Strict field allowlists (`hasAll` + `hasOnly`) and type/size bounds prevent shadow fields, type poisoning, and 1MB payload exhaustion.
5. `createdAt` is immutable and equals `request.time` on create; `updatedAt` equals `request.time` on create and update.
6. `totalAmount` on earnings must equal `baseAmount + incentive + bonus` and cannot be negative.
7. `amountPaid` on EMIs cannot be negative and cannot exceed `amountDue`.
8. `emiPayments` must reference an existing `emiId` in `/users/{userId}/emis/{emiId}` and are append-only (no updates).

## 2. Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/{uid}/earnings/{id}` -> PERMISSION_DENIED.
2. Unverified email user (`email_verified == false`) attempting write -> PERMISSION_DENIED.
3. Cross-user access (`auth.uid != userId`) reading PII in `/users/{otherUid}` -> PERMISSION_DENIED.
4. Identity spoofing (`incoming.userId != auth.uid`) -> PERMISSION_DENIED.
5. Shadow field injection (`{ ..., isAdmin: true }`) -> PERMISSION_DENIED.
6. Oversized string DoS (`notes` > 300 chars or `earningId` > 128 chars) -> PERMISSION_DENIED.
7. Invalid ID regex (`emiId: "bad/id$1"`) -> PERMISSION_DENIED.
8. Client timestamp forgery (`createdAt: "2020-01-01"`) -> PERMISSION_DENIED.
9. Immutable field tampering (`createdAt` or `userId` changed on update) -> PERMISSION_DENIED.
10. Negative financial numbers (`baseAmount: -500` or `amountDue: 0`) -> PERMISSION_DENIED.
11. Earnings math tampering (`totalAmount != baseAmount + incentive + bonus`) -> PERMISSION_DENIED.
12. Orphaned payment (`emiPayments` referencing nonexistent `emiId`) -> PERMISSION_DENIED.
