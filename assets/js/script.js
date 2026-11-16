'use strict';

// 1. Sidebar Toggle Functionality
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener("click", () => {
    const isActive = sidebar.classList.toggle("active");
    sidebarBtn.setAttribute("aria-expanded", String(isActive));
  });
}

// 2. Page Navigation and Routing
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");
const validPageNames = Array.from(pages).map(p => p.dataset.page);
const pageNameForLink = link => link.innerHTML.trim().toLowerCase();
const hashForPage = pageName => `#${pageName.replace(/\s+/g, "-")}`;

const setActivePage = (pageName, shouldScroll = false) => {
  const targetPageName = validPageNames.includes(pageName) ? pageName : "about";

  // Toggle active class on articles
  pages.forEach(page => {
    page.classList.toggle("active", page.dataset.page === targetPageName);
  });

  // Toggle active class on navbar links
  navigationLinks.forEach(link => {
    const linkTarget = pageNameForLink(link);
    link.classList.toggle("active", linkTarget === targetPageName);
    if (linkTarget === targetPageName) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// Listen to Hash Changes for Routing
const handleHashChange = (e) => {
  let hash = window.location.hash.slice(1).toLowerCase();
  try { hash = decodeURIComponent(hash); } catch { hash = ""; }
  const pageName = hash === "rumormill" ? "rumor mill" : hash.replace(/-/g, " ");
  // Only smooth scroll if triggered by user interaction (hashchange event), not initial load
  const isUserNavigation = e && e.type === "hashchange";
  setActivePage(pageName, isUserNavigation);
};

window.addEventListener("hashchange", handleHashChange);
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => handleHashChange());
} else {
  handleHashChange();
}

navigationLinks.forEach(link => {
  link.addEventListener("click", () => {
    const targetPage = pageNameForLink(link);
    history.replaceState(null, "", hashForPage(targetPage));
    setActivePage(targetPage, true);
  });
});

// 3. Light / Dark Theme Management
const themeToggleButton = document.getElementById('theme-toggle-btn');

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('light-theme', theme === 'light');
};

if (themeToggleButton) {
  themeToggleButton.addEventListener('click', () => {
    const isCurrentlyLight = document.documentElement.classList.contains('light-theme');
    const nextTheme = isCurrentlyLight ? 'dark' : 'light';
    applyTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  });
}

// Listen for system theme changes if user hasn't set manual preference
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    applyTheme(e.matches ? 'light' : 'dark');
  }
});

// 4. Show scrollbar only when scrolling
let scrollTimeout;
window.addEventListener('scroll', () => {
  document.documentElement.classList.add('is-scrolling');
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    document.documentElement.classList.remove('is-scrolling');
  }, 1000);
}, { passive: true });

// Automatically close mobile contact tray when resizing to desktop
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1250 && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    sidebarBtn?.setAttribute("aria-expanded", "false");
  }
});

// 5. Astro Rumor Mill — Google Sheets / Apps Script backend
const RUMOR_API_URL = "https://script.google.com/macros/s/AKfycbyGMJWhiEwtrLVhANWpn5HPAoq3UnxPllA06ffRnpctuIvoi5HpPSOoRL4nGq8WLOb7/exec";

(() => {
  const tableBody = document.getElementById("rumor-table-body");
  if (!tableBody) return;

  const demoMode = RUMOR_API_URL === "REPLACE_WITH_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
  const categories = ["Postdoc", "Faculty"];
  const statuses = ["Ad Posted", "Shortlist / Reference Req", "Interviews", "Offer Made", "Offer Accepted"];
  const categoryButtons = document.querySelectorAll("[data-rumor-category]");
  const statusFilter = document.getElementById("rumor-status-filter");
  const searchInput = document.getElementById("rumor-search");
  const refreshButton = document.getElementById("rumor-refresh");
  const sortButton = document.getElementById("rumor-sort-updated");
  const feedback = document.getElementById("rumor-feedback");
  const count = document.getElementById("rumor-count");
  const dialog = document.getElementById("rumor-dialog");
  const form = document.getElementById("rumor-form");
  const fields = form.elements;
  const submitButton = document.getElementById("rumor-submit");
  const cancelButton = document.getElementById("rumor-cancel");
  const formFeedback = document.getElementById("rumor-form-feedback");
  const characterCount = document.getElementById("rumor-character-count");
  let rows = [];
  let categoryFilter = "All";
  let newestFirst = true;
  let editingRow = null;
  let submitting = false;
  let loading = false;
  let requestVersion = 0;

  // These are fictional UI examples, never claims about the named institutions.
  const demoRows = [
    {
      institution: "NASA Hubble Fellowship", category: "Postdoc", deadline: "2026-11-05",
      jobUrl: "https://jobregister.aas.org/", status: "Shortlist / Reference Req",
      rumors: "[2026-11-06] Demo only: applications received.\n[2026-11-14] Demo only: reference requests sent.", updated: "2026-11-14"
    },
    {
      institution: "Jansky Fellowship", category: "Postdoc", deadline: "2026-11-01",
      jobUrl: "", status: "Ad Posted",
      rumors: "[2026-11-12] Demo only: fellowship advertisement listed; no verified updates.", updated: "2026-11-12"
    },
    {
      institution: "Steward Observatory — Assistant Professor", category: "Faculty", deadline: "2026-10-15",
      jobUrl: "", status: "Interviews",
      rumors: "[2026-11-10] Demo only: Zoom interview invitations sent.", updated: "2026-11-10"
    },
    {
      institution: "Carnegie Observatories Fellowship", category: "Postdoc", deadline: "2026-10-01",
      jobUrl: "", status: "Offer Made",
      rumors: "[2026-11-08] Demo only: an offer was reported. All dates and statuses here are fictional.", updated: "2026-11-08"
    }
  ];

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const safeJobUrl = value => {
    try {
      const url = new URL(String(value).trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };

  const dateOnly = value => /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(value)) ? String(value).slice(0, 10) : "";
  const normalizeRow = row => {
    if (!row || typeof row !== "object") throw new Error("Invalid row from the tracker.");
    const read = (key, header) => String(row[key] ?? row[header] ?? "").trim();
    const result = {
      institution: read("institution", "Institution"), category: read("category", "Category"),
      deadline: dateOnly(read("deadline", "Deadline")), jobUrl: safeJobUrl(read("jobUrl", "JobUrl")),
      status: read("status", "Status"), rumors: read("rumors", "Rumors"), updated: dateOnly(read("updated", "Updated"))
    };
    if (!result.institution || !categories.includes(result.category)) throw new Error("Invalid row from the tracker.");
    return result;
  };
  const rowKey = row => `${row.institution.trim().toLowerCase()}\u0000${row.category.toLowerCase()}`;
  const showMessage = (element, message, state = "") => {
    element.textContent = message;
    element.dataset.state = state;
  };

  const renderRows = () => {
    const query = searchInput.value.trim().toLowerCase();
    const visibleRows = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
      (categoryFilter === "All" || row.category === categoryFilter) &&
      (!statusFilter.value || row.status === statusFilter.value) &&
      [row.institution, row.status, row.rumors].some(value => value.toLowerCase().includes(query))
    ).sort((a, b) => {
      const dateOrder = a.row.updated.localeCompare(b.row.updated);
      return (newestFirst ? -dateOrder : dateOrder) || a.row.institution.localeCompare(b.row.institution);
    });

    count.textContent = `${visibleRows.length} of ${rows.length} ${rows.length === 1 ? "position" : "positions"}`;
    if (!visibleRows.length) {
      const message = loading ? "Loading the latest rumors…" : rows.length ? "No positions match these filters." : "No positions yet. Add the first job or rumor.";
      tableBody.innerHTML = `<tr><td class="rumor-empty" colspan="7">${message}</td></tr>`;
      return;
    }
    tableBody.innerHTML = visibleRows.map(({ row, index }) => {
      const statusClass = row.status.startsWith("Offer") ? "offer" : ["Interviews", "Shortlist / Reference Req"].includes(row.status) ? "progress" : "posted";
      const jobLink = row.jobUrl ? `<a class="rumor-job-link" href="${escapeHtml(row.jobUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open job ad for ${escapeHtml(row.institution)}"><ion-icon name="open-outline" aria-hidden="true"></ion-icon></a>` : "";
      return `<tr>
        <th scope="row"><div class="rumor-institution">${escapeHtml(row.institution)}${jobLink}</div></th>
        <td>${escapeHtml(row.category)}</td>
        <td>${row.deadline ? `<time datetime="${escapeHtml(row.deadline)}">${escapeHtml(row.deadline)}</time>` : "—"}</td>
        <td><span class="rumor-status rumor-status-${statusClass}">${escapeHtml(row.status)}</span></td>
        <td><div class="rumor-log">${escapeHtml(row.rumors)}</div></td>
        <td>${row.updated ? `<time datetime="${escapeHtml(row.updated)}">${escapeHtml(row.updated)}</time>` : "—"}</td>
        <td><button type="button" class="rumor-row-update" data-rumor-update="${index}" aria-label="Update ${escapeHtml(row.institution)}">+ Update</button></td>
      </tr>`;
    }).join("");
  };

  const requestApi = async (options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      // text/plain on POST keeps this a simple CORS request (no OPTIONS preflight).
      const response = await fetch(RUMOR_API_URL, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error("The tracker returned an HTTP error.");
      return await response.json();
    } finally { clearTimeout(timeout); }
  };

  const loadRows = async () => {
    if (loading || submitting) return;
    const version = ++requestVersion;
    loading = true;
    refreshButton.disabled = true;
    tableBody.setAttribute("aria-busy", "true");
    showMessage(feedback, "Loading the latest rumors…");
    renderRows();
    try {
      if (demoMode) {
        if (!rows.length) rows = demoRows.map(row => ({ ...row }));
      } else {
        const data = await requestApi();
        if (version !== requestVersion) return;
        if (!Array.isArray(data)) throw new Error("The tracker did not return a list of positions.");
        rows = data.map(normalizeRow);
      }
      showMessage(feedback, demoMode ? "Demo ready. Changes stay in this tab until you reload." : "Tracker refreshed.");
    } catch {
      if (version !== requestVersion) return;
      showMessage(feedback, "Could not load the tracker. Please try Refresh. Any previously loaded entries are still shown.", "error");
    } finally {
      if (version === requestVersion) {
        loading = false;
        refreshButton.disabled = false;
        tableBody.setAttribute("aria-busy", "false");
        renderRows();
      }
    }
  };

  const openModal = row => {
    editingRow = row ? { ...row } : null;
    form.reset();
    showMessage(formFeedback, "");
    ["institution", "deadline", "jobUrl"].forEach(name => {
      fields[name].value = row ? row[name] : "";
      fields[name].readOnly = Boolean(row);
    });
    fields.category.value = row ? row.category : "Postdoc";
    fields.category.disabled = Boolean(row);
    fields.status.value = row ? row.status : "Ad Posted";
    characterCount.textContent = "0 / 500";
    document.getElementById("rumor-modal-title").textContent = row ? "Update this position" : "Add a job / rumor";
    document.getElementById("rumor-modal-description").textContent = row
      ? "The position details are locked. Your dated update will be appended to its existing log."
      : "Share a job or a brief update. Matching institution names and categories are added to the same log.";
    dialog.showModal();
    document.body.classList.add("rumor-modal-open");
    (row ? fields.status : fields.institution).focus();
  };

  categoryButtons.forEach(button => button.addEventListener("click", () => {
    categoryFilter = button.dataset.rumorCategory;
    categoryButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderRows();
  }));
  statusFilter.addEventListener("change", renderRows);
  searchInput.addEventListener("input", renderRows);
  refreshButton.addEventListener("click", loadRows);
  sortButton.addEventListener("click", () => {
    newestFirst = !newestFirst;
    document.getElementById("rumor-updated-heading").setAttribute("aria-sort", newestFirst ? "descending" : "ascending");
    sortButton.textContent = `Last Updated ${newestFirst ? "↓" : "↑"}`;
    sortButton.setAttribute("aria-label", `Last Updated, ${newestFirst ? "newest" : "oldest"} first. Reverse sort order`);
    renderRows();
  });
  document.getElementById("rumor-add").addEventListener("click", () => openModal());
  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-rumor-update]");
    if (button) openModal(rows[Number(button.dataset.rumorUpdate)]);
  });
  fields.rumor.addEventListener("input", () => { characterCount.textContent = `${fields.rumor.value.length} / 500`; });
  cancelButton.addEventListener("click", () => { if (!submitting) dialog.close(); });
  dialog.addEventListener("cancel", event => { if (submitting) event.preventDefault(); });
  dialog.addEventListener("close", () => document.body.classList.remove("rumor-modal-open"));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const payload = {
      institution: fields.institution.value.trim(), category: fields.category.value,
      deadline: fields.deadline.value, jobUrl: fields.jobUrl.value.trim(),
      status: fields.status.value, rumor: fields.rumor.value.trim(), website: fields.website.value
    };
    // Use the actual row identity even if a disabled/read-only form control is altered.
    if (editingRow) ["institution", "category", "deadline", "jobUrl"].forEach(name => { payload[name] = editingRow[name]; });
    if (!payload.institution || payload.institution.length > 200 || !payload.rumor || payload.rumor.length > 500) {
      showMessage(formFeedback, "Enter an institution (up to 200 characters) and a rumor (up to 500 characters).", "error");
      return;
    }
    if (!categories.includes(payload.category) || !statuses.includes(payload.status) || payload.website) {
      showMessage(formFeedback, "This submission could not be accepted. Check the form and try again.", "error");
      return;
    }
    if (payload.jobUrl && (payload.jobUrl.length > 2048 || !safeJobUrl(payload.jobUrl))) {
      showMessage(formFeedback, "Use a valid http:// or https:// job ad URL (up to 2048 characters).", "error");
      return;
    }
    if (payload.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(payload.deadline)) {
      showMessage(formFeedback, "Use a deadline in YYYY-MM-DD format.", "error");
      return;
    }

    submitting = true;
    ++requestVersion; // An older GET must not replace the result of this submission.
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    submitButton.disabled = cancelButton.disabled = refreshButton.disabled = true;
    submitButton.textContent = "Submitting...";
    showMessage(formFeedback, "");
    let confirmed = false;
    try {
      let savedRow;
      if (demoMode) {
        const existing = rows.find(row => rowKey(row) === rowKey(payload));
        const now = new Date();
        const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
        const line = `[${today}] ${payload.rumor}`;
        const rumors = existing?.rumors ? `${existing.rumors}\n${line}` : line;
        if (rumors.length > 45000) throw new Error("This position's log is full; contact the site maintainer.");
        savedRow = {
          institution: existing?.institution || payload.institution, category: payload.category,
          deadline: existing?.deadline || payload.deadline, jobUrl: existing?.jobUrl || payload.jobUrl,
          status: payload.status, rumors, updated: today
        };
      } else {
        const result = await requestApi({
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        if (!result || result.success !== true) {
          confirmed = Boolean(result && result.success === false);
          throw new Error(result?.error || "The tracker did not confirm this submission.");
        }
        savedRow = normalizeRow(result.row);
      }
      const index = rows.findIndex(row => rowKey(row) === rowKey(savedRow));
      if (index < 0) rows.push(savedRow);
      else rows[index] = savedRow;
      statusFilter.value = "";
      searchInput.value = "";
      categoryButtons[0].click();
      renderRows();
      dialog.close();
      showMessage(feedback, demoMode ? "Demo update added locally. Reloading the page resets these changes." : "Your anonymous update was added. Thank you.", "success");
    } catch (error) {
      // A lost POST response can follow a successful write: never retry automatically.
      showMessage(formFeedback, demoMode || confirmed ? error.message : "Could not confirm your submission. Copy your text, then Cancel and Refresh to check whether it posted before trying again.", "error");
    } finally {
      submitting = false;
      submitButton.disabled = cancelButton.disabled = refreshButton.disabled = false;
      submitButton.textContent = "Post Anonymously";
    }
  });

  document.getElementById("rumor-demo-notice").hidden = !demoMode;
  loadRows();
})();
