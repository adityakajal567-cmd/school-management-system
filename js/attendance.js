/* ==========================================================================
   attendance.js — mark daily attendance for a class, view recent history
   Table: attendance(id, student_id, date, status, marked_by, created_at)
   Unique constraint on (student_id, date) lets Save use an upsert.
   ========================================================================== */

let roster = [];          // students in the currently selected class
let pendingStatus = {};   // { student_id: "Present" | "Absent" | "Late" }
let currentUserId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showAttMsg(text, type) {
  const box = document.getElementById("attMsg");
  box.textContent = text;
  box.className = "form-msg show " + type;
}
function hideAttMsg() {
  document.getElementById("attMsg").className = "form-msg";
}

const dateInput = document.getElementById("attDate");
const classSelect = document.getElementById("attClass");
const saveBtn = document.getElementById("saveAttendanceBtn");
const markAllBtn = document.getElementById("markAllPresentBtn");

// ---- Setup -----------------------------------------------------------

async function init() {
  await requireSession();
  fillUserBadge();

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData.user ? userData.user.id : null;

  dateInput.value = new Date().toISOString().slice(0, 10);

  const { data: students, error } = await supabaseClient
    .from("students")
    .select("class")
    .order("class", { ascending: true });

  if (!error) {
    const classes = [...new Set(students.map(s => s.class))];
    classSelect.innerHTML = `<option value="">Select a class...</option>` +
      classes.map(c => `<option value="${escapeHtml(c)}">Class ${escapeHtml(c)}</option>`).join("");
  }

  classSelect.addEventListener("change", onClassOrDateChange);
  dateInput.addEventListener("change", onClassOrDateChange);
  markAllBtn.addEventListener("click", markAllPresent);
  saveBtn.addEventListener("click", saveAttendance);
}

// ---- Load roster + existing attendance for the class/date ------------

async function onClassOrDateChange() {
  const cls = classSelect.value;
  const date = dateInput.value;
  hideAttMsg();

  if (!cls || !date) {
    document.getElementById("panelHead").textContent = "Select a class and date to begin";
    document.getElementById("attendanceBody").innerHTML =
      `<tr class="empty-row"><td colspan="3">Choose a class above to load its student list.</td></tr>`;
    saveBtn.disabled = true;
    return;
  }

  document.getElementById("panelHead").textContent =
    `Class ${cls} — ${new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`;
  document.getElementById("attendanceBody").innerHTML =
    `<tr class="empty-row"><td colspan="3">Loading roster...</td></tr>`;

  const { data: students, error: studentsError } = await supabaseClient
    .from("students")
    .select("id, full_name, roll_no")
    .eq("class", cls)
    .order("roll_no", { ascending: true });

  if (studentsError) {
    showAttMsg("Could not load students: " + studentsError.message, "error");
    return;
  }

  roster = students;
  pendingStatus = {};

  if (roster.length === 0) {
    document.getElementById("attendanceBody").innerHTML =
      `<tr class="empty-row"><td colspan="3">No students found in this class.</td></tr>`;
    saveBtn.disabled = true;
    return;
  }

  const { data: existing, error: attError } = await supabaseClient
    .from("attendance")
    .select("student_id, status")
    .eq("date", date)
    .in("student_id", roster.map(s => s.id));

  if (attError) {
    showAttMsg(
      "Could not load existing attendance (has the attendance table been created? see README): " + attError.message,
      "error"
    );
  } else {
    existing.forEach(r => { pendingStatus[r.student_id] = r.status; });
  }

  renderRoster();
  saveBtn.disabled = false;
  loadHistory(cls);
}

function renderRoster() {
  const statuses = ["Present", "Absent", "Late"];
  document.getElementById("attendanceBody").innerHTML = roster.map(s => `
    <tr>
      <td><span class="roll-badge">${escapeHtml(s.roll_no)}</span></td>
      <td>${escapeHtml(s.full_name)}</td>
      <td>
        <div class="status-group" data-student="${s.id}">
          ${statuses.map(st => `
            <button type="button" class="status-btn ${pendingStatus[s.id] === st ? "active" : ""}"
              data-status="${st}" onclick="setStatus('${s.id}','${st}')">${st}</button>
          `).join("")}
        </div>
      </td>
    </tr>
  `).join("");
}

function setStatus(studentId, status) {
  pendingStatus[studentId] = status;
  renderRoster();
}

function markAllPresent() {
  if (roster.length === 0) return;
  roster.forEach(s => { pendingStatus[s.id] = "Present"; });
  renderRoster();
}

// ---- Save (bulk upsert) ------------------------------------------------

async function saveAttendance() {
  const date = dateInput.value;
  const marked = roster.filter(s => pendingStatus[s.id]);

  if (marked.length === 0) {
    showAttMsg("Mark at least one student before saving.", "error");
    return;
  }

  const rows = marked.map(s => ({
    student_id: s.id,
    date,
    status: pendingStatus[s.id],
    marked_by: currentUserId
  }));

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("attendance")
    .upsert(rows, { onConflict: "student_id,date" });

  saveBtn.disabled = false;
  saveBtn.textContent = "Save Attendance";

  if (error) {
    showAttMsg(
      "Could not save (has the attendance table been created? see README): " + error.message,
      "error"
    );
    return;
  }

  showAttMsg(`Attendance saved for ${marked.length} student(s).`, "success");
  loadHistory(classSelect.value);
}

// ---- History -------------------------------------------------------------

async function loadHistory(cls) {
  document.getElementById("historyClassLabel").textContent = "Class " + cls;
  const historyBody = document.getElementById("historyBody");
  historyBody.innerHTML = `<tr class="empty-row"><td colspan="4">Loading history...</td></tr>`;

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("date, status, students!inner(full_name, roll_no, class)")
    .eq("students.class", cls)
    .order("date", { ascending: false })
    .limit(60);

  if (error) {
    historyBody.innerHTML =
      `<tr class="empty-row"><td colspan="4">Could not load history: ${escapeHtml(error.message)}</td></tr>`;
    document.getElementById("historySummary").innerHTML = "";
    return;
  }

  if (data.length === 0) {
    historyBody.innerHTML = `<tr class="empty-row"><td colspan="4">No attendance recorded yet for this class.</td></tr>`;
    document.getElementById("historySummary").innerHTML = "";
    return;
  }

  const present = data.filter(r => r.status === "Present").length;
  const pct = Math.round((present / data.length) * 100);
  document.getElementById("historySummary").innerHTML =
    `<span><strong>${data.length}</strong> records (last 60)</span>
     <span><strong>${pct}%</strong> present rate</span>`;

  historyBody.innerHTML = data.map(r => `
    <tr>
      <td>${new Date(r.date + "T00:00:00").toLocaleDateString("en-IN")}</td>
      <td><span class="roll-badge">${escapeHtml(r.students.roll_no)}</span></td>
      <td>${escapeHtml(r.students.full_name)}</td>
      <td><span class="status-tag ${r.status}">${escapeHtml(r.status)}</span></td>
    </tr>
  `).join("");
}

init();
