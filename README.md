# SalesOS — Your Personal Sales Command Center

## What's built
- Multi-campaign manager with lead pipeline
- Touchpoint logger (Call / Email / Message / LinkedIn) with XP rewards
- Auto-cadence scheduling (Day 1 → 3 → 7 → 14)
- Daily Focus view (mobile-optimised, sorted by priority)
- Focus Mode — distraction-free session timer with personal best tracking
- Wins-first End of Day Review
- Trophy Case — XP levels, streak tracker, weekly stats
- Outreach Templates per channel
- Won/Lost reason tracking
- CSV import
- Two-way Google Sheets sync
- Browser push notifications + email reminders (Resend)
- Morning briefing email at 8am
- Scheduled callback reminders (10 min + 2 min before)
- Full gamification: XP, levels, streaks, hot streak multiplier, celebrations

---

## STEP 1 — Set up your project locally

Open terminal, navigate to where you want the project:

```bash
cd ~/Desktop
git clone <your-github-repo-url> sales-system
cd sales-system
npm install
```

---

## STEP 2 — Set up Supabase database

1. Go to **app.supabase.com** → your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase-schema.sql` from this project
5. Copy the entire contents and paste into the SQL editor
6. Click **Run** (green button)

You should see "Success. No rows returned" — that means it worked.

Then go to **Project Settings → API** and copy:
- Project URL
- anon public key
- service_role key (click reveal)

---

## STEP 3 — Create your .env.local file

In the project folder, create a file called `.env.local`:

```bash
# In your terminal (inside the project folder):
cp .env.local.example .env.local
```

Then open `.env.local` in VS Code and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
REMINDER_EMAIL=youremail@gmail.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=sales-system-sync@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For GOOGLE_PRIVATE_KEY:
- Open the `google-credentials.json` file you downloaded
- Find the `private_key` field
- Copy the entire value (including BEGIN/END lines)
- Paste it as the value — keep the quotes around it

---

## STEP 4 — Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see SalesOS.

When it asks for browser notification permission — click Allow.

---

## STEP 5 — Deploy to Vercel

### Push to GitHub first:
```bash
git init
git add .
git commit -m "Initial SalesOS build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sales-system.git
git push -u origin main
```

### Deploy to Vercel:
```bash
npm install -g vercel
vercel
```

Follow the prompts:
- "Set up and deploy?" → Y
- "Which scope?" → your account
- "Link to existing project?" → N
- "Project name?" → sales-system
- "Directory?" → ./
- "Override settings?" → N

Then add your environment variables to Vercel:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add REMINDER_EMAIL
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

For NEXT_PUBLIC_APP_URL, use your Vercel URL: `https://sales-system.vercel.app`

Then redeploy:
```bash
vercel --prod
```

---

## STEP 6 — Final Supabase config for production

In Supabase → **Authentication → URL Configuration**:
- Site URL: `https://your-vercel-url.vercel.app`

---

## STEP 7 — Google Sheets (first sync)

1. Open your campaign in SalesOS
2. Click **Sync Sheets**
3. A Google Sheet will be created automatically and linked
4. Share the sheet with your service account email so it has edit access:
   - Open the sheet → Share
   - Add your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - Give it Editor access

From now on, Sync Sheets will keep the two in sync two-ways.

---

## XP & Levels reference

| Action | XP |
|---|---|
| Call logged | 10 XP |
| LinkedIn video | 7 XP |
| Email sent | 5 XP |
| Message sent | 4 XP |
| Task completed | 3 XP |
| Deal CLOSED | 500 XP |

| Level | Title | XP needed |
|---|---|---|
| 1 | Prospector | 0 |
| 2 | Dialer | 100 |
| 3 | Connector | 300 |
| 4 | Closer | 600 |
| 5 | Rainmaker | 1,000 |
| 6 | Hunter | 1,600 |
| 7 | Dealmaker | 2,400 |
| 8 | Sales Machine | 3,500 |
| 9 | Legend | 5,000 |
| 10 | GOAT | 7,500 |

Hot Streak multiplier activates at 3-day streaks and increases every 3 days (max 3x).

---

## Daily workflow

1. **8am** — Morning briefing email arrives in your inbox
2. **Open app** → Dashboard shows callbacks countdown + today's tasks
3. **Click Daily Focus** → See your priorities sorted: overdue → hot leads → tasks → stale
4. **Click Focus Mode** → Lock in for a 25/45/60/90 min session
5. **Log every touchpoint** → XP auto-awarded, next cadence scheduled
6. **5pm** → Click End of Day → log wins, set tomorrow's intentions
7. **Trophy** → Check your weekly stats + level progress

---

## CSV Import format

Your CSV needs at minimum a `name` column. Supported columns:

```
name, company, email, phone, linkedin, notes, priority
```

Also accepts: `full name`, `first name` + `last name`, `phone number`, `email address`
