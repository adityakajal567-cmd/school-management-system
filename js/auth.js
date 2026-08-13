/* ==========================================================================
   auth.js — login / sign up / logout / route guarding
   Used on index.html (auth screen) and included on protected pages to
   redirect back to login if there is no active session.
   ========================================================================== */

// ---- Helpers -------------------------------------------------------------

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = "form-msg show " + type;
}

function hideMsg(el) {
  el.className = "form-msg";
}

// ---- Guard for protected pages (dashboard.html, students.html) ----------

async function requireSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

async function fillUserBadge() {
  const { data } = await supabaseClient.auth.getUser();
  const badge = document.getElementById("userEmail");
  if (badge && data.user) badge.textContent = data.user.email;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// ---- Login / signup screen logic (index.html only) -----------------------

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  if (!loginForm && !signupForm) return; // not on the auth page

  // If already logged in, skip straight to dashboard.
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = "dashboard.html";
  });

  const msgBox = document.getElementById("authMsg");
  const authTitle = document.getElementById("authTitle");
  const authSub = document.getElementById("authSub");
  const toggleBtn = document.getElementById("toggleModeBtn");
  const toggleLine = document.getElementById("toggleLine");

  let mode = "login"; // or "signup"

  function setMode(next) {
    mode = next;
    hideMsg(msgBox);
    if (mode === "login") {
      loginForm.style.display = "block";
      signupForm.style.display = "none";
      authTitle.textContent = "Staff Login";
      authSub.textContent = "Sign in to manage student records";
      toggleLine.textContent = "New staff member?";
      toggleBtn.textContent = "Create an account";
    } else {
      loginForm.style.display = "none";
      signupForm.style.display = "block";
      authTitle.textContent = "Create Staff Account";
      authSub.textContent = "Register to access the management system";
      toggleLine.textContent = "Already have an account?";
      toggleBtn.textContent = "Sign in instead";
    }
  }

  toggleBtn.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msgBox);
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Signing in...";

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = "Sign In";

    if (error) {
      showMsg(msgBox, error.message, "error");
      return;
    }
    window.location.href = "dashboard.html";
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msgBox);
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const fullName = document.getElementById("signupName").value.trim();
    const btn = signupForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Creating account...";

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    btn.disabled = false;
    btn.textContent = "Create Account";

    if (error) {
      showMsg(msgBox, error.message, "error");
      return;
    }

    if (data.session) {
      // Email confirmation is off in the Supabase project -> logged in immediately.
      window.location.href = "dashboard.html";
    } else {
      showMsg(msgBox, "Account created. Check your email to confirm, then sign in.", "success");
      setMode("login");
    }
  });

  setMode("login");
});
