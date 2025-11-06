# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database Connection (for Prisma)
# Get this from: https://supabase.com/dashboard/project/_/settings/database
# Replace [YOUR-PASSWORD] with your database password
# Replace [YOUR-PROJECT-REF] with your project reference

# DATABASE_URL: Use Session mode pooler (for app queries)
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# DIRECT_URL: Use Transaction mode pooler (REQUIRED for migrations)
# IMPORTANT: Migrations require transaction mode, not session mode!
DIRECT_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Getting Your Database Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection string**
4. For `DATABASE_URL`: Select **Connection pooling** → **Session mode** → **URI**
5. For `DIRECT_URL`: Select **Connection pooling** → **Transaction mode** → **URI** (or use Direct connection)
6. Replace `[YOUR-PASSWORD]` with your database password
7. Add both to your `.env.local` file

**Important Notes:**
- `DIRECT_URL` must use **Transaction mode** pooler (port 6543) for Prisma migrations to work
- If Transaction mode doesn't work, use the **Direct connection** (non-pooler) from Supabase
- Both URLs should include `?pgbouncer=true` parameter when using pooler

## Database Setup

1. Run the SQL script in `prisma/setup-triggers.sql` in your Supabase SQL Editor
2. This will create the necessary triggers for profile creation and user deletion
3. Run the SQL script in `supabase/setup-todos.sql` in your Supabase SQL Editor
4. This will create the todos table with Row Level Security (RLS) for Activity 1: Todo List

## Storage Setup for Photos (Activity 2)

1. Go to your Supabase Dashboard → **Storage**
2. Click **Create Bucket**
3. Name: `scic`
4. Make it **Public** (toggle on) - **This is important!**
5. Click **Create bucket**
6. Run the SQL script in `supabase/setup-photos.sql` in your Supabase SQL Editor
7. This will set up Row Level Security policies for the scic bucket
8. If you encounter RLS policy errors, see `supabase/setup-photos-troubleshooting.md` for troubleshooting steps

## Storage Setup for Food Review (Activity 3)

1. Go to your Supabase Dashboard → **Storage**
2. Click **Create Bucket**
3. Name: `food-review`
4. Make it **Public** (toggle on) - **This is important!**
5. Click **Create bucket**
6. Run the SQL script in `supabase/setup-food-review.sql` in your Supabase SQL Editor
7. This will set up Row Level Security policies for the food-review bucket

## Generate Prisma Client

After setting up your environment variables, run:

```bash
npm run db:generate
```

Or:

```bash
npx prisma generate
```

## Push Schema to Database

```bash
npm run db:push
```

Or:

```bash
npx prisma db push
```


