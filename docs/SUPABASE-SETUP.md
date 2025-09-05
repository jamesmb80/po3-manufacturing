# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - Project name: `po3-manufacturing`
   - Database Password: (save this securely)
   - Region: Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your API Keys

Once project is created:
1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **anon public**: Your anonymous key (safe for client-side)
   - **service_role**: Your service key (keep secret, server-side only)

## Step 3: Create Database Schema

1. Go to SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to execute

## Step 4: Set Up Authentication

1. Go to Authentication → Settings
2. Under "Email Auth":
   - Enable "Enable Email Confirmations" → **Turn OFF** (for demo)
   - Enable "Enable Email Sign-ups" → **ON**
3. Save changes

## Step 5: Create Demo User

1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Fill in:
   - Email: `james@example.com`
   - Password: `password`
   - Auto Confirm User: **Yes**
4. Click "Create user"

## Step 6: Configure Environment Variables

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
```

## Step 7: Update MCP Configuration

Edit `~/.claude/mcp_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["mcp-supabase"],
      "env": {
        "SUPABASE_URL": "https://[your-project-id].supabase.co",
        "SUPABASE_SERVICE_KEY": "[your-service-key]"
      }
    },
    "github": {
      "command": "npx",
      "args": ["@missionsquad/mcp-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "[your-github-token]"
      }
    }
  }
}
```

## Step 8: Test Connection

Run in your terminal:
```bash
npm run dev
```

The app should connect to Supabase successfully!

## GitHub Personal Access Token

To get a GitHub token for the MCP:
1. Go to GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Select scopes: `repo`, `workflow`
5. Generate and copy token

## Vercel Setup (After GitHub)

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!