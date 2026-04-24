# End-to-End Test Plan — Three-App Humor System

**Date**: 2026-04-24
**Author**: Arin Jaff
**Scope**: Full workflow verification across Project 1 (user app), Project 2 (admin panel), Project 3 (prompt-chain tool).

## Systems under test

| # | Name | Repo dir | Local port | Production URL |
|---|------|----------|------------|----------------|
| P1 | Humor Project (user app) | `humor-project-semester-project` | 3000 | https://humorproject.arinjaff.com |
| P2 | Humor Admin Panel | `humor-project-admin` | 3001 | https://humorprojectadmin.arinjaff.com |
| P3 | Prompt Chain Tool | `prompt-chain-tool` | 3002 | https://prompt-chain-tool-blush.vercel.app |

All three share one Supabase backend (`secure.almostcrackd.ai`).

## Test strategy

- **3 local passes** covering the branches below, plus **1 production verification pass**.
- Admin (P2) runs with `BYPASS_AUTH=true` locally. P1 and P3 use a one-time Google OAuth login whose storage state is reused.
- No schema changes, no deletes of pre-existing rows. Every row created during testing is prefixed `E2E_TEST_` and deleted at the end.
- Playwright (Chromium, headful for OAuth; headless for verification passes). Screenshots saved to `screenshots/`.

---

## Branch tree

### P1 — Humor Project (user app)

1. **Public/landing**
   - `GET /` renders, no console errors, 3D/Three.js scene mounts
2. **Auth**
   - Sign in → Google OAuth → `/auth/callback` → session cookie set
   - Sign out → session cleared
3. **Upload branch** (`/upload`)
   - URL-based upload with description + `is_public` toggle
   - File upload path (if present)
   - Validation: empty URL, invalid URL, missing description
4. **Rate branch** (`/rate`)
   - Load public images
   - Submit a caption (valid text)
   - Empty caption rejected
   - Over-length caption handled
5. **Review branch** (`/review`)
   - Captions grouped under each image
   - Upvote → `caption_votes` row inserted with vote_value=1
   - Downvote → row updated to -1
   - Un-vote / toggle back
   - Sort / filter controls (if present)
6. **Swipe branch** (`/swipe`)
   - Swipe deck loads
   - Advance to next image
   - Vote via swipe action persists
7. **Protected area** (`/protected`)
   - Unauthenticated user redirected or gated
8. **Cross-app integrity**
   - Image uploaded here is visible in P2's `/dashboard/images`
   - Caption submitted here appears in P2's `/dashboard/captions`

### P2 — Admin Panel

1. **Auth + gating**
   - Non-superadmin redirected with `?error=access_denied`
   - Superadmin admitted to `/dashboard`
   - `BYPASS_AUTH=true` path (local dev only)
2. **Dashboard analytics** (`/dashboard`)
   - Stats cards render with numeric values (no NaN / undefined)
   - Vote distribution chart renders
   - Engagement chart renders
   - Meme format breakdown renders
   - Caption Stats page (`/dashboard/caption-stats`) renders
3. **Content CRUD — read-only render**
   - `/dashboard/captions` — list loads grouped by image; sortable
   - `/dashboard/caption-requests` — list loads
4. **Content CRUD — round-trip (create → edit → delete)**
   - `/dashboard/caption-examples` — add, edit, delete one `E2E_TEST_…`
   - `/dashboard/images` — **read only** (no create/delete, to avoid polluting user-facing app)
5. **Humor pages (read)**
   - `/dashboard/humor-flavors`, `/dashboard/humor-flavor-steps` render
   - `/dashboard/humor-mix` renders (no writes)
6. **LLM pages**
   - `/dashboard/llm-providers` — create, edit, delete one `E2E_TEST_…`
   - `/dashboard/llm-models` — create, edit, delete one `E2E_TEST_…`
   - `/dashboard/llm-prompt-chains` (read)
   - `/dashboard/llm-responses` (read)
7. **Management**
   - `/dashboard/users` — list loads
   - `/dashboard/terms` — create, edit, delete one `E2E_TEST_term`
   - `/dashboard/allowed-signup-domains` — create, edit, delete one `E2E_TEST_DOMAIN.invalid`
   - `/dashboard/whitelisted-emails` — create, edit, delete `e2e-test+<ts>@example.invalid`

### P3 — Prompt Chain Tool

1. **Auth**
   - Unauthenticated → 401 from API routes
   - Non-admin profile → 403
   - Admin (superadmin OR matrix_admin) → success
2. **Flavors CRUD**
   - `POST /api/flavors` — create `E2E_TEST_flavor_<ts>`
   - `PATCH /api/flavors/:id` — rename
   - `DELETE /api/flavors/:id` — delete at end of run
3. **Steps CRUD**
   - Create 2 steps under the test flavor
   - Edit one step
   - `POST /api/flavors/:id/steps/reorder` — swap order
   - Delete one step; confirm one remains
4. **Duplicate**
   - `POST /api/flavors/:id/duplicate` — verify copy appears; delete copy after
5. **Test-flavor run**
   - `GET /api/test-images` — returns image set
   - `POST /api/test-flavor` — single small run (1 image, minimal steps) against live crackd API
   - Generated captions visible in UI
6. **Error paths**
   - Unauthenticated call → 401
   - Malformed body → 4xx

---

## Three-pass schedule

| Pass | Env | Focus | Goal |
|------|-----|-------|------|
| 1 | Local | Full happy path across P1 → P2 → P3 | Baseline — find obvious breakage |
| 2 | Local | Edge cases + invalid inputs + cross-app integrity | Find data/validation bugs |
| 3 | Local | Regression re-run of any fixes + full happy path | Confirm green |
| 4 | Prod | Smoke of happy path on deployed URLs | Confirm prod parity |

## Cleanup protocol

At end of every run: delete every `E2E_TEST_…`-prefixed row I created. Logged in `TEST_RESULTS.md`.

## Out of scope

- Load / performance testing
- Mobile viewport (desktop only unless a bug requires it)
- Real email / domain validation
- Schema migrations
- Security audit (handled separately)
