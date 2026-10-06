# Talerang Career Readiness Portal (frontend prototype)

## 1. What this is
A working copy of the student-facing Career Readiness Portal: welcome page, sign-up, login, dashboard, checklist, task view and My Profile.

## 2. Frontend only
There is **no backend, database or real login**. Everything is stored in your own browser. Sign-in here is **not secure** and must not be used for real student data.

## 3. How to run it
1. Keep all files together in one folder (`index.html`, `style.css`, `script.js`, `assets/`).
2. Double-click `index.html`. It opens in your browser. No install needed.

## 4. How localStorage is used
The browser keeps two items for this page:
- `talerang_users`: the list of accounts (including checklist progress and profile photos).
- `currentUserEmail`: who is logged in right now.

To reset everything: clear this site's data in the browser settings (or use a private window).

## 5. Demo credentials
| Account | Email | Password | Use it to test |
|---|---|---|---|
| Sumit Sharma | student@talerang.com | 123456 | Login, dashboard (readiness 78%) |
| Ananya Rao | ananya@talerang.com | (none yet) | Existing User flow: enter this email, then set username and password |

## 6. Where the colours are
Top of `style.css`, in the `:root` block (`--talerang-blue`, `--talerang-red`, `--talerang-white`, `--talerang-light-grey`).

## 7. Where the logo is
`assets/talerang-logo.png`

## 8. Where login and storage logic lives
`script.js`, section **2. DATA FUNCTIONS**. This is the only place that touches localStorage.

## 9. Functions to replace with API calls later
`getUsers`, `saveUsers`, `saveUser`, `getCurrentUser`, `saveCurrentUser`, `loginUser`, `logoutUser`, `registerUser`, `setUpCredentials`, `getChecklist`, `saveChecklist`, `updateChecklistTask`, `saveProfilePhoto`, and `calculateReadinessScore` (the real score should come from Talerang's systems).

## 10. What is placeholder only
- Real authentication, password security, email verification
- Real student, attendance and readiness data
- WRAP test, resume, micro-internship, internship request and internship completion (the Start button opens a task page and Mark as Complete only ticks the checklist)

Search `script.js` for `FRONTEND PLACEHOLDER` and `DEMO USER` to find these spots.

## Readiness score
Checklist-based accounts: completed tasks / 7 x 100. The demo user has a fixed manual 78% that is not overwritten. To use the checklist for everyone, set `USE_CHECKLIST_SCORE_FOR_EVERYONE = true` at the top of `script.js`.
