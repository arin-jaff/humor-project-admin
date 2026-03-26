# Humor Admin Panel

Superadmin dashboard for the Humor Research Database. Built with Next.js 14, Supabase, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL, Google OAuth)
- **Styling:** Tailwind CSS (dark theme)
- **Charts:** Recharts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a Google account that has `is_superadmin = true` in the `profiles` table.

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://secure.almostcrackd.ai
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
BYPASS_AUTH=true  # optional, dev only — skips OAuth + superadmin check
```

## Authentication

- Google OAuth via Supabase
- Middleware enforces `profiles.is_superadmin` on all `/dashboard/*` routes
- Non-superadmins are redirected to the login page with an `access_denied` error

## Dashboard Pages

### Main

| Route | Description |
|---|---|
| `/dashboard` | Analytics — stats cards, vote distributions, engagement charts, meme format breakdown |

### Content

| Route | Table | Operations |
|---|---|---|
| `/dashboard/images` | `images` | Create (URL or file upload via pipeline API), Read, Update, Delete |
| `/dashboard/captions` | `captions` | Read (grouped by image, sortable by score/controversy/length/date) |
| `/dashboard/caption-requests` | `caption_requests` | Read |
| `/dashboard/caption-examples` | `caption_examples` | Create, Read, Update, Delete |

### Humor

| Route | Table | Operations |
|---|---|---|
| `/dashboard/humor-flavors` | `humor_flavors` | Read |
| `/dashboard/humor-flavor-steps` | `humor_flavor_steps` | Read |
| `/dashboard/humor-mix` | `humor_mix` | Read, Update |

### AI / LLM

| Route | Table | Operations |
|---|---|---|
| `/dashboard/llm-providers` | `llm_providers` | Create, Read, Update, Delete |
| `/dashboard/llm-models` | `llm_models` | Create, Read, Update, Delete |
| `/dashboard/llm-prompt-chains` | `llm_prompt_chains` | Read |
| `/dashboard/llm-responses` | `llm_responses` | Read |

### Management

| Route | Table | Operations |
|---|---|---|
| `/dashboard/users` | `profiles` | Read |
| `/dashboard/terms` | `terms` | Create, Read, Update, Delete |
| `/dashboard/allowed-signup-domains` | `allowed_signup_domains` | Create, Read, Update, Delete |
| `/dashboard/whitelisted-emails` | `whitelisted_email_addresses` | Create, Read, Update, Delete |

## Database Conventions

All tables include four audit fields:

| Field | Behavior |
|---|---|
| `created_by_user_id` | Set by client to the authenticated user's `profiles.id` on insert |
| `modified_by_user_id` | Set by client to the authenticated user's `profiles.id` on insert and update |
| `created_datetime_utc` | Auto-set by database (`NOW()`) on insert |
| `modified_datetime_utc` | Auto-set by database (`NOW()`) on update |

## Image Upload

The "Add Image" modal supports two modes:

1. **URL** — paste an existing image URL
2. **File Upload** — uploads via the Crackd pipeline API:
   - `POST /pipeline/generate-presigned-url` to get an S3 presigned URL
   - `PUT <presignedUrl>` to upload the file
   - `POST /pipeline/upload-image-from-url` to register the CDN URL in the database

## Project Structure

```
src/
  app/
    page.tsx                  # Login page
    auth/callback/route.ts    # OAuth callback
    dashboard/
      page.tsx                # Analytics dashboard
      layout.tsx              # Sidebar navigation
      [entity]/page.tsx       # Entity pages (15 total)
  lib/
    supabase-browser.ts       # Browser Supabase client
    supabase-server.ts        # Server Supabase client
  middleware.ts               # Auth + role enforcement
```

## Deployment

Deploy on [Vercel](https://vercel.com). Set the environment variables in the Vercel dashboard. Ensure the deployed URL's `/auth/callback` path is added to Supabase's redirect URL allowlist.
