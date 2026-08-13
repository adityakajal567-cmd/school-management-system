/* ==========================================================================
   dashboard.js — stat cards + recently added students
   ========================================================================== */

document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadDashboard() {
  await requireSession();
  fillUserBadge();

  const { data: students, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("recentBody").innerHTML =
      `<tr class="empty-row"><td colspan="5">Could not load records: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  const total = students.length;
  const classes = new Set(students.map(s => s.class)).size;
  const boys = students.filter(s => (s.gender || "").toLowerCase() === "male").length;
  const girls = students.filter(s => (s.gender || "").toLowerCase() === "female").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statClasses").textContent = classes;
  document.getElementById("statBoys").textContent = boys;
  document.getElementById("statGirls").textContent = girls;

  loadTodayAttendance(total);

  const recentBody = document.getElementById("recentBody");
  const recent = students.slice(0, 6);

  if (recent.length === 0) {
    recentBody.innerHTML = `<tr class="empty-row"><td colspan="5">No students added yet. Go to the Students page to add the first record.</td></tr>`;
    return;
  }

  recentBody.innerHTML = recent.map(s => `
    <tr>
      <td><span class="roll-badge">${escapeHtml(s.roll_no)}</span></td>
      <td>${escapeHtml(s.full_name)}</td>
      <td><span class="class-pill">${escapeHtml(s.class)}${s.section ? "-" + escapeHtml(s.section) : ""}</span></td>
      <td>${escapeHtml(s.parent_name || "—")}</td>
      <td>${new Date(s.created_at).toLocaleDateString("en-IN")}</td>
    </tr>
  `).join("");
}

async function loadTodayAttendance(totalStudents) {
  const statEl = document.getElementById("statAttendance");
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("status")
    .eq("date", today);

  if (error) {
    // Table may not exist yet if the SQL from the README hasn't been run.
    statEl.textContent = "—";
    return;
  }

  if (data.length === 0) {
    statEl.textContent = "Not marked";
    statEl.style.fontSize = "18px";
    return;
  }

  const present = data.filter(r => r.status === "Present").length;
  const pct = totalStudents ? Math.round((present / totalStudents) * 100) : 0;
  statEl.textContent = pct + "%";
}

loadDashboard();
