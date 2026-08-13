/* ==========================================================================
   students.js — list, search/filter, add, edit, delete students
   ========================================================================== */

let allStudents = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showFormMsg(text, type) {
  const box = document.getElementById("formMsg");
  box.textContent = text;
  box.className = "form-msg show " + type;
}

function hideFormMsg() {
  document.getElementById("formMsg").className = "form-msg";
}

// ---- Load + render --------------------------------------------------------

async function loadStudents() {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("class", { ascending: true })
    .order("roll_no", { ascending: true });

  const body = document.getElementById("studentsBody");

  if (error) {
    console.error(error);
    body.innerHTML = `<tr class="empty-row"><td colspan="7">Could not load records: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allStudents = data;
  populateClassFilter(data);
  renderTable(data);
}

function populateClassFilter(data) {
  const select = document.getElementById("classFilter");
  const current = select.value;
  const classes = [...new Set(data.map(s => s.class))].sort();
  select.innerHTML = `<option value="">All Classes</option>` +
    classes.map(c => `<option value="${escapeHtml(c)}">Class ${escapeHtml(c)}</option>`).join("");
  select.value = current;
}

function renderTable(data) {
  const body = document.getElementById("studentsBody");

  if (data.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7">No students match. Try a different search, or add a new student.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(s => `
    <tr>
      <td><span class="roll-badge">${escapeHtml(s.roll_no)}</span></td>
      <td>${escapeHtml(s.full_name)}</td>
      <td><span class="class-pill">${escapeHtml(s.class)}${s.section ? "-" + escapeHtml(s.section) : ""}</span></td>
      <td>${escapeHtml(s.gender || "—")}</td>
      <td>${escapeHtml(s.parent_name || "—")}</td>
      <td>${escapeHtml(s.phone || "—")}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const cls = document.getElementById("classFilter").value;

  const filtered = allStudents.filter(s => {
    const matchesQuery = !q ||
      s.full_name.toLowerCase().includes(q) ||
      String(s.roll_no).toLowerCase().includes(q);
    const matchesClass = !cls || s.class === cls;
    return matchesQuery && matchesClass;
  });

  renderTable(filtered);
}

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("classFilter").addEventListener("change", applyFilters);

// ---- Modal -----------------------------------------------------------------

const modal = document.getElementById("studentModal");
const form = document.getElementById("studentForm");

function openAddModal() {
  form.reset();
  document.getElementById("studentId").value = "";
  document.getElementById("modalTitle").textContent = "Add Student";
  document.getElementById("saveBtn").textContent = "Save Student";
  hideFormMsg();
  modal.classList.add("show");
}

function openEditModal(id) {
  const s = allStudents.find(x => x.id === id);
  if (!s) return;
  document.getElementById("studentId").value = s.id;
  document.getElementById("fullName").value = s.full_name || "";
  document.getElementById("rollNo").value = s.roll_no || "";
  document.getElementById("studentClass").value = s.class || "";
  document.getElementById("section").value = s.section || "";
  document.getElementById("gender").value = s.gender || "";
  document.getElementById("dob").value = s.dob || "";
  document.getElementById("parentName").value = s.parent_name || "";
  document.getElementById("phone").value = s.phone || "";
  document.getElementById("address").value = s.address || "";

  document.getElementById("modalTitle").textContent = "Edit Student";
  document.getElementById("saveBtn").textContent = "Update Student";
  hideFormMsg();
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ---- Save (insert or update) ------------------------------------------------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormMsg();

  const id = document.getElementById("studentId").value;
  const payload = {
    full_name: document.getElementById("fullName").value.trim(),
    roll_no: document.getElementById("rollNo").value.trim(),
    class: document.getElementById("studentClass").value.trim(),
    section: document.getElementById("section").value.trim() || null,
    gender: document.getElementById("gender").value || null,
    dob: document.getElementById("dob").value || null,
    parent_name: document.getElementById("parentName").value.trim() || null,
    phone: document.getElementById("phone").value.trim() || null,
    address: document.getElementById("address").value.trim() || null
  };

  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("students").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("students").insert(payload));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = id ? "Update Student" : "Save Student";

  if (error) {
    console.error(error);
    showFormMsg(error.message, "error");
    return;
  }

  closeModal();
  loadStudents();
});

// ---- Delete ------------------------------------------------------------

async function deleteStudent(id) {
  const s = allStudents.find(x => x.id === id);
  if (!s) return;
  const confirmed = confirm(`Remove ${s.full_name} (Roll ${s.roll_no}) from records? This cannot be undone.`);
  if (!confirmed) return;

  const { error } = await supabaseClient.from("students").delete().eq("id", id);
  if (error) {
    alert("Could not delete: " + error.message);
    return;
  }
  loadStudents();
}

// ---- Init ----------------------------------------------------------------

(async function init() {
  await requireSession();
  fillUserBadge();
  loadStudents();
})();
