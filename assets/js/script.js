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

  // Hide the personal sidebar on the anonymous Rumor Mill page
  document.body.classList.toggle("rumor-mill-mode", targetPageName === "rumor mill");
  if (targetPageName === "rumor mill" && sidebar?.classList.contains("active")) {
    sidebar.classList.remove("active");
    sidebarBtn?.setAttribute("aria-expanded", "false");
  }

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
  let hash = window.location.hash.slice(1);
  try { hash = decodeURIComponent(hash).toLowerCase(); } catch { hash = ""; }
  const pageName = hash === "rumormill" ? "rumor mill" : hash.replace(/-/g, " ");
  // Only smooth scroll if triggered by user interaction (hashchange event), not initial load
  const isUserNavigation = e && e.type === "hashchange";
  setActivePage(pageName, isUserNavigation);
};

window.addEventListener("hashchange", handleHashChange);
// This script loads at the end of <body>, so the pages already exist. Route immediately:
// waiting for DOMContentLoaded breaks when Cloudflare Rocket Loader defers scripts past it.
handleHashChange();

navigationLinks.forEach(link => {
  link.addEventListener("click", () => {
    const targetPage = pageNameForLink(link);
    history.replaceState(null, "", hashForPage(targetPage));
    setActivePage(targetPage, true);
  });
});

// 3. Light / Dark Theme Management
const themeToggleButton = document.getElementById('theme-toggle-btn');

const getStoredTheme = () => {
  try { return localStorage.getItem('theme'); } catch { return null; }
};
let sessionTheme = null;

const getPreferredTheme = () => {
  const savedTheme = sessionTheme || getStoredTheme();
  if (savedTheme) return savedTheme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('light-theme', theme === 'light');
};

// The inline <head> script applies the theme early to avoid a flash, but it can be
// blocked (CSP hash mismatch, script rewriting, storage errors). Apply it again here.
applyTheme(getPreferredTheme());

if (themeToggleButton) {
  themeToggleButton.addEventListener('click', () => {
    const isCurrentlyLight = document.documentElement.classList.contains('light-theme');
    const nextTheme = isCurrentlyLight ? 'dark' : 'light';
    sessionTheme = nextTheme;
    applyTheme(nextTheme);
    try { localStorage.setItem('theme', nextTheme); } catch { /* Theme still works for this visit. */ }
  });
}

// Listen for system theme changes if user hasn't set manual preference
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!sessionTheme && !getStoredTheme()) {
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
  const sortButtons = document.querySelectorAll("[data-rumor-sort]");
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
  let sortKey = "updated";
  let sortDirection = "descending";
  let editingRow = null;
  let submitting = false;
  let loading = false;
  let pendingLoad = Promise.resolve();

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
      const text = String(value).trim();
      if (/[\s\u0000-\u001f\u007f-\u009f\\]/.test(text)) return "";
      if (!/^https?:\/\/[^/?#@]+(?:[/?#]|$)/i.test(text)) return "";
      const url = new URL(text);
      if (!url.hostname.startsWith("[") && !url.hostname.replace(/\.$/, "").split(".").every(label =>
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return "";
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };

  const dateOnly = value => {
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(value))) return "";
    const date = String(value).slice(0, 10);
    const parsed = new Date(`${date}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
  };
  const normalizeRow = row => {
    if (!row || typeof row !== "object") throw new Error("Invalid row from the tracker.");
    const read = (key, header) => String(row[key] ?? row[header] ?? "").trim();
    const result = {
      institution: read("institution", "Institution"),
      category: categories.find(category => category.toLowerCase() === read("category", "Category").toLowerCase()),
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

  const sortOptions = {
    institution: { label: "Institution / Position", ascending: "A to Z", descending: "Z to A" },
    category: { label: "Category", ascending: "A to Z", descending: "Z to A" },
    deadline: { label: "Deadline", ascending: "earliest first", descending: "latest first" },
    status: { label: "Current Status", ascending: "earliest hiring stage first", descending: "latest hiring stage first" },
    rumors: { label: "Rumors & Dated Log", ascending: "by first report, earliest first", descending: "by first report, latest first" },
    updated: { label: "Last Updated", ascending: "earliest first", descending: "latest first" }
  };
  const compareText = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;
  // The log column sorts by the date of its first entry ("[YYYY-MM-DD] ..."), i.e. when the
  // job was first reported; sorting the raw text would order by that date anyway, but opaquely.
  const firstReported = rumors => dateOnly((/^\[(\d{4}-\d{2}-\d{2})\]/.exec(rumors) || [])[1] || "");
  const sortValue = row => sortKey === "rumors" ? firstReported(row.rumors) : row[sortKey];
  const compareRows = (a, b) => {
    const left = sortValue(a.row);
    const right = sortValue(b.row);
    const leftMissing = !left || (sortKey === "status" && !statuses.includes(left));
    const rightMissing = !right || (sortKey === "status" && !statuses.includes(right));
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    const order = leftMissing ? 0 : sortKey === "status"
      ? statuses.indexOf(left) - statuses.indexOf(right)
      : compareText(left, right);
    return (sortDirection === "descending" ? -order : order) ||
      compareText(a.row.institution, b.row.institution) ||
      compareText(a.row.category, b.row.category) || a.index - b.index;
  };
  const updateSortHeaders = () => {
    sortButtons.forEach(button => {
      const key = button.dataset.rumorSort;
      const option = sortOptions[key];
      const active = key === sortKey;
      const nextDirection = active && sortDirection === "ascending" ? "descending" : "ascending";
      const heading = button.closest("th");
      if (active) heading.setAttribute("aria-sort", sortDirection);
      else heading.removeAttribute("aria-sort");
      button.textContent = `${option.label} ${active ? sortDirection === "ascending" ? "↑" : "↓" : "↕"}`;
      button.setAttribute("aria-label", `${option.label}. Sort ${option[nextDirection]}`);
      button.setAttribute("title", `Sort ${option[nextDirection]}`);
    });
  };

  const renderRows = () => {
    const query = searchInput.value.trim().toLowerCase();
    const visibleRows = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
      (categoryFilter === "All" || row.category === categoryFilter) &&
      (!statusFilter.value || row.status === statusFilter.value) &&
      [row.institution, row.status, row.rumors].some(value => value.toLowerCase().includes(query))
    ).sort(compareRows);

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

  const fetchRows = async () => {
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
        if (!Array.isArray(data)) throw new Error("The tracker did not return a list of positions.");
        const validRows = [];
        data.forEach(row => {
          try { validRows.push(normalizeRow(row)); } catch { /* Keep usable entries from a partial import. */ }
        });
        if (data.length && !validRows.length) throw new Error("No valid positions were returned.");
        rows = validRows;
        if (validRows.length < data.length) {
          showMessage(feedback, "Some entries could not be displayed. Please contact the site owner.", "error");
          return;
        }
      }
      showMessage(feedback, demoMode ? "Demo ready. Changes stay in this tab until you reload." : "Tracker refreshed.");
    } catch {
      showMessage(feedback, "Could not load the tracker. Please try Refresh. Any previously loaded entries are still shown.", "error");
    } finally {
      loading = false;
      refreshButton.disabled = submitting;
      tableBody.setAttribute("aria-busy", "false");
      renderRows();
      renderMatches();
    }
  };

  const loadRows = () => {
    if (loading || submitting) return pendingLoad;
    pendingLoad = fetchRows();
    return pendingLoad;
  };

  // Steer "Add New Job" toward existing rows: loose name matching for suggestions only
  // (the server still merges exact institution + category matches on its own).
  const matchesBox = document.getElementById("rumor-matches");
  const ignoredWords = new Set(["the", "of", "and", "for", "in", "at", "de", "a", "an", "position", "positions"]);
  const looseName = value => String(value).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const findMatches = text => {
    const query = looseName(text);
    const words = query.split(" ").filter(word => word.length > 1 && !ignoredWords.has(word));
    if (!words.length || query.length < 3) return [];
    return rows
      .map((row, index) => ({ row, index, name: looseName(row.institution) }))
      .filter(({ name }) => name === query || words.every(word => name.includes(word)))
      .sort((a, b) => (b.name === query) - (a.name === query) || a.name.length - b.name.length)
      .slice(0, 4);
  };
  const renderMatches = () => {
    const matches = editingRow ? [] : findMatches(fields.institution.value);
    matchesBox.hidden = !matches.length;
    matchesBox.innerHTML = matches.length ? `<p><strong>Already listed?</strong> Update the existing entry instead of adding a duplicate:</p>
      <ul>${matches.map(({ row, index }) => `<li><button type="button" class="rumor-row-update" data-rumor-switch="${index}">
        + Update “${escapeHtml(row.institution)}” <span>(${escapeHtml(row.category)})</span></button></li>`).join("")}</ul>` : "";
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
    document.getElementById("rumor-modal-title").textContent = row ? "Update this position" : "Add a new job";
    document.getElementById("rumor-modal-description").textContent = row
      ? "The position details are locked. Your dated update will be appended to its existing log."
      : "Only for jobs that are not in the tracker yet. If it is already listed, use + Update on its row instead.";
    renderMatches();
    if (!dialog.open) dialog.showModal();
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
  sortButtons.forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.rumorSort;
    sortDirection = key === sortKey && sortDirection === "ascending" ? "descending" : "ascending";
    sortKey = key;
    updateSortHeaders();
    renderRows();
  }));
  document.getElementById("rumor-add").addEventListener("click", () => openModal());
  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-rumor-update]");
    if (button) openModal(rows[Number(button.dataset.rumorUpdate)]);
  });
  fields.institution.addEventListener("input", renderMatches);
  matchesBox.addEventListener("click", event => {
    const button = event.target.closest("[data-rumor-switch]");
    if (!button || submitting) return;
    // Carry over the typed message; the status starts from the row's current one so the
    // Add form's default ("Ad Posted") cannot silently downgrade an existing entry.
    const draft = fields.rumor.value;
    openModal(rows[Number(button.dataset.rumorSwitch)]);
    fields.rumor.value = draft;
    characterCount.textContent = `${fields.rumor.value.length} / 500`;
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
    if (payload.deadline && (payload.deadline.length !== 10 || !dateOnly(payload.deadline))) {
      showMessage(formFeedback, "Use a deadline in YYYY-MM-DD format.", "error");
      return;
    }

    submitting = true;
    submitButton.disabled = cancelButton.disabled = refreshButton.disabled = true;
    submitButton.textContent = "Submitting...";
    showMessage(formFeedback, "");
    let confirmed = false;
    try {
      // Finish an in-flight load before writing, so its other positions are preserved.
      // fetchRows handles its own errors, so a failed load does not prevent posting.
      if (loading) await pendingLoad;
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
  updateSortHeaders();
  loadRows();
})();
