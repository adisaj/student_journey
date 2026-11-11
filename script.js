/* =========================================================
   TALERANG CAREER READINESS PORTAL — FRONTEND PROTOTYPE
   ---------------------------------------------------------
   FRONTEND ONLY. Data is kept in this browser's localStorage.
   This is NOT secure production authentication.

   FILE LAYOUT
   1. Settings
   2. Checklist task content
   3. DATA FUNCTIONS (the only place that touches localStorage)
   4. Readiness score
   5. Small UI helpers (toasts, passwords, dates, theme)
   6. Journey path drawing
   7. Routing (URL hash → screen)
   8. Public screens (welcome, existing user, new user, login)
   9. Dashboard
   10. Profile
   11. Task view
   12. Start-up
   ========================================================= */


/* =========================================================
   1. SETTINGS
   ========================================================= */

const STORAGE_KEY_USERS = "talerang_users";
const STORAGE_KEY_SESSION = "currentUserEmail";
const STORAGE_KEY_PREFS = "talerang_prefs";

// The program every student in this portal belongs to.
const PROGRAM_NAME = "Future CEOs Program";

// Defaults given to brand-new users. Easy to change later.
// Skill track is empty on purpose: students choose it later in the program.
const NEW_USER_DEFAULTS = {
  batch: PROGRAM_NAME,
  skillTrack: "",
  attendance: 0,
  readiness: 0
};

// Readiness: by default a user's readiness is calculated from the checklist
// (completed steps / number of steps x 100) unless the user has a manually
// assigned score (readinessSource = "manual", like the demo user's 78%).
// Set this to true to force checklist-based scores for EVERYONE.
const USE_CHECKLIST_SCORE_FOR_EVERYONE = false;

// The checklist steps, in display order. Add, remove or reorder steps here
// (and in TASKS below); the dashboard, journey path and score all follow.
const CHECKLIST_KEYS = [
  "homework", "prework", "wrap", "microInternship", "resume", "internshipRequest"
];

// Bump this when the sub-steps inside TASKS change, so ticks saved against
// the old sub-steps are cleared instead of landing on the wrong item.
const CONTENT_VERSION = 2;

const MAX_ACTIVITY_ITEMS = 30;
const PHOTO_SIZE_PX = 320;          // profile photos are resized to this square size
const SCREENSHOT_MAX_PX = 1280;     // task screenshots are shrunk to at most this width/height
const PHOTO_MAX_FILE_BYTES = 8 * 1024 * 1024;

// External links used in the checklist.
const LINKS = {
  classroom: { label: "Open Google Classroom", url: "https://classroom.google.com/" },
  express: { label: "Open Express Portal", url: "https://express.talerang.com/" },
  survey: { label: "Open internship survey", url: "https://www.surveymonkey.com/r/8JPTGK" }
};


/* =========================================================
   2. CHECKLIST TASK CONTENT
   FRONTEND PLACEHOLDER — FUTURE BACKEND / EXTERNAL SYSTEM INTEGRATION
   The portal can't see Google Classroom or the Express Portal yet, so
   students tick the steps themselves and mark the task complete.

   title       name of the step
   short       label on the journey path (array = two lines)
   link        main button in the task view
   steps       the checklist inside the step. A step can be plain text, or
               { text, link } to show a link next to it, or
               { text, upload: true } to ask for a screenshot (ticks itself
               when a screenshot is added)
   note        short reminder at the bottom of the task view
   ========================================================= */

const TASKS = {
  homework: {
    title: "Complete Homework",
    short: ["Homework"],
    description: "Complete your homework submissions in Google Classroom, day by day.",
    link: LINKS.classroom,
    steps: [
      "Log in to your Google Classroom.",
      "Go to Submissions and complete all submissions day-wise."
    ],
    note: "The portal can't see your Google Classroom yet, so tick each item yourself once it's done."
  },
  prework: {
    title: "Complete Pre-work",
    short: ["Pre-work"],
    description: "Complete all pre-work in Google Classroom, day by day.",
    link: LINKS.classroom,
    steps: [
      "Go to Google Classroom and complete all pre-work day-wise."
    ],
    note: "The portal can't see your Google Classroom yet, so tick this yourself once it's done."
  },
  wrap: {
    title: "WRAP Test",
    short: ["WRAP test"],
    description: "Log in to the Express Portal and complete Step 1, the WRAP test.",
    link: LINKS.express,
    steps: [
      "Log in to the Express Portal and complete Step 1.",
      { text: "Add a screenshot showing Step 1 is complete.", upload: true }
    ],
    note: "Your screenshot is kept in this browser only. It isn't sent to Talerang yet."
  },
  microInternship: {
    title: "Complete Micro-Internship",
    short: ["Micro-", "internship"],
    description: "Complete the Micro-Internship step in the Express Portal.",
    link: LINKS.express,
    steps: [
      "Log in to the Express Portal.",
      "Complete the Micro-Internship step in the Express Portal and submit your project."
    ],
    note: "The portal can't see the Express Portal yet, so tick each item yourself once it's done."
  },
  resume: {
    title: "Build Your Resume",
    short: ["Resume"],
    description: "Complete the Resume step in the Express Portal.",
    link: LINKS.express,
    steps: [
      "Log in to the Express Portal.",
      "Complete the Resume step in the Express Portal."
    ],
    note: "The portal can't see the Express Portal yet, so tick each item yourself once it's done."
  },
  internshipRequest: {
    title: "Request for Internship",
    short: ["Internship", "request"],
    description: "Check you're ready, then fill in the internship survey to request an internship.",
    steps: [
      "Your resume is in the Talerang format.",
      "Your micro-internship project is submitted.",
      { text: "Fill in the internship survey.", link: LINKS.survey }
    ],
    note: "Filling in the survey is how you request an internship. Ticking it here only updates your checklist."
  }
};

// A step's text, whether it's written as plain text or as { text: ... }.
function stepText(step) {
  return typeof step === "string" ? step : step.text;
}

// Extra settings on a step (link, upload). Plain-text steps have none.
// (Checked this way because JavaScript strings have a built-in .link() method.)
function stepOptions(step) {
  return typeof step === "object" && step !== null ? step : {};
}


/* =========================================================
   3. DATA FUNCTIONS
   Everything below talks to localStorage. A future developer
   can replace the bodies of these functions with API calls
   and the rest of the app will keep working.
   ========================================================= */

function emptyChecklist() {
  const checklist = {};
  CHECKLIST_KEYS.forEach(function (key) { checklist[key] = false; });
  return checklist;
}

// Makes sure a stored user has every field we expect (handles old/invalid data).
// Returns null if the record is unusable.
function normalizeUser(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.email !== "string" || !raw.email) {
    return null;
  }
  const checklist = emptyChecklist();
  const taskSteps = {};
  const taskNotes = {};
  const completedAt = {};
  const taskFiles = {};
  // Data saved before the checklist was rewritten: drop old sub-step ticks
  // and the old automatic "Technology" track (students now choose later).
  const isOldData = Number(raw.contentVersion) !== CONTENT_VERSION;

  CHECKLIST_KEYS.forEach(function (key) {
    if (raw.checklist && typeof raw.checklist === "object") {
      checklist[key] = raw.checklist[key] === true;
    }
    // Sub-step ticks inside each task (one true/false per step).
    const savedSteps = !isOldData && raw.taskSteps && Array.isArray(raw.taskSteps[key]) ? raw.taskSteps[key] : [];
    taskSteps[key] = TASKS[key].steps.map(function (_, i) { return savedSteps[i] === true; });
    // Personal notes per task.
    taskNotes[key] = raw.taskNotes && typeof raw.taskNotes[key] === "string" ? raw.taskNotes[key] : "";
    // When the task was marked complete (ISO date string).
    completedAt[key] = raw.completedAt && typeof raw.completedAt[key] === "string" ? raw.completedAt[key] : "";
    // Screenshot added to the task (image data URL), if the task asks for one.
    taskFiles[key] = raw.taskFiles && typeof raw.taskFiles[key] === "string" ? raw.taskFiles[key] : "";
    // A step that asks for a screenshot is ticked only when there is one.
    TASKS[key].steps.forEach(function (step, i) {
      if (stepOptions(step).upload) { taskSteps[key][i] = Boolean(taskFiles[key]); }
    });
  });

  let skillTrack = String(raw.skillTrack || "");
  if (isOldData && skillTrack === "Technology") { skillTrack = ""; }
  // "FCEO" was the old short name for the program.
  const program = !raw.batch || raw.batch === "FCEO" ? PROGRAM_NAME : String(raw.batch);

  const activity = Array.isArray(raw.activity)
    ? raw.activity.filter(function (a) { return a && typeof a.text === "string" && typeof a.at === "string"; })
    : [];

  return {
    id: raw.id || String(Date.now()) + Math.random().toString(16).slice(2),
    name: String(raw.name || "Student"),
    email: raw.email.trim().toLowerCase(),
    username: String(raw.username || ""),
    password: String(raw.password || ""),
    batch: program,
    skillTrack: skillTrack,
    attendance: Number(raw.attendance) || 0,
    readiness: Number(raw.readiness) || 0,
    readinessSource: raw.readinessSource === "manual" ? "manual" : "checklist",
    profilePhoto: typeof raw.profilePhoto === "string" ? raw.profilePhoto : "",
    checklist: checklist,
    taskSteps: taskSteps,
    taskNotes: taskNotes,
    completedAt: completedAt,
    taskFiles: taskFiles,
    activity: activity.slice(0, MAX_ACTIVITY_ITEMS),
    contentVersion: CONTENT_VERSION
  };
}

// FUTURE BACKEND: replace with a "get all users" API call (or remove entirely).
function getUsers() {
  let users = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS));
    if (Array.isArray(parsed)) {
      users = parsed.map(normalizeUser).filter(function (u) { return u !== null; });
    }
  } catch (error) {
    users = []; // empty, corrupted or blocked storage: start fresh
  }
  return users;
}

// Returns true if saved, false if the browser refused (e.g. storage full).
function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return true;
  } catch (error) {
    return false;
  }
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Adds demo data the first time the portal is opened in a browser.
function seedDemoUsers() {
  if (getUsers().length > 0) { return; }

  const users = [
    // DEMO USER FOR FRONTEND TESTING ONLY
    normalizeUser({
      id: "demo-1",
      name: "Sumit Sharma",
      email: "student@talerang.com",
      username: "sumit",
      password: "123456",
      contentVersion: CONTENT_VERSION,
      batch: PROGRAM_NAME,
      skillTrack: "",
      attendance: 92,
      readiness: 78,
      readinessSource: "manual",
      profilePhoto: "",
      checklist: {
        homework: true, prework: true, wrap: false,
        microInternship: false, resume: false, internshipRequest: false
      },
      taskSteps: {
        homework: [true, true],
        prework: [true],
        wrap: [true, false]
      },
      completedAt: { homework: daysAgo(12), prework: daysAgo(5) },
      activity: [
        { type: "step", text: "Ticked “Log in to the Express Portal and complete Step 1” in WRAP Test", at: daysAgo(1) },
        { type: "complete", text: "Completed Pre-work", at: daysAgo(5) },
        { type: "complete", text: "Completed Homework", at: daysAgo(12) },
        { type: "account", text: "Set up your login", at: daysAgo(20) }
      ]
    }),
    // DEMO USER FOR FRONTEND TESTING ONLY
    // Pre-registered student with NO username/password yet. Use this email
    // in "Existing User" to test the account setup step.
    normalizeUser({
      id: "demo-2",
      name: "Ananya Rao",
      email: "ananya@talerang.com",
      contentVersion: CONTENT_VERSION,
      batch: PROGRAM_NAME,
      skillTrack: "",
      attendance: 85,
      readiness: 0,
      readinessSource: "checklist",
      checklist: { homework: true },
      completedAt: { homework: daysAgo(3) }
    })
  ];
  saveUsers(users);
}

function findUserByEmail(email) {
  const wanted = String(email || "").trim().toLowerCase();
  return getUsers().find(function (u) { return u.email === wanted; }) || null;
}

function isUsernameTaken(username, exceptUserId) {
  const wanted = String(username || "").trim().toLowerCase();
  return getUsers().some(function (u) {
    return u.username.toLowerCase() === wanted && u.id !== exceptUserId;
  });
}

// Saves one changed user back into the list. Returns true if saved.
function saveUser(user) {
  const users = getUsers();
  const index = users.findIndex(function (u) { return u.id === user.id; });
  if (index === -1) { users.push(user); } else { users[index] = user; }
  return saveUsers(users);
}

// Adds an entry to the user's activity feed (does not save by itself).
function addActivity(user, type, text) {
  user.activity.unshift({ type: type, text: text, at: new Date().toISOString() });
  user.activity = user.activity.slice(0, MAX_ACTIVITY_ITEMS);
}

// FUTURE BACKEND: replace with "who is logged in?" (session/token) call.
function getCurrentUser() {
  let email = null;
  try { email = localStorage.getItem(STORAGE_KEY_SESSION); } catch (error) { email = null; }
  if (!email) { return null; }
  return findUserByEmail(email);
}

function saveCurrentUser(email) {
  try { localStorage.setItem(STORAGE_KEY_SESSION, email.trim().toLowerCase()); } catch (error) { /* storage blocked */ }
}

// FUTURE BACKEND: replace with a real login API call.
// Returns { ok: true, user } or { ok: false, error: "message", field: "inputId" }.
function loginUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return { ok: false, field: "loginEmail", error: "There's no account with this email. Check the spelling, or create an account." };
  }
  if (!user.password) {
    return { ok: false, field: "loginEmail", error: "This account doesn't have a login yet. Choose “Set up my login” on the welcome page." };
  }
  if (user.password !== password) {
    return { ok: false, field: "loginPassword", error: "That password doesn't match this email." };
  }
  saveCurrentUser(user.email);
  return { ok: true, user: user };
}

function logoutUser() {
  try { localStorage.removeItem(STORAGE_KEY_SESSION); } catch (error) { /* storage blocked */ }
}

// FUTURE BACKEND: replace with a "register" API call.
// Returns { ok: true, user } or { ok: false, error: "message", field: "inputId" }.
function registerUser(name, email, username, password) {
  if (findUserByEmail(email)) {
    return { ok: false, field: "regEmail", error: "An account with this email already exists. Log in instead." };
  }
  if (isUsernameTaken(username, null)) {
    return { ok: false, field: "regUsername", error: "This username is taken. Choose another." };
  }
  const user = normalizeUser({
    name: name.trim(),
    email: email,
    username: username.trim(),
    password: password,
    batch: NEW_USER_DEFAULTS.batch,
    skillTrack: NEW_USER_DEFAULTS.skillTrack,
    attendance: NEW_USER_DEFAULTS.attendance,
    readiness: NEW_USER_DEFAULTS.readiness,
    readinessSource: "checklist"
  });
  addActivity(user, "account", "Created your account");
  if (!saveUser(user)) {
    return { ok: false, error: "Your browser couldn't save the account. Storage may be full or blocked." };
  }
  saveCurrentUser(user.email);
  return { ok: true, user: user };
}

// Existing-user flow: add username + password to a pre-registered account.
function setUpCredentials(email, username, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return { ok: false, error: "There's no account with this email address." };
  }
  if (isUsernameTaken(username, user.id)) {
    return { ok: false, field: "setupUsername", error: "This username is taken. Choose another." };
  }
  user.username = username.trim();
  user.password = password;
  addActivity(user, "account", "Set up your login");
  if (!saveUser(user)) {
    return { ok: false, error: "Your browser couldn't save the account. Storage may be full or blocked." };
  }
  saveCurrentUser(user.email);
  return { ok: true, user: user };
}

// FUTURE BACKEND: replace with a "change password" API call.
function changePassword(currentPassword, newPassword) {
  const user = getCurrentUser();
  if (!user) { return { ok: false, error: "You're logged out. Log in again." }; }
  if (user.password !== currentPassword) {
    return { ok: false, field: "pwCurrent", error: "Your current password is incorrect." };
  }
  user.password = newPassword;
  addActivity(user, "account", "Changed your password");
  if (!saveUser(user)) { return { ok: false, error: "Your browser couldn't save the new password." }; }
  return { ok: true, user: user };
}

function getChecklist(user) {
  return user.checklist;
}

function saveChecklist(user, checklist) {
  user.checklist = checklist;
  user.readiness = calculateReadinessScore(user);
  return saveUser(user);
}

// Marks one checklist task as done/not done and saves it.
function updateChecklistTask(taskKey, isDone) {
  const user = getCurrentUser();
  if (!user || CHECKLIST_KEYS.indexOf(taskKey) === -1) { return null; }
  const checklist = getChecklist(user);
  checklist[taskKey] = isDone;
  user.completedAt[taskKey] = isDone ? new Date().toISOString() : "";
  addActivity(user, isDone ? "complete" : "reopen", (isDone ? "Completed " : "Reopened ") + TASKS[taskKey].title);
  saveChecklist(user, checklist);
  return user;
}

// Ticks one sub-step inside a task.
function updateTaskStep(taskKey, stepIndex, isDone) {
  const user = getCurrentUser();
  if (!user || !user.taskSteps[taskKey]) { return null; }
  user.taskSteps[taskKey][stepIndex] = isDone;
  if (isDone) {
    addActivity(user, "step", "Ticked “" + stepText(TASKS[taskKey].steps[stepIndex]).replace(/\.$/, "") + "” in " + TASKS[taskKey].title);
  }
  saveUser(user);
  return user;
}

// FUTURE BACKEND: replace with a "save note" API call.
function saveTaskNote(taskKey, text) {
  const user = getCurrentUser();
  if (!user || CHECKLIST_KEYS.indexOf(taskKey) === -1) { return false; }
  user.taskNotes[taskKey] = String(text).slice(0, 2000);
  return saveUser(user);
}

// Saves (or removes, with "") the screenshot for a task, and ticks the
// screenshot step to match.
// FUTURE BACKEND: replace with a file upload API call.
function saveTaskScreenshot(taskKey, dataUrl) {
  const user = getCurrentUser();
  if (!user || CHECKLIST_KEYS.indexOf(taskKey) === -1) { return null; }
  user.taskFiles[taskKey] = dataUrl;
  TASKS[taskKey].steps.forEach(function (step, i) {
    if (stepOptions(step).upload) { user.taskSteps[taskKey][i] = Boolean(dataUrl); }
  });
  addActivity(user, "step", (dataUrl ? "Added a screenshot to " : "Removed the screenshot from ") + TASKS[taskKey].title);
  return saveUser(user) ? user : null;
}

// FUTURE BACKEND: replace with a photo upload API call.
function saveProfilePhoto(dataUrl) {
  const user = getCurrentUser();
  if (!user) { return false; }
  user.profilePhoto = dataUrl;
  return saveUser(user);
}

// Everything about the user except the password, for "Download my data".
function exportUserData(user) {
  const copy = JSON.parse(JSON.stringify(user));
  delete copy.password;
  copy.readinessScore = calculateReadinessScore(user);
  copy.exportedAt = new Date().toISOString();
  return copy;
}

// Display preferences (theme). Kept separate from user accounts.
function getPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function savePreferences(prefs) {
  try { localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs)); } catch (error) { /* storage blocked */ }
}


/* =========================================================
   4. READINESS SCORE (one place only)
   ========================================================= */

// Returns a number from 0 to 100.
// FUTURE BACKEND: this score should eventually come from Talerang's systems.
function calculateReadinessScore(user) {
  const useChecklist = USE_CHECKLIST_SCORE_FOR_EVERYONE || user.readinessSource === "checklist";
  if (!useChecklist) {
    return user.readiness; // manually assigned score (e.g. demo user's 78)
  }
  return Math.round((countDone(user) / CHECKLIST_KEYS.length) * 100);
}

function countDone(user) {
  return CHECKLIST_KEYS.filter(function (key) { return user.checklist[key]; }).length;
}

// The first task in order that isn't complete yet (or null when all done).
function getNextTaskKey(user) {
  return CHECKLIST_KEYS.find(function (key) { return !user.checklist[key]; }) || null;
}

function subStepProgress(user, key) {
  const steps = user.taskSteps[key] || [];
  return { done: steps.filter(Boolean).length, total: steps.length };
}


/* =========================================================
   5. SMALL UI HELPERS
   ========================================================= */

function byId(id) { return document.getElementById(id); }

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
  return el;
}

function iconSvg(name) {
  const svg = svgEl("svg", { "class": "icon", "aria-hidden": "true" });
  svg.appendChild(svgEl("use", { href: "#i-" + name }));
  return svg;
}

function showMessage(id, text, isOk) {
  const element = byId(id);
  element.textContent = text || "";
  element.classList.toggle("ok", Boolean(isOk));
}

// Shows an error, marks the field as invalid and moves focus to it.
function fail(messageId, fieldId, text) {
  showMessage(messageId, text);
  if (fieldId && byId(fieldId)) {
    byId(fieldId).setAttribute("aria-invalid", "true");
    byId(fieldId).focus();
  }
}

function clearFormState(form) {
  form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
  form.querySelectorAll(".form-message").forEach(function (m) { m.textContent = ""; });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) { return ""; }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) { return ""; }
  const seconds = Math.round((then - Date.now()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (let i = 0; i < units.length; i++) {
    if (Math.abs(seconds) >= units[i][1]) {
      return rtf.format(Math.round(seconds / units[i][1]), units[i][0]);
    }
  }
  return "just now";
}

// Fills a round avatar with the user's photo, or their first initial.
function renderAvatar(element, user) {
  element.textContent = "";
  if (user.profilePhoto) {
    const img = document.createElement("img");
    img.src = user.profilePhoto;
    img.alt = "Profile photo of " + user.name;
    element.appendChild(img);
  } else {
    element.textContent = user.name.trim().charAt(0).toUpperCase() || "?";
    element.setAttribute("aria-hidden", "true");
  }
}

// Small message in the bottom corner that disappears by itself.
function toast(text) {
  const box = document.createElement("div");
  box.className = "toast";
  box.appendChild(iconSvg("check"));
  const span = document.createElement("span");
  span.textContent = text;
  box.appendChild(span);
  byId("toasts").appendChild(box);
  setTimeout(function () {
    box.classList.add("leaving");
    setTimeout(function () { box.remove(); }, 300);
  }, 3200);
}

// Password strength: 0 (empty) to 3 (strong). Simple rules, for guidance only.
function passwordStrength(password) {
  if (!password) { return { level: 0, text: "" }; }
  if (password.length < 6) { return { level: 1, text: "Too short. Use at least 6 characters." }; }
  let variety = 0;
  if (/[a-z]/.test(password)) { variety++; }
  if (/[A-Z]/.test(password)) { variety++; }
  if (/[0-9]/.test(password)) { variety++; }
  if (/[^A-Za-z0-9]/.test(password)) { variety++; }
  if (password.length >= 10 && variety >= 3) { return { level: 3, text: "Strong" }; }
  if (password.length >= 8 && variety >= 2) { return { level: 2, text: "Okay. Longer, with numbers or symbols, is stronger." }; }
  return { level: 1, text: "Weak. Add more characters, numbers or symbols." };
}

function renderStrength(input) {
  const target = byId(input.dataset.strength);
  const result = passwordStrength(input.value);
  target.dataset.level = String(result.level);
  target.textContent = "";
  if (!result.level) { return; }
  const bar = document.createElement("span");
  bar.className = "strength-bar";
  bar.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) { bar.appendChild(document.createElement("span")); }
  const label = document.createElement("span");
  label.textContent = result.text;
  target.appendChild(bar);
  target.appendChild(label);
}

// Adds a show/hide button to every password box.
function enhancePasswordFields() {
  document.querySelectorAll('input[type="password"]').forEach(function (input) {
    const wrap = document.createElement("div");
    wrap.className = "password-field";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button reveal";
    button.setAttribute("aria-label", "Show password");
    button.setAttribute("aria-pressed", "false");
    button.appendChild(iconSvg("eye"));
    button.addEventListener("click", function () {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(show));
      button.querySelector("use").setAttribute("href", show ? "#i-eye-off" : "#i-eye");
    });
    wrap.appendChild(button);

    if (input.dataset.strength) {
      input.addEventListener("input", function () { renderStrength(input); });
    }
  });
}

// Light / dark theme. Follows the device setting until the user picks one.
function currentTheme() {
  const prefs = getPreferences();
  if (prefs.theme === "dark" || prefs.theme === "light") { return prefs.theme; }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme() {
  const theme = currentTheme();
  document.documentElement.setAttribute("data-theme", theme);
  const next = theme === "dark" ? "light" : "dark";
  document.querySelectorAll(".theme-toggle").forEach(function (button) {
    button.setAttribute("aria-label", "Switch to " + next + " theme");
    button.querySelector("use").setAttribute("href", theme === "dark" ? "#i-sun" : "#i-moon");
    const label = button.querySelector(".theme-label");
    if (label) { label.textContent = next === "dark" ? "Dark theme" : "Light theme"; }
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) { meta.setAttribute("content", theme === "dark" ? "#121335" : "#222262"); }
}

function toggleTheme() {
  const prefs = getPreferences();
  prefs.theme = currentTheme() === "dark" ? "light" : "dark";
  savePreferences(prefs);
  applyTheme();
}


/* =========================================================
   6. JOURNEY PATH
   The red swoosh from the Talerang logo, drawn as the path
   through the checklist steps. Re-drawn when the window resizes.
   mode "hero": the welcome page (no user, animated once)
   mode "user": the dashboard (stops are links to each task)
   ========================================================= */

function drawJourney(container, mode, user) {
  const width = container.clientWidth;
  if (!width) { return; }
  // Wide screens get labels and a taller curve; narrow screens a flatter one
  // with smaller stops, so the stops never crowd together.
  const showLabels = width >= 600;
  const height = showLabels ? 230 : 96;
  const pad = showLabels ? 26 : 18;
  const yLow = showLabels ? height - 76 : height - 22;
  const yHigh = showLabels ? 34 : 24;
  const r = showLabels ? 18 : 14;

  container.textContent = "";
  const svg = svgEl("svg", { viewBox: "0 0 " + width + " " + height, width: width, height: height });
  if (mode === "hero") { svg.setAttribute("aria-hidden", "true"); }
  else { svg.setAttribute("role", "group"); svg.setAttribute("aria-label", "Your journey through " + CHECKLIST_KEYS.length + " steps"); }

  // A rising swoosh: flat at the start, sweeping upward towards the internship.
  const d = "M " + pad + " " + yLow +
    " C " + (width * 0.42) + " " + (yLow + 10) + ", " +
    (width * 0.74) + " " + (yLow - (yLow - yHigh) * 0.3) + ", " +
    (width - pad) + " " + yHigh;

  const base = svgEl("path", { d: d, "class": "path-base" });
  svg.appendChild(base);
  const total = base.getTotalLength();
  const margin = 2;
  const positions = CHECKLIST_KEYS.map(function (_, i) {
    const len = margin + (total - margin * 2) * (i / (CHECKLIST_KEYS.length - 1));
    const p = base.getPointAtLength(len);
    return { x: p.x, y: p.y, len: len };
  });

  // The red "done" part of the path.
  const done = svgEl("path", { d: d, "class": "path-done" });
  if (mode === "hero") {
    done.style.setProperty("--len", total);
  } else {
    const nextKey = getNextTaskKey(user);
    const reach = nextKey === null ? total : positions[Math.max(0, CHECKLIST_KEYS.indexOf(nextKey) - 1)].len;
    const visible = nextKey === CHECKLIST_KEYS[0] ? 0 : reach;
    done.setAttribute("stroke-dasharray", visible + " " + (total + 10));
    if (visible === 0) { done.setAttribute("visibility", "hidden"); } // avoids a stray round cap
  }
  svg.appendChild(done);

  const nextKey = user ? getNextTaskKey(user) : null;

  CHECKLIST_KEYS.forEach(function (key, i) {
    const pos = positions[i];
    const state = !user ? "todo" : user.checklist[key] ? "done" : key === nextKey ? "next" : "todo";
    let stop;
    if (mode === "user") {
      stop = svgEl("a", { href: "#/dashboard/task/" + key, "class": "stop " + state, "data-key": key });
      stop.setAttribute("aria-label", "Step " + (i + 1) + ": " + TASKS[key].title + (state === "done" ? ", completed" : state === "next" ? ", up next" : ""));
      stop.addEventListener("click", function () { taskOpenedByClick = true; });
    } else {
      stop = svgEl("g", { "class": "stop" });
      stop.style.setProperty("--delay", (0.25 + i * 0.2) + "s");
    }
    stop.appendChild(svgEl("circle", { "class": "halo", cx: pos.x, cy: pos.y, r: r + 2 }));
    stop.appendChild(svgEl("circle", { "class": "focus-ring", cx: pos.x, cy: pos.y, r: r + 8, fill: "none" }));
    stop.appendChild(svgEl("circle", { "class": "dot", cx: pos.x, cy: pos.y, r: r }));

    const num = svgEl("text", { "class": "num", x: pos.x, y: pos.y + 1 });
    num.textContent = state === "done" ? "✓" : String(i + 1);
    stop.appendChild(num);

    if (showLabels) {
      const label = svgEl("text", { "class": "label", x: pos.x, y: pos.y + 42 });
      TASKS[key].short.forEach(function (line, li) {
        const tspan = svgEl("tspan", { x: pos.x, dy: li === 0 ? 0 : 17 });
        tspan.textContent = line;
        label.appendChild(tspan);
      });
      stop.appendChild(label);
    }
    svg.appendChild(stop);
  });

  container.appendChild(svg);
}

function redrawJourneys() {
  if (!byId("screen-welcome").hidden && !byId("publicArea").hidden) {
    drawJourney(byId("heroJourney"), "hero", null);
  }
  const user = getCurrentUser();
  if (user && !byId("appArea").hidden && !byId("section-dashboard").hidden) {
    drawJourney(byId("dashJourney"), "user", user);
  }
}

// Briefly animates the stop for a task that was just completed.
function celebrateStop(key) {
  const stop = document.querySelector('#dashJourney .stop[data-key="' + key + '"]');
  if (stop) { stop.classList.add("celebrate"); }
}


/* =========================================================
   7. ROUTING
   The URL hash decides what's on screen, so the browser Back
   button works and a refresh keeps you where you were.
     #/welcome  #/existing  #/setup  #/new  #/login
     #/dashboard  #/dashboard/task/<key>  #/profile
   ========================================================= */

const PUBLIC_ROUTES = ["welcome", "existing", "setup", "new", "login"];
const APP_ROUTES = ["dashboard", "profile"];
let emailBeingSetUp = "";      // email carried from Existing User step 1 to step 2
let taskOpenedByClick = false; // true when the task view was opened from within the app

function go(path, replace) {
  const hash = "#/" + path;
  if (replace) {
    history.replaceState(null, "", hash);
  } else if (location.hash !== hash) {
    history.pushState(null, "", hash);
  }
  route(); // runs straight away, so code after go() sees the new screen
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const user = getCurrentUser();
  const name = parts[0] || (user ? "dashboard" : "welcome");

  if (APP_ROUTES.indexOf(name) !== -1) {
    if (!user) { logoutUser(); go("login", true); return; }
    showApp(user);
    showSection(name);
    const taskKey = name === "dashboard" && parts[1] === "task" ? parts[2] : null;
    if (taskKey && TASKS[taskKey]) { openTask(taskKey); } else { hideTask(); }
    return;
  }

  if (PUBLIC_ROUTES.indexOf(name) !== -1) {
    if (user) { go("dashboard", true); return; }
    if (name === "setup" && !emailBeingSetUp) { go("existing", true); return; }
    hideTask();
    showScreen(name);
    return;
  }

  go(user ? "dashboard" : "welcome", true);
}


/* =========================================================
   8. PUBLIC SCREENS
   ========================================================= */

function showScreen(name) {
  byId("appArea").hidden = true;
  byId("publicArea").hidden = false;
  document.querySelectorAll(".screen").forEach(function (screen) {
    screen.hidden = screen.id !== "screen-" + name;
  });
  document.querySelectorAll("#publicArea form").forEach(clearFormState);
  byId("headerLogin").hidden = name === "login";
  window.scrollTo(0, 0);
  if (name === "welcome") {
    drawJourney(byId("heroJourney"), "hero", null);
  } else {
    const firstInput = document.querySelector("#screen-" + name + " input");
    if (firstInput) { firstInput.focus(); }
  }
}

// Existing User, step 1: check the email.
function handleExistingSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const email = byId("existingEmail").value.trim();
  if (!isValidEmail(email)) {
    fail("existingMessage", "existingEmail", "Enter an email address like name@college.edu.");
    return;
  }
  const user = findUserByEmail(email);
  if (!user) {
    fail("existingMessage", "existingEmail", "There's no Talerang account with this email. Check the spelling, or create a new account.");
    return;
  }
  if (user.password) {
    // Already has a login, so send them to Login instead of overwriting it.
    go("login");
    byId("loginEmail").value = user.email;
    showMessage("loginMessage", "This account already has a login. Enter your password.", true);
    byId("loginPassword").focus();
    return;
  }
  emailBeingSetUp = user.email;
  byId("setupIntro").textContent = "Welcome, " + firstName(user.name) + ". Choose a username and password for " + user.email + ".";
  go("setup");
}

// Existing User, step 2: choose username + password.
function handleSetupSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const username = byId("setupUsername").value.trim();
  const password = byId("setupPassword").value;
  const confirm = byId("setupConfirm").value;

  if (!emailBeingSetUp) { go("existing"); return; }
  if (!username) { fail("setupMessage", "setupUsername", "Enter a username."); return; }
  if (password.length < 6) { fail("setupMessage", "setupPassword", "Use a password with at least 6 characters."); return; }
  if (password !== confirm) { fail("setupMessage", "setupConfirm", "The two passwords don't match."); return; }

  const result = setUpCredentials(emailBeingSetUp, username, password);
  if (!result.ok) { fail("setupMessage", result.field, result.error); return; }
  emailBeingSetUp = "";
  event.target.reset();
  renderStrength(byId("setupPassword"));
  toast("Your login is set up");
  go("dashboard");
}

// New User registration.
function handleRegisterSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const name = byId("regName").value.trim();
  const email = byId("regEmail").value.trim();
  const username = byId("regUsername").value.trim();
  const password = byId("regPassword").value;
  const confirm = byId("regConfirm").value;

  if (!name) { fail("registerMessage", "regName", "Enter your full name."); return; }
  if (!isValidEmail(email)) { fail("registerMessage", "regEmail", "Enter an email address like name@college.edu."); return; }
  if (!username) { fail("registerMessage", "regUsername", "Choose a username."); return; }
  if (password.length < 6) { fail("registerMessage", "regPassword", "Use a password with at least 6 characters."); return; }
  if (password !== confirm) { fail("registerMessage", "regConfirm", "The two passwords don't match."); return; }

  const result = registerUser(name, email, username, password);
  if (!result.ok) { fail("registerMessage", result.field, result.error); return; }
  event.target.reset();
  renderStrength(byId("regPassword"));
  toast("Account created");
  go("dashboard");
}

// Login.
function handleLoginSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const email = byId("loginEmail").value.trim();
  const password = byId("loginPassword").value;
  if (!email) { fail("loginMessage", "loginEmail", "Enter your email."); return; }
  if (!password) { fail("loginMessage", "loginPassword", "Enter your password."); return; }
  const result = loginUser(email, password);
  if (!result.ok) { fail("loginMessage", result.field, result.error); return; }
  event.target.reset();
  go("dashboard");
}


/* =========================================================
   9. DASHBOARD
   ========================================================= */

let checklistFilter = "all";
let ringHasAnimated = false;
let pendingCelebration = null; // task key to animate on the next dashboard draw

function showApp(user) {
  byId("publicArea").hidden = true;
  byId("appArea").hidden = false;
  renderSidebar(user);
}

function showSection(name) {
  const user = getCurrentUser();
  const changed = byId("section-" + name).hidden;
  byId("section-dashboard").hidden = name !== "dashboard";
  byId("section-profile").hidden = name !== "profile";
  document.querySelectorAll(".nav-item[data-section]").forEach(function (link) {
    const active = link.dataset.section === name;
    link.classList.toggle("active", active);
    if (active) { link.setAttribute("aria-current", "page"); } else { link.removeAttribute("aria-current"); }
  });
  if (name === "dashboard") { renderDashboard(user); } else { renderProfile(user); }
  closeMenu();
  if (changed) {
    window.scrollTo(0, 0);
    byId("appMain").focus({ preventScroll: true });
  }
}

function renderSidebar(user) {
  renderAvatar(byId("sideAvatar"), user);
  byId("sideName").textContent = user.name;
  byId("sideEmail").textContent = user.email;
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) { return "Good morning,"; }
  if (hour < 17) { return "Good afternoon,"; }
  return "Good evening,";
}

function renderDashboard(user) {
  const score = calculateReadinessScore(user);
  const done = countDone(user);

  byId("dashGreeting").textContent = greetingForNow();
  byId("dashName").textContent = firstName(user.name);
  byId("dashBatchLine").textContent = user.batch + (user.skillTrack ? ", " + user.skillTrack + " track" : "");

  // Readiness ring
  const circumference = 2 * Math.PI * 52;
  const fill = byId("ringFill");
  fill.style.strokeDasharray = String(circumference);
  if (!ringHasAnimated) {
    fill.style.strokeDashoffset = String(circumference);
    fill.getBoundingClientRect(); // forces the start position so the fill animates
    ringHasAnimated = true;
  }
  fill.style.strokeDashoffset = String(circumference * (1 - score / 100));
  byId("ringValue").textContent = score + "%";
  byId("readinessRing").setAttribute("aria-label", "Readiness score " + score + " percent");

  drawJourney(byId("dashJourney"), "user", user);
  if (pendingCelebration) {
    celebrateStop(pendingCelebration);
    pendingCelebration = null;
  }
  renderUpNext(user);

  byId("statAttendance").textContent = user.attendance + "%";
  byId("attendanceMeter").style.width = Math.min(100, user.attendance) + "%";
  byId("statSteps").textContent = done + " of " + CHECKLIST_KEYS.length;
  byId("stepsMeter").style.width = Math.round(done / CHECKLIST_KEYS.length * 100) + "%";
  byId("statBatch").textContent = user.batch;
  byId("statTrack").textContent = user.skillTrack || "Not chosen yet";
  byId("statTrack").classList.toggle("stat-value-quiet", !user.skillTrack);

  renderChecklist(user);
  renderActivity(user);
}

function renderUpNext(user) {
  const box = byId("upNext");
  box.textContent = "";
  const key = getNextTaskKey(user);
  const text = document.createElement("div");

  if (!key) {
    const strong = document.createElement("strong");
    strong.textContent = "All steps complete";
    const p = document.createElement("p");
    p.textContent = "You've finished every step on your career readiness journey.";
    text.appendChild(strong);
    text.appendChild(p);
    box.appendChild(text);
    return;
  }

  const index = CHECKLIST_KEYS.indexOf(key);
  const progress = subStepProgress(user, key);
  const p = document.createElement("p");
  p.textContent = "Up next, step " + (index + 1) + " of " + CHECKLIST_KEYS.length +
    (progress.done ? " (" + progress.done + " of " + progress.total + " done)" : "");
  const strong = document.createElement("strong");
  strong.textContent = TASKS[key].title;
  text.appendChild(p);
  text.appendChild(strong);

  const link = document.createElement("a");
  link.className = "btn btn-accent";
  link.href = "#/dashboard/task/" + key;
  link.textContent = progress.done ? "Continue" : "Start";
  link.setAttribute("aria-label", (progress.done ? "Continue " : "Start ") + TASKS[key].title);
  link.addEventListener("click", function () { taskOpenedByClick = true; });

  box.appendChild(text);
  box.appendChild(link);
}

function renderChecklist(user) {
  const list = byId("checklist");
  list.textContent = "";
  const nextKey = getNextTaskKey(user);
  let shown = 0;

  CHECKLIST_KEYS.forEach(function (key, i) {
    const done = user.checklist[key] === true;
    if ((checklistFilter === "todo" && done) || (checklistFilter === "done" && !done)) { return; }
    shown++;
    const state = done ? "done" : key === nextKey ? "next" : "todo";
    const progress = subStepProgress(user, key);

    const item = document.createElement("li");
    const row = document.createElement("a");
    row.className = "step-row " + state;
    row.href = "#/dashboard/task/" + key;
    row.dataset.task = key;
    row.addEventListener("click", function () { taskOpenedByClick = true; });

    const num = document.createElement("span");
    num.className = "step-num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = done ? "✓" : String(i + 1);

    const body = document.createElement("span");
    const title = document.createElement("span");
    title.className = "step-title";
    title.textContent = TASKS[key].title;
    const meta = document.createElement("span");
    meta.className = "step-meta";
    if (done) {
      meta.textContent = user.completedAt[key] ? "Completed " + formatDate(user.completedAt[key]) : "Completed";
    } else {
      meta.textContent = progress.done + " of " + progress.total + " done";
      const bar = document.createElement("span");
      bar.className = "mini-progress";
      bar.setAttribute("aria-hidden", "true");
      const barFill = document.createElement("span");
      barFill.style.width = Math.round(progress.done / progress.total * 100) + "%";
      bar.appendChild(barFill);
      meta.appendChild(bar);
    }
    body.appendChild(title);
    body.appendChild(meta);

    const action = document.createElement("span");
    action.className = "step-action";
    action.textContent = done ? "View" : progress.done ? "Continue" : "Start";

    row.appendChild(num);
    row.appendChild(body);
    row.appendChild(action);
    item.appendChild(row);
    list.appendChild(item);
  });

  const empty = byId("checklistEmpty");
  empty.hidden = shown > 0;
  empty.textContent = checklistFilter === "done"
    ? "Nothing completed yet. Steps you finish will show up here."
    : "Every step is complete.";
}

function setChecklistFilter(filter) {
  checklistFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(function (b) {
    const active = b.dataset.filter === filter;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  const user = getCurrentUser();
  if (user) { renderChecklist(user); }
}

function renderActivity(user) {
  const list = byId("activityList");
  list.textContent = "";
  if (!user.activity.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Your progress will appear here as you work through your steps.";
    list.appendChild(li);
    return;
  }
  user.activity.slice(0, 6).forEach(function (entry) {
    const li = document.createElement("li");
    if (entry.type === "complete") { li.className = "complete"; }
    li.appendChild(document.createTextNode(entry.text));
    const time = document.createElement("time");
    time.dateTime = entry.at;
    time.title = formatDate(entry.at);
    time.textContent = timeAgo(entry.at);
    li.appendChild(time);
    list.appendChild(li);
  });
}

function handleLogout() {
  logoutUser();
  hideTask();
  closeMenu();
  ringHasAnimated = false;
  toast("You've logged out");
  go("login");
}

// Mobile menu
function closeMenu() {
  byId("sidebar").classList.remove("open");
  byId("scrim").hidden = true;
  byId("menuToggle").setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  const isOpen = byId("sidebar").classList.toggle("open");
  byId("scrim").hidden = !isOpen;
  byId("menuToggle").setAttribute("aria-expanded", String(isOpen));
  if (isOpen) { byId("sidebar").querySelector(".nav-item").focus(); }
}


/* =========================================================
   10. PROFILE
   ========================================================= */

function renderProfile(user) {
  renderAvatar(byId("profAvatar"), user);
  byId("profHeadName").textContent = user.name;
  byId("profHeadEmail").textContent = "@" + user.username;
  byId("removePhotoButton").hidden = !user.profilePhoto;

  byId("profName").value = user.name;
  byId("profUsername").value = user.username;

  // Make sure the user's current skill track exists in the dropdown.
  const select = byId("profTrack");
  const known = !user.skillTrack || Array.prototype.some.call(select.options, function (o) { return o.value === user.skillTrack; });
  if (!known) {
    const option = document.createElement("option");
    option.textContent = user.skillTrack;
    select.appendChild(option);
  }
  select.value = user.skillTrack;

  byId("profEmail").textContent = user.email;
  byId("profBatch").textContent = user.batch;
  byId("profAttendance").textContent = user.attendance + "%";
  byId("profReadiness").textContent = calculateReadinessScore(user) + "%";
}

// Editable profile fields: name, username, skill track.
function handleProfileSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const user = getCurrentUser();
  if (!user) { go("login"); return; }

  const name = byId("profName").value.trim();
  const username = byId("profUsername").value.trim();
  if (!name) { fail("profileMessage", "profName", "Enter your full name."); return; }
  if (!username) { fail("profileMessage", "profUsername", "Enter a username."); return; }
  if (isUsernameTaken(username, user.id)) {
    fail("profileMessage", "profUsername", "This username is taken. Choose another.");
    return;
  }

  const trackChanged = user.skillTrack !== byId("profTrack").value;
  user.name = name;
  user.username = username;
  user.skillTrack = byId("profTrack").value;
  if (trackChanged) {
    addActivity(user, "profile", user.skillTrack ? "Chose the " + user.skillTrack + " track" : "Cleared your skill track");
  }
  if (!saveUser(user)) {
    showMessage("profileMessage", "Your browser couldn't save the changes. Storage may be full.");
    return;
  }
  renderSidebar(user);
  renderProfile(user);
  toast("Changes saved");
}

function handlePasswordSubmit(event) {
  event.preventDefault();
  clearFormState(event.target);
  const current = byId("pwCurrent").value;
  const next = byId("pwNew").value;
  const confirm = byId("pwConfirm").value;
  if (!current) { fail("passwordMessage", "pwCurrent", "Enter your current password."); return; }
  if (next.length < 6) { fail("passwordMessage", "pwNew", "Use a new password with at least 6 characters."); return; }
  if (next === current) { fail("passwordMessage", "pwNew", "Choose a password different from your current one."); return; }
  if (next !== confirm) { fail("passwordMessage", "pwConfirm", "The two new passwords don't match."); return; }

  const result = changePassword(current, next);
  if (!result.ok) { fail("passwordMessage", result.field, result.error); return; }
  event.target.reset();
  renderStrength(byId("pwNew"));
  toast("Password changed");
}

// Reads an image file and returns a smaller JPEG data URL through done(error, dataUrl).
// square = true crops to a centred square of `size`; otherwise the longest side
// is shrunk to at most `size`. Shrinking keeps browser storage small.
function readImageFile(file, size, square, done) {
  if (!file.type || file.type.indexOf("image/") !== 0) {
    done("Choose an image file, such as a JPG or PNG."); return;
  }
  if (file.size > PHOTO_MAX_FILE_BYTES) {
    done("Choose an image smaller than 8 MB."); return;
  }
  const reader = new FileReader();
  reader.onerror = function () { done("This file couldn't be read. Try another image."); };
  reader.onload = function () {
    const img = new Image();
    img.onerror = function () { done("This image couldn't be opened. Try a JPG or PNG."); };
    img.onload = function () {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (square) {
        const side = Math.min(w, h);
        canvas.width = canvas.height = size;
        ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
      } else {
        const scale = Math.min(1, size / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.fillStyle = "#FFFFFF"; // transparent PNGs get a white background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      done(null, canvas.toDataURL("image/jpeg", square ? 0.85 : 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function handlePhotoChosen(input, messageId) {
  const file = input.files && input.files[0];
  input.value = ""; // allows choosing the same file again later
  if (!file) { return; }
  showMessage(messageId, "");
  readImageFile(file, PHOTO_SIZE_PX, true, function (error, dataUrl) {
    if (error) { showMessage(messageId, error); return; }
    if (!saveProfilePhoto(dataUrl)) {
      showMessage(messageId, "Your browser couldn't save this photo. Storage may be full.");
      return;
    }
    const user = getCurrentUser();
    renderSidebar(user);
    renderProfile(user);
    toast("Photo updated");
  });
}

function handleRemovePhoto() {
  if (!saveProfilePhoto("")) { return; }
  const user = getCurrentUser();
  renderSidebar(user);
  renderProfile(user);
  toast("Photo removed");
}

function handleExport() {
  const user = getCurrentUser();
  if (!user) { return; }
  const blob = new Blob([JSON.stringify(exportUserData(user), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "talerang-" + (user.username || "student") + "-data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  toast("Your data is downloading");
}


/* =========================================================
   11. TASK VIEW
   ========================================================= */

let openTaskKey = null;
let noteTimer = null;

function openTask(key) {
  const user = getCurrentUser();
  const task = TASKS[key];
  if (!task || !user) { return; }
  if (openTaskKey === key && !byId("taskModal").hidden) { return; }
  openTaskKey = key;

  const index = CHECKLIST_KEYS.indexOf(key);
  const done = user.checklist[key];
  byId("taskKicker").textContent = "Step " + (index + 1) + " of " + CHECKLIST_KEYS.length +
    (done && user.completedAt[key] ? ", completed " + formatDate(user.completedAt[key]) : done ? ", completed" : "");
  byId("taskTitle").textContent = task.title;
  byId("taskDescription").textContent = task.description;
  byId("taskPlaceholder").textContent = task.note;

  // Main link for the step (Google Classroom, Express Portal), opens in a new tab.
  const linkBox = byId("taskLink");
  linkBox.textContent = "";
  if (task.link) { linkBox.appendChild(externalLink(task.link, "btn btn-secondary btn-small")); }
  linkBox.hidden = !task.link;

  renderTaskSteps(user, key);
  renderStepCount(user, key);

  byId("taskNotes").value = user.taskNotes[key];
  byId("taskNotesStatus").textContent = user.taskNotes[key] ? "Notes are saved in this browser." : "";

  const completeButton = byId("taskCompleteButton");
  completeButton.textContent = done ? "Reopen task" : "Mark as complete";
  completeButton.className = done ? "btn btn-secondary" : "btn btn-primary";

  byId("taskModal").hidden = false;
  document.body.style.overflow = "hidden";
  byId("taskTitle").setAttribute("tabindex", "-1");
  byId("taskTitle").focus();
}

// Builds a link that opens another site in a new tab.
function externalLink(link, className) {
  const a = document.createElement("a");
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = className;
  a.textContent = link.label;
  const hint = document.createElement("span");
  hint.className = "visually-hidden";
  hint.textContent = " (opens in a new tab)";
  a.appendChild(hint);
  return a;
}

// The checklist inside the task view, including links and the screenshot box.
function renderTaskSteps(user, key) {
  const list = byId("taskSteps");
  list.textContent = "";
  TASKS[key].steps.forEach(function (step, i) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = user.taskSteps[key][i];
    const span = document.createElement("span");
    span.textContent = stepText(step);
    label.appendChild(box);
    label.appendChild(span);
    li.appendChild(label);

    if (stepOptions(step).upload) {
      // This step ticks itself when a screenshot is added.
      box.disabled = true;
      box.setAttribute("aria-describedby", "shotHint-" + key);
      li.appendChild(screenshotBox(user, key));
    } else {
      box.addEventListener("change", function () {
        const updated = updateTaskStep(key, i, box.checked);
        if (updated) { renderStepCount(updated, key); renderDashboard(updated); }
      });
    }
    if (stepOptions(step).link) {
      li.appendChild(externalLink(step.link, "step-link"));
    }
    list.appendChild(li);
  });
  renderStepCount(user, key);
}

function screenshotBox(user, key) {
  const wrap = document.createElement("div");
  wrap.className = "shot";
  const file = user.taskFiles[key];

  if (file) {
    const img = document.createElement("img");
    img.src = file;
    img.alt = "Your screenshot for " + TASKS[key].title;
    wrap.appendChild(img);
  }

  const row = document.createElement("div");
  row.className = "button-row";
  const pick = document.createElement("label");
  pick.className = "btn btn-secondary btn-small photo-button";
  pick.appendChild(iconSvg("camera"));
  pick.appendChild(document.createTextNode(file ? "Replace screenshot" : "Add screenshot"));
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.className = "visually-hidden";
  pick.appendChild(input);
  row.appendChild(pick);

  if (file) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-link btn-small";
    remove.textContent = "Remove screenshot";
    remove.addEventListener("click", function () {
      const updated = saveTaskScreenshot(key, "");
      if (updated) { renderTaskSteps(updated, key); renderDashboard(updated); toast("Screenshot removed"); }
    });
    row.appendChild(remove);
  }
  wrap.appendChild(row);

  const hint = document.createElement("p");
  hint.className = "field-note";
  hint.id = "shotHint-" + key;
  hint.textContent = file ? "This item is ticked because a screenshot is added." : "This item ticks itself when you add a screenshot.";
  wrap.appendChild(hint);
  const message = document.createElement("p");
  message.className = "form-message";
  message.setAttribute("role", "alert");
  wrap.appendChild(message);

  input.addEventListener("change", function () {
    const chosen = input.files && input.files[0];
    input.value = "";
    if (!chosen) { return; }
    message.textContent = "Adding screenshot…";
    message.classList.add("ok");
    readImageFile(chosen, SCREENSHOT_MAX_PX, false, function (error, dataUrl) {
      message.classList.remove("ok");
      if (error) { message.textContent = error; return; }
      const updated = saveTaskScreenshot(key, dataUrl);
      if (!updated) {
        message.textContent = "Your browser couldn't save this screenshot. Storage may be full; try a smaller image.";
        return;
      }
      renderTaskSteps(updated, key);
      renderDashboard(updated);
      toast("Screenshot added");
      const again = byId("taskSteps").querySelector(".shot label");
      if (again) { again.focus(); }
    });
  });
  return wrap;
}

function renderStepCount(user, key) {
  const p = subStepProgress(user, key);
  byId("taskStepCount").textContent = p.done + " of " + p.total + " done";
}

// Hides the task view without touching the URL (used by the router).
function hideTask() {
  taskOpenedByClick = false;
  if (byId("taskModal").hidden) { openTaskKey = null; return; }
  flushNote();
  const key = openTaskKey;
  openTaskKey = null;
  byId("taskModal").hidden = true;
  document.body.style.overflow = "";
  // Put focus back on the step the student opened.
  const row = key && document.querySelector('.step-row[data-task="' + key + '"]');
  if (row) { row.focus({ preventScroll: true }); }
}

// Closes the task view by changing the URL back to the dashboard.
function closeTask() {
  if (taskOpenedByClick) {
    taskOpenedByClick = false;
    history.back();
  } else {
    go("dashboard", true);
  }
}

function flushNote() {
  if (noteTimer && openTaskKey) {
    clearTimeout(noteTimer);
    noteTimer = null;
    saveTaskNote(openTaskKey, byId("taskNotes").value);
  }
}

function handleNoteInput() {
  const key = openTaskKey;
  byId("taskNotesStatus").textContent = "Saving…";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(function () {
    noteTimer = null;
    byId("taskNotesStatus").textContent = saveTaskNote(key, byId("taskNotes").value)
      ? "Saved"
      : "Your browser couldn't save this note.";
  }, 500);
}

// FRONTEND PLACEHOLDER — FUTURE BACKEND / EXTERNAL SYSTEM INTEGRATION
// Today this just ticks (or unticks) the task in localStorage.
function toggleOpenTask() {
  if (!openTaskKey) { return; }
  const key = openTaskKey;
  const before = getCurrentUser();
  const nowDone = !before.checklist[key];
  flushNote();
  const user = updateChecklistTask(key, nowDone);
  if (!user) { closeTask(); return; }
  if (nowDone) {
    pendingCelebration = key; // picked up when the dashboard redraws
    toast(countDone(user) === CHECKLIST_KEYS.length ? "All steps complete" : TASKS[key].title + " marked complete");
  } else {
    toast(TASKS[key].title + " reopened");
  }
  closeTask();
}

// Keeps keyboard focus inside the task view while it's open.
function trapFocus(event) {
  if (event.key !== "Tab" || byId("taskModal").hidden) { return; }
  const focusable = byId("taskDialog").querySelectorAll("button, input, textarea, a[href]");
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === byId("taskTitle"))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}


/* =========================================================
   12. START-UP
   ========================================================= */

function init() {
  seedDemoUsers();
  applyTheme();
  enhancePasswordFields();

  byId("existingForm").addEventListener("submit", handleExistingSubmit);
  byId("setupForm").addEventListener("submit", handleSetupSubmit);
  byId("registerForm").addEventListener("submit", handleRegisterSubmit);
  byId("loginForm").addEventListener("submit", handleLoginSubmit);
  byId("profileForm").addEventListener("submit", handleProfileSubmit);
  byId("passwordForm").addEventListener("submit", handlePasswordSubmit);

  // Clear the red outline on a field as soon as the student edits it.
  document.addEventListener("input", function (e) {
    if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) { e.target.removeAttribute("aria-invalid"); }
  });

  byId("fillDemoButton").addEventListener("click", function () {
    byId("loginEmail").value = "student@talerang.com";
    byId("loginPassword").value = "123456";
    byId("loginForm").querySelector('button[type="submit"]').focus();
  });

  byId("profPhotoInput").addEventListener("change", function (e) { handlePhotoChosen(e.target, "profPhotoMessage"); });
  byId("removePhotoButton").addEventListener("click", handleRemovePhoto);
  byId("exportButton").addEventListener("click", handleExport);

  document.querySelectorAll(".filter-btn").forEach(function (b) {
    b.addEventListener("click", function () { setChecklistFilter(b.dataset.filter); });
  });

  byId("logoutButton").addEventListener("click", handleLogout);
  byId("menuToggle").addEventListener("click", toggleMenu);
  byId("scrim").addEventListener("click", closeMenu);
  document.querySelectorAll(".theme-toggle").forEach(function (b) { b.addEventListener("click", toggleTheme); });
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) { mq.addEventListener("change", applyTheme); }
  }

  byId("taskCompleteButton").addEventListener("click", toggleOpenTask);
  byId("taskBackButton").addEventListener("click", closeTask);
  byId("taskCloseButton").addEventListener("click", closeTask);
  byId("taskNotes").addEventListener("input", handleNoteInput);
  byId("taskModal").addEventListener("click", function (e) { if (e.target === byId("taskModal")) { closeTask(); } });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (openTaskKey) { closeTask(); }
      else if (byId("sidebar").classList.contains("open")) { closeMenu(); byId("menuToggle").focus(); }
    }
    trapFocus(e);
  });

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redrawJourneys, 120);
  });
  // Redraw once web fonts arrive, since label widths change.
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(redrawJourneys); }

  window.addEventListener("hashchange", route);
  route();
}

init();
