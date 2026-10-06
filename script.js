/* =========================================================
   TALERANG CAREER READINESS PORTAL — FRONTEND PROTOTYPE
   ---------------------------------------------------------
   FRONTEND ONLY. Data is kept in this browser's localStorage.
   This is NOT secure production authentication.

   FILE LAYOUT
   1. Settings
   2. DATA FUNCTIONS (the only place that touches localStorage)
   3. Readiness score
   4. Checklist task content
   5. Small UI helpers
   6. Public screens (welcome, existing user, new user, login)
   7. Dashboard + profile
   8. Task view
   9. Start-up
   ========================================================= */


/* =========================================================
   1. SETTINGS
   ========================================================= */

const STORAGE_KEY_USERS = "talerang_users";
const STORAGE_KEY_SESSION = "currentUserEmail";

// Defaults given to brand-new users. Easy to change later.
const NEW_USER_DEFAULTS = {
  batch: "FCEO",
  skillTrack: "Technology",
  attendance: 0,
  readiness: 0
};

// Readiness: by default a user's readiness is calculated from the checklist
// (completed tasks / 7 x 100) unless the user has a manually assigned score
// (readinessSource = "manual", like the demo user's 78%).
// Set this to true to force checklist-based scores for EVERYONE.
const USE_CHECKLIST_SCORE_FOR_EVERYONE = false;

// The seven checklist items, in display order.
const CHECKLIST_KEYS = [
  "homework", "prework", "wrap", "resume",
  "microInternship", "internshipRequest", "internship"
];


/* =========================================================
   2. DATA FUNCTIONS
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
  if (raw.checklist && typeof raw.checklist === "object") {
    CHECKLIST_KEYS.forEach(function (key) { checklist[key] = raw.checklist[key] === true; });
  }
  return {
    id: raw.id || String(Date.now()) + Math.random().toString(16).slice(2),
    name: String(raw.name || "Student"),
    email: raw.email.trim().toLowerCase(),
    username: String(raw.username || ""),
    password: String(raw.password || ""),
    batch: String(raw.batch || NEW_USER_DEFAULTS.batch),
    skillTrack: String(raw.skillTrack || NEW_USER_DEFAULTS.skillTrack),
    attendance: Number(raw.attendance) || 0,
    readiness: Number(raw.readiness) || 0,
    readinessSource: raw.readinessSource === "manual" ? "manual" : "checklist",
    profilePhoto: typeof raw.profilePhoto === "string" ? raw.profilePhoto : "",
    checklist: checklist
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
    users = []; // empty or corrupted storage: start fresh
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
      batch: "FCEO",
      skillTrack: "Technology",
      attendance: 92,
      readiness: 78,
      readinessSource: "manual",
      profilePhoto: "",
      checklist: {
        homework: true, prework: true, wrap: false, resume: false,
        microInternship: false, internshipRequest: false, internship: false
      }
    }),
    // DEMO USER FOR FRONTEND TESTING ONLY
    // Pre-registered student with NO username/password yet. Use this email
    // in "Existing User" to test the account setup step.
    normalizeUser({
      id: "demo-2",
      name: "Ananya Rao",
      email: "ananya@talerang.com",
      batch: "FCEO",
      skillTrack: "Finance",
      attendance: 85,
      readiness: 0,
      readinessSource: "checklist",
      checklist: { homework: true }
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

// FUTURE BACKEND: replace with "who is logged in?" (session/token) call.
function getCurrentUser() {
  const email = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!email) { return null; }
  return findUserByEmail(email);
}

function saveCurrentUser(email) {
  localStorage.setItem(STORAGE_KEY_SESSION, email.trim().toLowerCase());
}

// FUTURE BACKEND: replace with a real login API call.
// Returns { ok: true, user } or { ok: false, error: "message" }.
function loginUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return { ok: false, error: "We couldn't find an account with this email address." };
  }
  if (!user.password) {
    return { ok: false, error: "This account isn't set up yet. Choose Existing User on the welcome page to set it up." };
  }
  if (user.password !== password) {
    return { ok: false, error: "Incorrect email or password." };
  }
  saveCurrentUser(user.email);
  return { ok: true, user: user };
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEY_SESSION);
}

// FUTURE BACKEND: replace with a "register" API call.
// Returns { ok: true, user } or { ok: false, error: "message" }.
function registerUser(name, email, username, password) {
  if (findUserByEmail(email)) {
    return { ok: false, error: "An account with this email already exists. Try logging in." };
  }
  if (isUsernameTaken(username, null)) {
    return { ok: false, error: "This username is already taken. Please choose another." };
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
  if (!saveUser(user)) {
    return { ok: false, error: "Your browser couldn't save the account (storage may be full or blocked)." };
  }
  saveCurrentUser(user.email);
  return { ok: true, user: user };
}

// Existing-user flow: add username + password to a pre-registered account.
function setUpCredentials(email, username, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return { ok: false, error: "We couldn't find an account with this email address." };
  }
  if (isUsernameTaken(username, user.id)) {
    return { ok: false, error: "This username is already taken. Please choose another." };
  }
  user.username = username.trim();
  user.password = password;
  if (!saveUser(user)) {
    return { ok: false, error: "Your browser couldn't save the account (storage may be full or blocked)." };
  }
  saveCurrentUser(user.email);
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
  saveChecklist(user, checklist);
  return user;
}

// FUTURE BACKEND: replace with a photo upload API call.
function saveProfilePhoto(dataUrl) {
  const user = getCurrentUser();
  if (!user) { return false; }
  user.profilePhoto = dataUrl;
  return saveUser(user);
}


/* =========================================================
   3. READINESS SCORE (one place only)
   ========================================================= */

// Returns a number from 0 to 100.
// FUTURE BACKEND: this score should eventually come from Talerang's systems.
function calculateReadinessScore(user) {
  const useChecklist = USE_CHECKLIST_SCORE_FOR_EVERYONE || user.readinessSource === "checklist";
  if (!useChecklist) {
    return user.readiness; // manually assigned score (e.g. demo user's 78)
  }
  const done = CHECKLIST_KEYS.filter(function (key) { return user.checklist[key]; }).length;
  return Math.round((done / CHECKLIST_KEYS.length) * 100);
}


/* =========================================================
   4. CHECKLIST TASK CONTENT
   FRONTEND PLACEHOLDER — FUTURE BACKEND / EXTERNAL SYSTEM INTEGRATION
   None of these tasks connect to a real Talerang system yet.
   Students simply mark them complete.
   ========================================================= */

const TASKS = {
  homework: {
    title: "Complete Homework",
    description: "Finish the homework assigned in your Talerang programme.",
    steps: ["Open your assigned homework.", "Complete every question.", "Submit it before the deadline."],
    placeholder: "Placeholder: homework is not connected to any Talerang system yet. In future it may be marked complete automatically."
  },
  prework: {
    title: "Complete Pre-work",
    description: "Finish the pre-work that prepares you for your next Talerang session.",
    steps: ["Open your pre-work materials.", "Go through each item.", "Complete any exercises."],
    placeholder: "Placeholder: pre-work is not connected to any Talerang system yet."
  },
  wrap: {
    title: "WRAP Test",
    description: "Complete the WRAP assessment to evaluate your current work-readiness skills.",
    steps: ["Set aside uninterrupted time for the assessment.", "Answer every question honestly.", "Submit the test to see your results."],
    placeholder: "Placeholder: the real WRAP assessment is not integrated. Marking complete here only updates this prototype."
  },
  resume: {
    title: "Build Your Resume",
    description: "Create a clear, professional resume you can use for internship applications.",
    steps: ["Collect your education, projects and experience.", "Write a short summary about yourself.", "Have your resume reviewed."],
    placeholder: "Placeholder: there is no resume builder or review system yet."
  },
  microInternship: {
    title: "Complete Micro-Internship",
    description: "Complete a short, real-world project to practise workplace skills.",
    steps: ["Pick up your micro-internship project.", "Complete the tasks within the given time.", "Submit your work."],
    placeholder: "Placeholder: there is no micro-internship system yet."
  },
  internshipRequest: {
    title: "Request for Internship",
    description: "Tell Talerang you are ready to be matched with an internship.",
    steps: ["Check that your resume is ready.", "Choose the kind of internship you want.", "Send your request."],
    placeholder: "Placeholder: no real internship request is sent. This only updates your checklist."
  },
  internship: {
    title: "Complete Your Internship",
    description: "Finish your internship and record that you have completed it.",
    steps: ["Complete your internship with your host organisation.", "Collect feedback from your supervisor.", "Mark it complete here."],
    placeholder: "Placeholder: internship completion is not tracked by any real system yet."
  }
};


/* =========================================================
   5. SMALL UI HELPERS
   ========================================================= */

function byId(id) { return document.getElementById(id); }

function showMessage(id, text, isOk) {
  const element = byId(id);
  element.textContent = text || "";
  element.classList.toggle("ok", Boolean(isOk));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  }
}


/* =========================================================
   6. PUBLIC SCREENS
   ========================================================= */

let emailBeingSetUp = ""; // email carried from Existing User step 1 to step 2

function showPublicArea() {
  byId("appArea").hidden = true;
  byId("publicArea").hidden = false;
}

function showScreen(name) {
  showPublicArea();
  document.querySelectorAll(".screen").forEach(function (screen) {
    screen.hidden = screen.id !== "screen-" + name;
  });
  document.querySelectorAll(".form-message").forEach(function (m) { m.textContent = ""; });
  window.scrollTo(0, 0);
  const firstInput = document.querySelector("#screen-" + name + " input");
  if (firstInput) { firstInput.focus(); }
}

// Existing User, step 1: check the email.
function handleExistingSubmit(event) {
  event.preventDefault();
  const email = byId("existingEmail").value.trim();
  if (!isValidEmail(email)) {
    showMessage("existingMessage", "Enter a valid email address.");
    return;
  }
  const user = findUserByEmail(email);
  if (!user) {
    showMessage("existingMessage", "We couldn't find an account with this email address.");
    return;
  }
  if (user.password) {
    // Already has a login, so send them to Login instead of overwriting it.
    showScreen("login");
    byId("loginEmail").value = user.email;
    showMessage("loginMessage", "This account is already set up. Please log in.", true);
    return;
  }
  emailBeingSetUp = user.email;
  byId("setupIntro").textContent = "Choose a username and password for " + user.email + ".";
  showScreen("setup");
}

// Existing User, step 2: choose username + password.
function handleSetupSubmit(event) {
  event.preventDefault();
  const username = byId("setupUsername").value.trim();
  const password = byId("setupPassword").value;
  const confirm = byId("setupConfirm").value;

  if (!emailBeingSetUp) { showScreen("existing"); return; }
  if (!username) { showMessage("setupMessage", "Enter a username."); return; }
  if (!password) { showMessage("setupMessage", "Enter a password."); return; }
  if (password.length < 6) { showMessage("setupMessage", "Password must be at least 6 characters."); return; }
  if (password !== confirm) { showMessage("setupMessage", "Passwords do not match."); return; }

  const result = setUpCredentials(emailBeingSetUp, username, password);
  if (!result.ok) { showMessage("setupMessage", result.error); return; }
  emailBeingSetUp = "";
  event.target.reset();
  showApp();
}

// New User registration.
function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = byId("regName").value.trim();
  const email = byId("regEmail").value.trim();
  const username = byId("regUsername").value.trim();
  const password = byId("regPassword").value;
  const confirm = byId("regConfirm").value;

  if (!name || !email || !username || !password || !confirm) {
    showMessage("registerMessage", "Please fill in every field.");
    return;
  }
  if (!isValidEmail(email)) { showMessage("registerMessage", "Enter a valid email address."); return; }
  if (password.length < 6) { showMessage("registerMessage", "Password must be at least 6 characters."); return; }
  if (password !== confirm) { showMessage("registerMessage", "Passwords do not match."); return; }

  const result = registerUser(name, email, username, password);
  if (!result.ok) { showMessage("registerMessage", result.error); return; }
  event.target.reset();
  showApp();
}

// Login.
function handleLoginSubmit(event) {
  event.preventDefault();
  const email = byId("loginEmail").value.trim();
  const password = byId("loginPassword").value;
  if (!email || !password) {
    showMessage("loginMessage", "Enter your email and password.");
    return;
  }
  const result = loginUser(email, password);
  if (!result.ok) { showMessage("loginMessage", result.error); return; }
  event.target.reset();
  showApp();
}


/* =========================================================
   7. DASHBOARD + PROFILE
   ========================================================= */

// Shows the logged-in area. If nobody is logged in, goes to Login instead.
function showApp() {
  const user = getCurrentUser();
  if (!user) {
    logoutUser();
    showScreen("login");
    return;
  }
  byId("publicArea").hidden = true;
  byId("appArea").hidden = false;
  renderDashboard();
  renderProfile();
  showSection("dashboard");
}

function showSection(name) {
  if (!getCurrentUser()) { showScreen("login"); return; }
  byId("section-dashboard").hidden = name !== "dashboard";
  byId("section-profile").hidden = name !== "profile";
  document.querySelectorAll(".nav-item[data-section]").forEach(function (button) {
    button.classList.toggle("active", button.dataset.section === name);
  });
  closeMenu();
  window.scrollTo(0, 0);
}

function renderDashboard() {
  const user = getCurrentUser();
  if (!user) { showScreen("login"); return; }
  const score = calculateReadinessScore(user);

  renderAvatar(byId("dashAvatar"), user);
  byId("dashName").textContent = user.name;
  byId("dashEmail").textContent = user.email;
  byId("dashBatchLine").textContent = "Batch " + user.batch + " | " + user.skillTrack;

  byId("statBatch").textContent = user.batch;
  byId("statTrack").textContent = user.skillTrack;
  byId("statAttendance").textContent = user.attendance + "%";
  byId("statReadiness").textContent = score + "%";

  byId("progressPercent").textContent = score + "%";
  byId("progressFill").style.width = score + "%";
  byId("progressTrack").setAttribute("aria-valuenow", score);

  renderChecklist(user);
}

function renderChecklist(user) {
  const list = byId("checklist");
  list.textContent = "";

  CHECKLIST_KEYS.forEach(function (key) {
    const done = user.checklist[key] === true;
    const item = document.createElement("li");
    item.className = done ? "done" : "";

    const mark = document.createElement("span");
    mark.className = "check-mark";
    mark.textContent = done ? "\u2713" : "";
    mark.setAttribute("aria-hidden", "true");

    const title = document.createElement("span");
    title.className = "check-title";
    title.textContent = TASKS[key].title;

    item.appendChild(mark);
    item.appendChild(title);

    if (done) {
      const status = document.createElement("span");
      status.className = "check-status";
      status.textContent = "Completed";
      item.appendChild(status);
    } else {
      const start = document.createElement("button");
      start.className = "btn btn-primary btn-small check-start";
      start.textContent = "Start";
      start.setAttribute("aria-label", "Start: " + TASKS[key].title);
      start.addEventListener("click", function () { openTask(key); });
      item.appendChild(start);
    }
    list.appendChild(item);
  });
}

function renderProfile() {
  const user = getCurrentUser();
  if (!user) { return; }
  renderAvatar(byId("profAvatar"), user);
  byId("profName").value = user.name;
  byId("profUsername").value = user.username;

  // Make sure the user's current skill track exists in the dropdown.
  const select = byId("profTrack");
  const known = Array.prototype.some.call(select.options, function (o) { return o.value === user.skillTrack; });
  if (!known) {
    const option = document.createElement("option");
    option.textContent = user.skillTrack;
    select.appendChild(option);
  }
  select.value = user.skillTrack;

  byId("profEmail").value = user.email;
  byId("profBatch").value = user.batch;
  byId("profAttendance").value = user.attendance + "%";
  byId("profReadiness").value = calculateReadinessScore(user) + "%";
  showMessage("profileMessage", "");
}

// Editable profile fields: name, username, skill track.
function handleProfileSubmit(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) { showScreen("login"); return; }

  const name = byId("profName").value.trim();
  const username = byId("profUsername").value.trim();
  if (!name) { showMessage("profileMessage", "Name can't be empty."); return; }
  if (!username) { showMessage("profileMessage", "Username can't be empty."); return; }
  if (isUsernameTaken(username, user.id)) {
    showMessage("profileMessage", "This username is already taken. Please choose another.");
    return;
  }

  user.name = name;
  user.username = username;
  user.skillTrack = byId("profTrack").value;
  if (!saveUser(user)) {
    showMessage("profileMessage", "Your browser couldn't save the changes.");
    return;
  }
  renderDashboard();
  renderProfile();
  showMessage("profileMessage", "Profile saved.", true);
}

// Reads a chosen image file, converts it to a data URL (so it survives a
// refresh) and saves it. Used by both photo buttons.
function handlePhotoChosen(input, messageId) {
  const file = input.files && input.files[0];
  input.value = ""; // allows choosing the same file again later
  if (!file) { return; }
  if (!file.type || file.type.indexOf("image/") !== 0) {
    showMessage(messageId, "Please choose an image file (JPG or PNG).");
    return;
  }
  if (file.size > 1024 * 1024) {
    showMessage(messageId, "Please choose an image smaller than 1 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    if (!saveProfilePhoto(reader.result)) {
      showMessage(messageId, "Your browser couldn't save this photo (storage may be full).");
      return;
    }
    showMessage("dashPhotoMessage", "");
    showMessage("profPhotoMessage", "");
    renderDashboard();
    renderProfile();
  };
  reader.onerror = function () { showMessage(messageId, "We couldn't read that file. Try another image."); };
  reader.readAsDataURL(file);
}

function handleLogout() {
  logoutUser();
  closeTask();
  closeMenu();
  showScreen("login");
}

// Mobile menu
function closeMenu() {
  byId("sidebar").classList.remove("open");
  byId("menuToggle").setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  const isOpen = byId("sidebar").classList.toggle("open");
  byId("menuToggle").setAttribute("aria-expanded", String(isOpen));
}


/* =========================================================
   8. TASK VIEW
   ========================================================= */

let openTaskKey = null;

function openTask(key) {
  const task = TASKS[key];
  if (!task || !getCurrentUser()) { return; }
  openTaskKey = key;
  byId("taskTitle").textContent = task.title;
  byId("taskDescription").textContent = task.description;
  byId("taskPlaceholder").textContent = task.placeholder;
  const steps = byId("taskSteps");
  steps.textContent = "";
  task.steps.forEach(function (text) {
    const li = document.createElement("li");
    li.textContent = text;
    steps.appendChild(li);
  });
  byId("taskModal").hidden = false;
  byId("taskCompleteButton").focus();
}

function closeTask() {
  openTaskKey = null;
  byId("taskModal").hidden = true;
}

// FRONTEND PLACEHOLDER — FUTURE BACKEND / EXTERNAL SYSTEM INTEGRATION
// Today this just ticks the task in localStorage.
function completeOpenTask() {
  if (!openTaskKey) { return; }
  updateChecklistTask(openTaskKey, true);
  closeTask();
  renderDashboard();
  renderProfile();
}


/* =========================================================
   9. START-UP
   ========================================================= */

function init() {
  seedDemoUsers();

  // Any button with data-go="screenName" switches screens.
  document.querySelectorAll("[data-go]").forEach(function (button) {
    button.addEventListener("click", function () { showScreen(button.dataset.go); });
  });

  byId("existingForm").addEventListener("submit", handleExistingSubmit);
  byId("setupForm").addEventListener("submit", handleSetupSubmit);
  byId("registerForm").addEventListener("submit", handleRegisterSubmit);
  byId("loginForm").addEventListener("submit", handleLoginSubmit);
  byId("profileForm").addEventListener("submit", handleProfileSubmit);

  byId("dashPhotoInput").addEventListener("change", function (e) { handlePhotoChosen(e.target, "dashPhotoMessage"); });
  byId("profPhotoInput").addEventListener("change", function (e) { handlePhotoChosen(e.target, "profPhotoMessage"); });

  document.querySelectorAll(".nav-item[data-section]").forEach(function (button) {
    button.addEventListener("click", function () { showSection(button.dataset.section); });
  });
  byId("logoutButton").addEventListener("click", handleLogout);
  byId("menuToggle").addEventListener("click", toggleMenu);

  byId("taskCompleteButton").addEventListener("click", completeOpenTask);
  byId("taskBackButton").addEventListener("click", closeTask);
  byId("taskModal").addEventListener("click", function (e) { if (e.target === byId("taskModal")) { closeTask(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openTaskKey) { closeTask(); } });

  // Logged-in already (e.g. page refresh)? Go to dashboard. Otherwise welcome.
  if (getCurrentUser()) {
    showApp();
  } else {
    logoutUser(); // clears a stale session pointing at a missing user
    showScreen("welcome");
  }
}

init();
