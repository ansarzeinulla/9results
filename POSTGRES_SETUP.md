# PostgreSQL Setup Guide

## Option 1: Local PostgreSQL with Docker (Development)

### Prerequisites
- Docker and Docker Compose installed

### Quick Start
```bash
# Create a docker-compose.yml in the project root
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: results_togyz
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start the database
docker-compose up -d

# Verify connection (you should get a "results_togyz" database)
docker-compose exec postgres psql -U postgres -l
```

The database is now running at `postgresql://postgres:postgres@localhost:5432/results_togyz` — exactly the default in `.env`.

### Stop the database
```bash
docker-compose down
```

To remove all data and start fresh:
```bash
docker-compose down -v
```

---

## Option 2: Supabase (Free, Vercel-Ready)

Supabase is a hosted PostgreSQL service with a generous free tier, perfect for Vercel deployments.

### Setup
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (choose a region close to your Vercel deployment)
3. Wait for the database to initialize (~5 minutes)
4. In the Supabase dashboard, go to **Settings → Database** and copy the "Connection string" under "URI"
5. Use the following format:
   ```
   postgresql://postgres:[YOUR_PASSWORD]@[HOST]:[PORT]/postgres
   ```
6. Update your `.env` (for local development):
   ```
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[HOST]:5432/postgres
   ```

### For Vercel Deployment
1. Go to your Vercel project settings → **Environment Variables**
2. Add `DATABASE_URL` with your Supabase connection string
3. Deploy — the app will create tables on first run

---

## Option 3: Neon (Free, Vercel-Ready)

Neon is another excellent PostgreSQL-as-a-service, slightly faster for Vercel's US regions.

### Setup
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string from the **Connection Details** panel
4. Update your `.env`:
   ```
   DATABASE_URL=[NEON_CONNECTION_STRING]
   ```

### For Vercel Deployment
1. Add `DATABASE_URL` to Vercel's environment variables (same as Supabase)
2. Deploy

---

## Migrating from SQLite

The app automatically creates all tables on startup. No migration script needed — just connect to a fresh PostgreSQL instance and run:

```bash
npm run seed
```

This seeds the demo data (organizer + 10 players + 3 tournaments) into the new database.

---

## Connection String Formats

- **Local Docker**: `postgresql://postgres:postgres@localhost:5432/results_togyz`
- **Supabase**: `postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres`
- **Neon**: `postgresql://[USER]:[PASSWORD]@[HOST]/[DB]?sslmode=require`

All are supported — just set `DATABASE_URL` in `.env`.

---

## Vercel Deployment

### With Supabase
1. Create a Supabase project (as above)
2. In Vercel: Project Settings → **Environment Variables**
3. Add: `DATABASE_URL` = your Supabase connection string
4. Deploy: `git push origin main` (or via Vercel dashboard)
5. On first deploy, the app creates all tables automatically

### Without Vercel CLI
```bash
git push origin main
# Vercel auto-deploys; check the Deployments tab
```

### With Vercel CLI
```bash
vercel env pull        # Pull environment variables from Vercel
npm run seed           # Seed the database (run once)
vercel deploy          # Deploy to production
```

---

## Troubleshooting

### "Connection refused" on localhost:5432
- Ensure `docker-compose up -d` completed and `docker-compose ps` shows the postgres service running
- Check logs: `docker-compose logs postgres`

### "Database does not exist" on Supabase/Neon
- The app creates tables on startup. Just start the backend: `npm run dev`
- The database is created if it doesn't exist (tables are added on connection init)

### "SSL certificate error" with Supabase
- Supabase/Neon require SSL by default
- The connection string typically includes `?sslmode=require` — copy it exactly from their dashboard

### Connection pool exhausted
- If you see "too many clients", increase the pool size in db.js:
  ```js
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // default is 10
  });
  ```

---

## Next Steps

Once PostgreSQL is running and the schema is created:
1. Start the backend: `npm run dev`
2. Run the seed: `npm run seed`
3. Visit http://localhost:5173 and sign in as `organizer` / `password123`
