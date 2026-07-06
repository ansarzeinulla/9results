# 5-Minute Deployment Guide

## TL;DR: Backend on Render, Frontend on Vercel

### 1. Create Supabase Database (5 min)
```
1. supabase.com → Sign Up
2. Create Project → Wait for initialization
3. Settings → Database → Copy "Connection String (URI)"
4. Keep this safe — you'll use it twice
```

**Connection string format:**
```
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

---

### 2. Deploy Backend to Render (5 min)

```
1. render.com → Sign in with GitHub
2. New Web Service → Select your repo
3. Fill in:
   - Name: results-togyz-api
   - Build: cd backend && npm install
   - Start: cd backend && node src/index.js
4. Environment Variables → Add:
   - DATABASE_URL = [paste from Supabase]
   - JWT_SECRET = [any random 32-char string]
   - NODE_ENV = production
5. Create Web Service → Wait 5-10 min
6. Copy the Render URL (e.g., https://results-togyz-api.onrender.com)
```

**Seed the database (one-time):**
- Go to Render dashboard → Your service → **Shell**
- Run: `cd backend && npm run seed`

✅ Backend is live!

---

### 3. Deploy Frontend to Vercel (3 min)

```
1. vercel.com → Sign in with GitHub
2. Add Project → Select your repo
3. Framework: Vite
4. Root Directory: frontend
5. Deploy → Wait 2-3 min
6. Copy the Vercel URL (e.g., https://9results.vercel.app)
```

✅ Frontend is live!

---

### 4. Update Frontend API URL (Already Done!)

The code already detects your environment:
- **Local (`localhost`)**: Calls `http://localhost:3001/api`
- **Production**: Calls `https://results-togyz-api.onrender.com/api`

If you change your Render backend URL, update it in `frontend/src/api.js`:
```javascript
return 'https://[YOUR-RENDER-URL]/api';
```

---

## Test It

1. Visit your Vercel frontend URL
2. Sign in: `organizer` / `password123`
3. Create a tournament → Add players → Generate round → Enter results
4. All good? You're in production! 🚀

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot POST /api/login" | Frontend is calling wrong backend URL. Check `api.js` |
| CORS error | Backend CORS config doesn't include your Vercel URL. Update `backend/src/index.js` |
| Render page not found | Service is sleeping (free tier). Wait 30 sec, refresh |
| Seed command fails | Check Render Logs tab. Verify DATABASE_URL is correct |

---

## Cost

- **Supabase**: Free (500 MB database)
- **Render**: Free (1 web service, sleeps after 15 min idle) — upgrade to Starter ($7/mo) for always-on
- **Vercel**: Free (unlimited deploys)

**Total: $0-7/month**

---

## Update Your Code Later

When you push to GitHub:
1. **Render** auto-redeploys backend (check **Deployments** tab)
2. **Vercel** auto-redeploys frontend (check **Deployments** tab)

Takes ~5-10 minutes total.

---

## Environment Variables Checklist

### Render Backend
- ✅ `DATABASE_URL` = Supabase connection string
- ✅ `JWT_SECRET` = random 32-char string
- ✅ `NODE_ENV` = production

### Vercel Frontend
- ✅ None needed (uses hardcoded Render API URL)

---

For detailed docs, see **DEPLOY_RENDER_VERCEL.md**
