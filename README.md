# Rohtak Public School — Student Management System (Demo)

A simple, frontend-only Student Management System demo for a school in Rohtak.
Plain **HTML, CSS, and JavaScript** — no build step, no framework. Data and
login are handled by **Supabase**, and the site is meant to be hosted for
free on **Cloudflare Pages** via GitHub.

Staff can sign up / log in, view a dashboard of quick stats, add/edit/search/
filter/delete student records, and mark + review daily class attendance.

## What's included

```
school-sms/
├── index.html          Login / sign-up screen
├── dashboard.html       Stat cards + recently added students + today's attendance
├── students.html         Full student list with search, filter, add/edit/delete
├── attendance.html        Mark daily attendance per class + attendance history
├── css/
│   └── style.css         All styling (single stylesheet, no build tools)
├── js/
│   ├── config.js          Supabase URL + anon key (EDIT THIS)
│   ├── auth.js             Login/signup/logout + page protection
│   ├── dashboard.js        Loads stats for the dashboard
│   ├── students.js         CRUD logic for the students table
│   └── attendance.js       Mark/save attendance + load per-class history
└── README.md
```

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
3. Open `js/config.js` in this folder and paste them in:

   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```

   The anon key is safe to expose in frontend code — it only works within
   whatever your Row Level Security (RLS) policies allow, which is why
   step 2 below matters.

## 2. Create the `students` table

In your Supabase project, open the **SQL Editor** and run:

```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  roll_no text not null,
  class text not null,
  section text,
  gender text,
  dob date,
  parent_name text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- Row Level Security: only signed-in staff can read/write records.
alter table students enable row level security;

create policy "Authenticated users can view students"
  on students for select
  to authenticated
  using (true);

create policy "Authenticated users can insert students"
  on students for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update students"
  on students for update
  to authenticated
  using (true);

create policy "Authenticated users can delete students"
  on students for delete
  to authenticated
  using (true);
```

This keeps the demo simple: **any logged-in staff account** can manage all
student records. If you later want per-teacher restrictions (e.g. a teacher
only sees their own class), that's a change to these policies, not the app
code.

## 3. Create the `attendance` table

Run this in the same **SQL Editor**:

```sql
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Present', 'Absent', 'Late')),
  marked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

alter table attendance enable row level security;

create policy "Authenticated users can view attendance"
  on attendance for select
  to authenticated
  using (true);

create policy "Authenticated users can insert attendance"
  on attendance for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update attendance"
  on attendance for update
  to authenticated
  using (true);
```

The `unique (student_id, date)` constraint is what lets the Attendance page
save with a single **upsert** — marking the same student twice on the same
day updates their status instead of creating a duplicate row.

## 4. Turn on email/password auth

By default Supabase already has email/password sign-up enabled under
**Authentication → Providers → Email**. For a quick demo you may want to
turn **off** "Confirm email" (Authentication → Providers → Email →
"Confirm email") so new staff accounts can log in immediately after signing
up without clicking an email link. Leave it on for anything closer to
production.

## 5. Push this folder to GitHub

```bash
cd school-sms
git init
git add .
git commit -m "Initial commit — school student management system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Or just create a new repository on GitHub and upload these files through
the web UI ("Add file → Upload files").

## 6. Deploy on Cloudflare Pages

1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the repository you just pushed.
3. Build settings: leave **Build command** empty and **Build output
   directory** as `/` (this is a static site — no build step needed).
4. Click **Save and Deploy**. Cloudflare will give you a `*.pages.dev` URL.

Every time you push to `main`, Cloudflare redeploys automatically.

## 7. Try it out

1. Open the deployed URL — you'll land on the login screen.
2. Click **Create an account** and sign up with a staff email + password.
3. You'll land on the **Dashboard**. Go to **Students → + Add Student** to
   add your first record (add a few in the same class to try attendance).
4. Use the search box and class filter on the Students page to find
   records quickly.
5. Go to **Attendance**, pick a class and a date, mark each student
   Present / Absent / Late (or use **Mark all Present**), then
   **Save Attendance**. Re-opening the same class/date later preloads
   whatever was already marked, and the panel below shows recent history
   and the present rate for that class.

## Notes on this being a demo

- There's a single role ("staff") — no separate admin/teacher/student
  logins. That's a reasonable next step if you extend this.
- Attendance is marked per class per day, one status per student
  (Present/Absent/Late) — no periods/subjects. Add a `subject` or
  `period` column to `attendance` if you need multiple sessions a day.
- No pagination — fine for a demo of a few dozen–hundred students; add
  pagination or infinite scroll before using it with a large school roster.
- No file uploads (e.g. student photos) — Supabase Storage would be the
  natural place to add that.
- Client-side validation is minimal; Supabase will reject anything that
  breaks the table's `not null` constraints, but you may want to add
  friendlier validation messages for a real deployment.
