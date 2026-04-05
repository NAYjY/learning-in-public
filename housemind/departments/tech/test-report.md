# Tech Department — Test Report

**Date:** 2026-04-05  
**Wave:** 1 (MVP Build)  
**Runner:** Node.js v22.11.0 built-in test runner  
**Duration:** 273ms  

---

## Summary

| Metric | Count |
|--------|-------|
| Test suites | 5 |
| Tests | 23 |
| Passing | 23 |
| Failing | 0 |
| Skipped | 0 |

**Result: ALL PASSING ✓**

---

## Test Suites

### 1. Password Hashing (5 tests, 232ms)
- ✓ Hashes and verifies a password correctly
- ✓ Rejects wrong password
- ✓ Produces different hashes for same password (random salt)
- ✓ Produces same hash with same salt (deterministic)
- ✓ Hash format: salt(32 hex chars):hash(128 hex chars)

**Coverage:** scrypt-based password hashing with random 16-byte salt, 64-byte derived key. Validates both positive and negative paths.

### 2. JWT Session (5 tests, 10ms)
- ✓ Creates a valid JWT token (3-part structure)
- ✓ Token contains correct claims (sub, email, name, role)
- ✓ Token expires in ~7 days
- ✓ Rejects token signed with wrong secret
- ✓ Handles all 4 user roles (architect, homeowner, contractor, admin)

**Coverage:** jose library JWT creation/verification. Session claims, expiry, signature validation.

### 3. Database Schema Design (5 tests, 2ms)
- ✓ Defines exactly 4 user roles
- ✓ Has 4 product categories per spec (tiles, fixtures, lighting, cladding)
- ✓ Product status: reference and available
- ✓ Comment types: comment, reaction, flag
- ✓ 3 price tiers ($, $$, $$$)

**Coverage:** Schema contract validation — ensures data model matches spec requirements.

### 4. API Input Validation Contracts (6 tests, 1ms)
- ✓ accept-invite rejects missing/short fields (token, name, password <8 chars)
- ✓ accept-invite accepts valid input
- ✓ Products API accepts optional category filter
- ✓ Products API returns all when no category
- ✓ Comments rejects empty body
- ✓ Feedback allows anonymous (null user_id)

**Coverage:** Input validation rules for all 6 API endpoints. Tests boundary conditions.

### 5. Seed Data Integrity (2 tests, 1ms)
- ✓ Has 20 products across 4 categories (5 each)
- ✓ Seed has mix of reference and available products

**Coverage:** Validates seed script produces correct product distribution.

---

## What's Tested vs Not Tested

### Tested
- Password hashing (create + verify + edge cases)
- JWT session lifecycle (create, verify, expire, reject)
- Schema design contracts (roles, categories, statuses)
- API input validation (all endpoints)
- Seed data integrity

### Not Yet Tested (Wave 2 candidates)
- Database integration tests (requires running Postgres)
- API route integration tests (requires Next.js test server)
- Frontend component rendering
- Auth flow end-to-end (invite → accept → login → session)
- Project membership access control
- Rate limiting / error handling under load
- Comment membership verification

---

## Files

| File | Tests | Focus |
|------|-------|-------|
| tests/auth-password.test.mjs | 5 | Password hashing |
| tests/auth-session.test.mjs | 5 | JWT sessions |
| tests/api-and-schema.test.mjs | 13 | Schema, API contracts, seed data |

---

## Recommendation for Wave 2
1. Add Postgres integration tests with test database
2. Add Next.js API route tests with supertest or similar
3. Add E2E tests for invite → onboard → create project flow
4. Add role-based access control tests for comments and projects
