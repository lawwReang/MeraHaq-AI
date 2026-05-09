# Security Specification - MeraHaq AI

## Data Invariants
1. A user can only read and write their own profile document (`/users/{userId}`).
2. A user can only read and write their own saved schemes (`/users/{userId}/saved_schemes/{schemeId}`).
3. Saved schemes must belong to the user (`userId` matches `request.auth.uid`).
4. Timestamps (`createdAt`, `updatedAt`) must be server-generated.
5. Critical identity fields like `uid` (implicit in path) and `userId` (in data) must match the authenticated user.

## The "Dirty Dozen" Payloads (Deny Test Cases)
1. **Identity Spoofing**: Attempt to write a profile for user B while logged in as user A.
2. **Resource Poisoning**: Attempt to use an extremely long string for `location`.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user profile.
4. **State Shortcutting**: Attempt to update `createdAt` after it's set.
5. **Unauthorized Read**: Attempt to read another user's saved schemes.
6. **Bypassing Verification**: Attempt to write if `email_verified` is false (if required).
7. **Negative Age**: Attempt to set `age` to -5.
8. **Invalid Scheme ID**: Attempt to save a scheme with a non-alphanumeric ID.
9. **Missing Required Fields**: Attempt to create a user without `location`.
10. **Wrong Type**: Attempt to set `age` as a string.
11. **Client Timestamp**: Attempt to set `createdAt` with a client-provided date string instead of `request.time`.
12. **Orphaned Write**: Attempt to save a scheme without a valid corresponding user ID in the payload.

## Test Runner (Drafted for firestore.rules.test.ts)
- `test('users should not be able to read other users profiles', ...)`
- `test('users should only be able to write their own profile', ...)`
- `test('users must be authenticated to write', ...)`
- `test('updatedAt must be current server time', ...)`
