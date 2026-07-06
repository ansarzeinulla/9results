# Deploy to Render (Backend) + Vercel (Frontend)

Complete step-by-step guide for production deployment.

---

## Part 1: Backend on Render

### Step 1: Create Supabase Database

1. Go to [supabase.com](https://supabase.com) → Sign Up
2. Create a new project
   - Name: `results-togyz` (or any name)
   - Database password: save this securely
   - Region: closest to your users
3. Wait ~5 minutes for database to initialize
4. Go to **Settings → Database** and copy the **Connection String (URI)**
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
5. **Save this string** — you'll need it for both Render and Vercel

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) → Sign Up with GitHub
2. Click **New +** → **Web Service**
3. Select your GitHub repo (`9Results`) and connect it
4. Configure the service:
   - **Name**: `results-togyz-api`
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node src/index.js`
   - **Instance Type**: Free (or Starter+ if you want better performance)

5. **Add Environment Variables** (click **Environment**)
   - `DATABASE_URL` = paste your Supabase connection string from Step 1
   - `JWT_SECRET` = generate a random string (e.g., `openssl rand -hex 32`, or use `$(python3 -c 'import secrets; print(secrets.token_hex(16))')`)
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (Render assigns the port automatically, but set for clarity)

6. Click **Create Web Service** → wait 5-10 minutes for deployment
7. Once deployed, Render gives you a URL like: `https://results-togyz-api.onrender.com`
   - **Save this URL** — you'll use it in the frontend

8. **Seed the database** (one-time):
   ```bash
   # Open Render's Shell or SSH into the service
   cd backend && npm run seed
   ```
   Or manually via Supabase dashboard if you prefer.

✅ Backend is now live at `https://results-togyz-api.onrender.com`

---

## Part 2: Frontend on Vercel

### Step 1: Prepare Frontend for Production

Update the API base URL in the frontend to point to Render:

Edit `frontend/src/api.js` and ensure it uses the correct base:

```javascript
function getApiUrl() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';  // Local dev
  }
  return 'https://results-togyz-api.onrender.com/api';  // Production (Render)
}

export async function apiGet(path) {
  return handle(await fetch(`${getApiUrl()}${path}`, { headers: authHeaders() }));
}

export async function apiSend(method, path, body) {
  return handle(
    await fetch(`${getApiUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  );
}
```

### Step 2: Update vercel.json

Replace the current `vercel.json` with a frontend-only config:

```json
{
  "buildCommand": "npm run build --prefix frontend",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

Or delete `vercel.json` entirely (Vercel auto-detects Vite).

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **Add New** → **Project**
3. Select your `9Results` repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**
6. Wait 2-3 minutes
7. Once live, Vercel gives you a URL like: `https://9results.vercel.app`

✅ Frontend is now live!

---

## Part 3: Connect Frontend → Backend

The frontend now communicates with the Render backend via the updated `api.js`.

**Verify connectivity:**
1. Open your Vercel frontend: `https://9results.vercel.app`
2. Try to sign in with `organizer` / `password123`
3. If it works, everything is connected!

If you get CORS errors, add this to `backend/src/index.js`:

```javascript
app.use(cors({
  origin: ['https://9results.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

Then redeploy Render (git push triggers auto-redeploy).

---

## Complete Deployment Checklist

### Before You Deploy
- [ ] Have Supabase account (free tier is fine)
- [ ] Have Render account (free tier supports one web service)
- [ ] Have Vercel account
- [ ] GitHub repo is up-to-date with all code

### Supabase Setup
- [ ] Create PostgreSQL project
- [ ] Copy connection string (DATABASE_URL)
- [ ] Keep it safe — you'll use it twice

### Render Backend
- [ ] Connect GitHub
- [ ] Set DATABASE_URL and JWT_SECRET env vars
- [ ] Deploy and wait for green status
- [ ] Get the backend URL (e.g., `https://results-togyz-api.onrender.com`)
- [ ] Run seed: `cd backend && npm run seed` (or via Render Shell)

### Vercel Frontend
- [ ] Update `api.js` with Render backend URL
- [ ] Update `vercel.json` to frontend-only (or remove it)
- [ ] Deploy via Vercel dashboard
- [ ] Get the frontend URL (e.g., `https://9results.vercel.app`)
- [ ] Test login and a full tournament flow

### Production Verification
- [ ] Login with `organizer` / `password123` works
- [ ] Create a tournament
- [ ] Add players
- [ ] Generate a round
- [ ] Enter results
- [ ] Finish tournament and check ratings updated
- [ ] CSV export works
- [ ] Search works
- [ ] Public tournament view accessible without login

---

## Environment Variables Summary

### Render (Backend)
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET=[random-32-char-string]
NODE_ENV=production
```

### Vercel (Frontend)
No environment variables needed — frontend is static. The backend URL is hardcoded in `api.js`.

---

## Cost Breakdown

- **Supabase**: Free tier includes 500 MB database, ~100K API calls/month
- **Render**: Free tier includes 1 web service (512 MB RAM), auto-sleeps after 15 min inactivity
- **Vercel**: Free tier includes unlimited static deploys

Total cost for production: **$0/month** on free tiers. For a real tournament, you'd want:
- Render Starter ($7/month) — always-on, better performance
- Supabase: stays free unless you exceed limits

---

## Troubleshooting

### "Cannot POST /api/login" (404)
- Frontend is calling the wrong backend URL
- Check `api.js` — is the Render URL correct?
- Test curl: `curl https://results-togyz-api.onrender.com/api/health`

### "CORS error"
- Add the Vercel frontend URL to the CORS whitelist in `backend/src/index.js`
- Redeploy Render with the updated code

### "Connection refused" on Render
- Database URL is wrong or Supabase isn't responding
- Check Render logs: **Logs** tab on the Render dashboard
- Verify DATABASE_URL is set correctly

### Frontend shows "Loading..." forever
- Backend is sleeping (Render free tier sleeps after 15 min idle)
- Wait 30 seconds, refresh the page
- Or upgrade Render to Starter plan

### Seed command fails
- Go to Render dashboard → your service → **Shell**
- Run: `cd backend && npm run seed`
- Check for error messages

---

## Next: Custom Domain (Optional)

Once everything works:

1. **Vercel custom domain**:
   - Buy domain from Namecheap, Google Domains, etc.
   - In Vercel: **Settings → Domains** → add your domain
   - Update DNS records (Vercel gives instructions)

2. **Render custom domain** (optional):
   - Same process for the backend URL
   - Or keep the auto-generated `onrender.com` URL

---

## Monitoring & Logs

- **Render logs**: Dashboard → **Logs** tab (helpful for debugging)
- **Vercel logs**: Dashboard → **Deployments** → click a deployment → **Logs**
- **Supabase logs**: Dashboard → **Logs** (SQL queries, auth events)

---

## Updating Code

When you push to `main`:
1. **Render**: Auto-detects and redeploys (check **Deployments** tab)
2. **Vercel**: Auto-detects and redeploys (check **Deployments** tab)
3. If seeds/migrations needed, run via Render Shell

Typical deploy time: **5-10 minutes total** for both services.

---

## Final Commands

Once deployed, here are the production endpoints:

```bash
# Login
curl -X POST https://results-togyz-api.onrender.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"organizer","password":"password123"}'

# Frontend
https://9results.vercel.app
```

You're now in production! 🚀
