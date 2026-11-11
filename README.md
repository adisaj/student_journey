# Talerang Career Readiness Portal (frontend prototype)

For students in the **Future CEOs Program**.

## 1. What this is
A working copy of the student-facing Career Readiness Portal: welcome page, sign-up, login, dashboard, task view and My Profile.

## 2. Frontend only
There is **no backend, database or real login**. Everything is stored in your own browser. Sign-in here is **not secure** and must not be used for real student data.

## 3. How to run it
1. Keep all files together in one folder (`index.html`, `style.css`, `script.js`, `assets/`).
2. Double-click `index.html`. It opens in your browser. No install needed.

Fonts (Red Hat Display and Red Hat Text) load from Google Fonts when you're online. Offline, the page falls back to system fonts and still works.

## 4. What's in the portal
**Visual**
- **Journey path**: the red swoosh from the Talerang logo becomes the path through the six steps. It appears on the welcome page (drawn once on load) and on the dashboard, where finished steps, the next step and remaining steps look different. Each stop opens that step.
- **Login page**: the "Get work-ready this year!" banner sits behind the top of the login form.
- **Dashboard**: greeting, a readiness ring, an "Up next" call to action, attendance and progress meters, a numbered list of the six steps, and a recent-activity feed.
- **Favicon**: the red Talerang swoosh (`assets/favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`).
- **Dark theme**: follows the device setting until the student picks one with the moon/sun button.
- **Responsive**: sidebar becomes a slide-in menu on phones, and the journey path switches to a compact version.

**Functionality**
- **Shareable URLs and Back button**: `#/welcome`, `#/login`, `#/new`, `#/existing`, `#/dashboard`, `#/profile`, `#/dashboard/task/<key>`. Refreshing keeps you on the same page.
- **Task view**: a button to the place where the step is done (Google Classroom or the Express Portal), a checkbox for each sub-step (progress is saved), a screenshot upload for the WRAP test, personal notes that save automatically, completion date, and **Reopen task** to undo a completion.
- **Step filter**: All / To do / Done.
- **Activity feed**: records completions, reopened steps, ticked sub-steps, track changes and password changes.
- **Forms**: show/hide password buttons, password strength hints, the field with the problem is highlighted and focused, and a two-step progress indicator for existing-user setup.
- **Profile**: edit name and username; skill track starts as "Not chosen yet" because students choose it later in the program; change password; change or remove photo (photos are cropped and resized to 320px so they fit in browser storage); **Download my data** as JSON (password excluded).
- **Toasts** confirm actions ("Changes saved", "WRAP Test marked complete").
- **Accessibility**: keyboard focus stays inside the task view while it's open, Escape closes it, focus returns to the step you opened, and animations are switched off for people who prefer reduced motion.

## The six steps
Edit them in `script.js`, section **2. CHECKLIST TASK CONTENT** (`CHECKLIST_KEYS` sets the order, `TASKS` the wording and links, `LINKS` the URLs).

| # | Step | Checklist |
|---|---|---|
| 1 | Homework | Log in to your Google Classroom. Go to Submissions and complete all submissions day-wise. (Button: Google Classroom) |
| 2 | Pre-work | Go to Google Classroom and complete all pre-work day-wise. (Button: Google Classroom) |
| 3 | WRAP test | Log in to the Express Portal and complete Step 1. Add a screenshot (ticks itself when uploaded). (Button: Express Portal) |
| 4 | Micro-internship | Log in to the Express Portal. Complete the Micro-Internship step and submit your project. (Button: Express Portal) |
| 5 | Resume | Log in to the Express Portal. Complete the Resume step. (Button: Express Portal) |
| 6 | Internship request | Resume is in the Talerang format. Micro-internship project submitted. Internship survey filled in (link to the survey). |

If you change the sub-steps, increase `CONTENT_VERSION` so old ticks are cleared rather than landing on the wrong item.

## 5. How localStorage is used
The browser keeps three items for this page:
- `talerang_users`: the list of accounts (including checklist progress, sub-steps, notes, screenshots, activity and profile photos).
- `currentUserEmail`: who is logged in right now.
- `talerang_prefs`: display preferences (light or dark theme).

Older saved data from the previous version is upgraded automatically (missing fields are filled in by `normalizeUser`).

To reset everything: clear this site's data in the browser settings (or use a private window).

## 6. Demo credentials
| Account | Email | Password | Use it to test |
|---|---|---|---|
| Sumit Sharma | student@talerang.com | 123456 | Login, dashboard (readiness 78%), activity feed. The login page has a "Fill in demo login" button. |
| Ananya Rao | ananya@talerang.com | (none yet) | Existing-user flow: choose "Set up my login", enter this email, then pick a username and password |

## 7. Where the colours are
Top of `style.css`, in the `:root` block (`--talerang-blue`, `--talerang-red`, `--talerang-white`, `--talerang-light-grey`). The dark theme is the `:root[data-theme="dark"]` block just below it.

## 8. Where the logo is
`assets/talerang-logo.png`

## 9. Where login and storage logic lives
`script.js`, section **3. DATA FUNCTIONS**. This is the only place that touches localStorage.

## 10. Functions to replace with API calls later
`getUsers`, `saveUsers`, `saveUser`, `getCurrentUser`, `saveCurrentUser`, `loginUser`, `logoutUser`, `registerUser`, `setUpCredentials`, `changePassword`, `getChecklist`, `saveChecklist`, `updateChecklistTask`, `updateTaskStep`, `saveTaskNote`, `saveTaskScreenshot`, `saveProfilePhoto`, `exportUserData`, and `calculateReadinessScore` (the real score should come from Talerang's systems).

## 11. What is placeholder only
- Real authentication, password security, email verification
- Real student, attendance and readiness data
- Google Classroom and the Express Portal aren't connected: students tick items themselves, and Mark as complete only updates the checklist
- WRAP screenshots are stored in the browser only; nothing is sent to Talerang

Search `script.js` for `FRONTEND PLACEHOLDER` and `DEMO USER` to find these spots.

## Readiness score
Checklist-based accounts: completed steps / 6 x 100. The demo user has a fixed manual 78% that is not overwritten. To use the checklist for everyone, set `USE_CHECKLIST_SCORE_FOR_EVERYONE = true` at the top of `script.js`.
