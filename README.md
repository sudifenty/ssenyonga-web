# Cars for Sale in Uganda — Dealership Website

A car dealership website in ONE file: plain HTML, Tailwind CSS (CDN) and
vanilla JavaScript. The live inventory is stored in a free **Supabase**
cloud database — you add a car in the dashboard, every visitor sees it on
their next refresh. No publish button, no tokens, nothing to remember.

| File | What it is |
|---|---|
| `index.html` | The whole website AND the owner dashboard in one page. Customers see the car grid, photo galleries, search, contact buttons and showroom location. The **Owner Login** button (top right) opens the dashboard on the same page behind a passcode |
| `README.md` | This guide |

## Run it on your computer
Double-click `index.html`. Any modern browser works. Cars and photos are
saved in that browser's localStorage, and uploaded photos are compressed
automatically (max 900px, JPEG, up to 6 per car).

## Put it online with GitHub Desktop (step by step)

1. **Extract this ZIP first.** You end up with **one folder** that directly
   contains `index.html` and `README.md`. Do not drag the ZIP itself into
   GitHub Desktop — it can't read ZIPs.
2. Open **GitHub Desktop → File → Add Local Repository…** and select that folder.
   **Do not use "Clone"** — this repo is on your computer.
3. Click **Publish repository**. Name it e.g. `cars-for-sale-in-uganda`, and **UNcheck
   "Keep this code private"** (free GitHub Pages needs a public repository).
4. Turn on the website: github.com → your repository → **Settings → Pages** →
   *Build and deployment* → **Source: Deploy from a branch** → **Branch: main**,
   **Folder: /(root)** → **Save**.
5. Wait 2–10 minutes, then visit `https://YOUR-USERNAME.github.io/REPO-NAME/`

## One-time cloud setup — Supabase (about 10 minutes)

This is what makes added cars visible to every visitor. You do it **once**.

1. Go to **supabase.com** → **Start your project** → sign up (free, no card
   needed) → **New project**. Name it e.g. `cars-for-sale-in-uganda`, pick any region,
   choose a database password (save it somewhere, you rarely need it).
2. Wait 1–2 minutes while the project is created.
3. In the left menu open **SQL Editor** → **New query**, paste **all** of the
   setup SQL from the box below, click **Run**. It should say "Success".
4. Create your owner account: **Authentication → Users → Add user →**
   enter your email + a password → **Auto Confirm User: ON** → save.
   *This* email and password are what the dashboard will ask for later.
5. Copy your connection values: **Project Settings (the gear) → API** →
   copy the **Project URL** (looks like `https://abcd1234.supabase.co`) and
   the **anon public** key (a long string).
6. Open `index.html` in any text editor (Notepad works). Press **Ctrl+F**,
   search for `SUPABASE_URL` — you will find the connection block near the
   top of the code. Paste your values between the quotes:

   ```
   var SUPABASE_URL = 'https://abcd1234.supabase.co';
   var SUPABASE_ANON_KEY = 'eyJ...your long anon key...';
   ```

   Save the file, then commit + push in GitHub Desktop.
7. Open your website → **Owner Login** (passcode — see below) → click the
   cloud button at the top (**Local only**) → enter your Supabase owner
   email + password → **Save & Sign In**. Your current cars upload to the
   cloud and the button turns green (**Live**). Done — from now on every
   change you save is live for every visitor instantly.

### The setup SQL (copy the whole box)

```sql
-- Cars for Sale in Uganda — one-time setup. Run in Supabase → SQL Editor → New query.
create table if not exists public.cars (
  id         text primary key,
  data       jsonb not null,
  pos        int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key   text primary key,
  value text
);

alter table public.cars         enable row level security;
alter table public.app_settings enable row level security;

-- Visitors (and the website) may READ the inventory…
create policy "cars readable by everyone"
  on public.cars for select
  using (true);

create policy "settings readable by everyone"
  on public.app_settings for select
  using (true);

-- …but only you (signed in with your owner account) may change it.
create policy "owner manages cars"
  on public.cars for all
  to authenticated
  using (true) with check (true);

create policy "owner manages settings"
  on public.app_settings for all
  to authenticated
  using (true) with check (true);
```

## Everyday use (the owner's workflow)

1. Open your website → **Owner Login** → type the dashboard passcode.
2. Add or edit cars — up to 6 photos each. Every save is pushed to the
   cloud automatically (you'll see the pill flash **Syncing…** then **Live**).
3. Visitors see your changes as soon as they open or refresh the page.

### The cloud button (top of the dashboard)

| What you see | What it means |
|---|---|
| 🟢 **Live** | Connected and signed in — saves sync automatically |
| 🟡 **Not signed in** | The file is configured, but you need to sign in (click it, enter your Supabase email + password) |
| ⚪ **Local only** | `index.html` has no Supabase URL/key pasted in yet — see setup step 6 |
| Orange **Not synced** badge | You made changes but the cloud could not be reached (offline?). Your changes are safe on this device — click the cloud button → **Sync now** when back online |

Clicking the cloud button always opens the cloud settings, where you can
sign in, change your owner email/password, use **Sync now**, and set the
**dashboard address** (see the PHP section below).

### Is the anon key in the file safe?
Yes — it is **public on purpose**. Visitors' browsers need it to *read* your
inventory, and reading is all it allows. *Writing* requires your owner
account (email + password), which is stored only in your browser and never
appears in the file.

## Changing the dashboard passcode
Open `index.html` in any text editor and find the line
`var CM_PASSCODE = 'admin123#';` near the bottom. Change the text between the
quotes, save, commit + push.

## About the passcode's limits (important)
This one-file site is hosted on GitHub Pages, which cannot run server code.
That means the dashboard passcode lives in the page — a technical visitor
could find it in the page source. It keeps casual visitors out, nothing more.
Your inventory itself is safe: nobody can change the cars in the cloud
without your Supabase owner account.

For a password that never touches the browser, use the separate PHP package
(`admin.php` + `logout.php` on PHP hosting). It shares the same Supabase
cloud. Once it is online, put its address in the dashboard's cloud settings
(**Dashboard address**) — after your next save, the website's Owner Login
button automatically sends you there instead.

## Seeing a 404? Check these in order
1. Wait a few minutes; check the repo's **Actions** tab.
2. `index.html` must be at the ROOT of the repo, never inside a folder.
3. GitHub Pages must be on (Settings → Pages → Branch: main, Folder: /root).
4. The repo must be public on a free plan.
5. Check the URL matches your username and repo name exactly.

## Cars not updating for visitors? Check these
1. The cloud button must be green (**Live**) when you save.
2. `index.html` on GitHub must contain your Supabase URL + anon key
   (setup step 6) — if you forgot to push, visitors read nothing.
3. Visitors must refresh the page (changes appear on reload, not live-push).
4. If the badge says **Not synced**, click the cloud button → **Sync now**.
