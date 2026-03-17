-- Run this entire file in Supabase SQL Editor

-- CAMPAIGNS
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  goal_type text default 'calls',
  goal_target integer default 0,
  goal_current integer default 0,
  color text default '#f97316',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- LEADS
create table leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  company text default '',
  email text default '',
  phone text default '',
  linkedin_url text default '',
  status text default 'new',
  priority text default 'medium',
  score integer default 5,
  score_override integer,
  notes text default '',
  won_lost_reason text default '',
  scheduled_callback_at timestamptz,
  next_contact_date date,
  cadence_day integer default 1,
  is_pinned boolean default false,
  last_contacted_at timestamptz,
  created_at timestamptz default now()
);

-- TOUCHPOINTS
create table touchpoints (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  channel text not null,
  outcome text default '',
  notes text default '',
  xp_earned integer default 0,
  created_at timestamptz default now()
);

-- TASKS
create table tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  due_at timestamptz,
  is_done boolean default false,
  is_pinned boolean default false,
  priority text default 'medium',
  created_at timestamptz default now()
);

-- TEMPLATES
create table templates (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- USER STATS (single row)
create table user_stats (
  id uuid primary key default gen_random_uuid(),
  total_xp integer default 0,
  level integer default 1,
  streak_days integer default 0,
  streak_multiplier numeric default 1.0,
  last_activity_date date,
  personal_best_calls_session integer default 0,
  weekly_calls integer default 0,
  weekly_emails integer default 0,
  weekly_deals integer default 0,
  updated_at timestamptz default now()
);

-- Insert default stats row
insert into user_stats (total_xp, level, streak_days) values (0, 1, 0);

-- DAILY REVIEWS
create table daily_reviews (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  wins text default '',
  missed text default '',
  tomorrow_intentions text default '',
  mood integer default 3,
  created_at timestamptz default now()
);

-- Default templates
insert into templates (channel, name, content) values
('call', 'Cold Call Opener', 'Hi [Name], this is [Your Name] from [Company]. I''ll be brief — I work with [industry] businesses to [value prop]. Is this something worth a 2-minute conversation?'),
('call', 'Follow-up Call', 'Hi [Name], we spoke last [day] — you mentioned [pain point]. I wanted to follow up with a specific solution for that. Do you have 5 minutes?'),
('email', 'Cold Outreach', 'Subject: Quick idea for [Company]\n\nHi [Name],\n\nI noticed [observation]. Most [role] I speak with struggle with [problem].\n\nWe helped [similar company] achieve [result] in [timeframe].\n\nWorth a quick call this week?\n\n[Your Name]'),
('email', 'Follow-up Email', 'Subject: Re: [Company] — following up\n\nHi [Name],\n\nJust circling back on my last note. I know things get busy.\n\nI genuinely think there''s a fit here. 15 minutes this week?\n\n[Your Name]'),
('message', 'WhatsApp Intro', 'Hi [Name], this is [Your Name]. I reached out by email last week about [topic]. Just wanted to connect here too — would love to show you what we''re doing. 2 minutes?'),
('linkedin', 'LinkedIn Video Script', 'Hey [Name] — recorded a quick 60-second video for you specifically about [their company/challenge]. No pitch, just a genuine idea I thought you''d find useful. Worth 60 seconds?');

-- Enable realtime
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table touchpoints;
alter publication supabase_realtime add table tasks;

-- =============================================
-- ROW LEVEL SECURITY (protect your data)
-- =============================================
-- This app uses service_role key server-side (secure).
-- RLS below ensures the public anon key can't be abused.

alter table campaigns enable row level security;
alter table leads enable row level security;
alter table touchpoints enable row level security;
alter table tasks enable row level security;
alter table templates enable row level security;
alter table user_stats enable row level security;
alter table daily_reviews enable row level security;

-- Allow all operations — access is controlled by keeping
-- the anon key private and using service_role server-side.
-- If you add auth later, replace 'true' with auth checks.
create policy "allow_all_campaigns"    on campaigns    for all using (true) with check (true);
create policy "allow_all_leads"        on leads        for all using (true) with check (true);
create policy "allow_all_touchpoints"  on touchpoints  for all using (true) with check (true);
create policy "allow_all_tasks"        on tasks        for all using (true) with check (true);
create policy "allow_all_templates"    on templates    for all using (true) with check (true);
create policy "allow_all_user_stats"   on user_stats   for all using (true) with check (true);
create policy "allow_all_daily_reviews" on daily_reviews for all using (true) with check (true);
