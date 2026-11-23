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
  const targetPageName = validPageNames.includes(pageName) ? pageName : validPageNames[0];

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
  // The Rumor Mill moved to its own indexable page; keep old /#rumor-mill links working.
  if (pageName === "rumor mill" && !validPageNames.includes(pageName)) {
    window.location.replace("/rumor-mill");
    return;
  }
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
  const deadlineFilter = document.getElementById("rumor-deadline-filter");
  const sortSelect = document.getElementById("rumor-sort-select");
  const keepStatusOption = document.getElementById("rumor-status-keep");
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
  const reportDialog = document.getElementById("rumor-report-dialog");
  const reportForm = document.getElementById("rumor-report-form");
  const reportFeedback = document.getElementById("rumor-report-feedback");
  const reportSubmit = document.getElementById("rumor-report-submit");
  const reportCancel = document.getElementById("rumor-report-cancel");
  let reportingRow = null;
  let reportingEntry = "";
  let reporting = false;
  let rows = [];
  let categoryFilter = "All";
  let sortKey = "smart"; // "smart" = recommended order; otherwise a column key from sortOptions
  let sortDirection = "descending";
  let editingRow = null;
  let submitting = false;
  let loading = false;
  let loadFailed = false; // Last load failed; an empty table means "unknown", not "no jobs".
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
  // Last successful load, kept in this browser so the table can show instantly on the next
  // visit while fresh data loads. Purely a convenience: any storage error just skips it.
  const cacheKey = `rumorMillRows:v1:${RUMOR_API_URL}`;
  const cacheMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const readCachedRows = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (!cached || !Array.isArray(cached.rows) || Date.now() - cached.savedAt > cacheMaxAgeMs) return [];
      return cached.rows.flatMap(row => { try { return [normalizeRow(row)]; } catch { return []; } });
    } catch { return []; }
  };
  const saveCachedRows = () => {
    if (demoMode) return;
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), rows })); } catch { /* Storage full or blocked. */ }
  };
  // Same normalization as the server: whitespace runs (incl. line breaks) become one space.
  const singleLine = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const rowKey = row => `${singleLine(row.institution).toLowerCase()}\u0000${row.category.toLowerCase()}`;
  // Entries this browser already reported, so one visitor cannot stack reports on the same entry.
  const reportedKey = "rumorMillReported:v1";
  const readReported = () => { try { return JSON.parse(localStorage.getItem(reportedKey) || "[]"); } catch { return []; } };
  const entryId = (row, entry) => `${rowKey(row)}\u0001${entry}`;
  const markReported = (row, entry) => {
    try { localStorage.setItem(reportedKey, JSON.stringify([...new Set([...readReported(), entryId(row, entry)])].slice(-500))); } catch { /* Not essential. */ }
  };
  // Same rules as the server: rumors are text about a job, not a place for contact details or links.
  const rumorTextProblem = text => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) || /(^|[\s(])@[a-z0-9_]{2,}/i.test(text) ||
    /(https?:\/\/|www\.)\S+/i.test(text) || /\b[a-z0-9-]+\.(com|org|net|edu|gov|io|ac\.[a-z]{2}|co\.[a-z]{2})\b/i.test(text) ||
    /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]\d{3,4}/.test(text)
    ? "Please keep rumors free of links, email addresses, phone numbers and @handles. Put the job ad link in the Job URL field." : "";
  // AAS Job Register ads have a stable id (aas.org/jobregister/ad/<id>); the same id is the same job.
  const adId = url => (/^https?:\/\/(?:www\.|jobregister\.)?aas\.org\/(?:jobregister\/)?ad\/([a-z0-9]+)\/?(?:[?#].*)?$/i.exec(String(url || "").trim()) || [])[1]?.toLowerCase() || "";
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
  const localDate = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const todayString = () => localDate(new Date());
  const daysFromToday = days => { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); };
  // Recommended order: jobs with a dated update (newest first), then upcoming deadlines (soonest
  // first), then jobs with no deadline, then passed deadlines (most recent first).
  const smartGroup = (row, today) => row.updated ? 0 : !row.deadline ? 2 : row.deadline >= today ? 1 : 3;
  const compareSmart = (a, b, today) => {
    const groupA = smartGroup(a.row, today);
    const groupB = smartGroup(b.row, today);
    if (groupA !== groupB) return groupA - groupB;
    const first = groupA === 0 ? b.row.updated.localeCompare(a.row.updated)
      : groupA === 1 ? a.row.deadline.localeCompare(b.row.deadline)
      : groupA === 3 ? b.row.deadline.localeCompare(a.row.deadline) : 0;
    return first || compareText(a.row.institution, b.row.institution) ||
      compareText(a.row.category, b.row.category) || a.index - b.index;
  };
  const matchesDeadline = (row, filter, today) => {
    if (!filter) return true;
    if (filter === "none") return !row.deadline;
    if (!row.deadline) return false;
    if (filter === "passed") return row.deadline < today;
    return row.deadline >= today && row.deadline <= daysFromToday(Number(filter));
  };
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
    const wanted = sortKey === "smart" ? "smart" : `${sortKey}:${sortDirection}`;
    sortSelect.value = [...sortSelect.options].some(option => option.value === wanted) ? wanted : "custom";
  };

  // The log is one entry per line; each entry can be reported on its own (never the whole job).
  const entryLines = row => String(row.rumors || "").split("\n").map(line => line.trim()).filter(Boolean);
  const logHtml = (row, index) => {
    const reported = readReported();
    return entryLines(row).map((line, position) => {
      const control = reported.includes(entryId(row, line))
        ? `<span class="rumor-reported" title="You reported this entry"><ion-icon name="checkmark-outline" aria-label="Reported"></ion-icon></span>`
        : `<button type="button" class="rumor-entry-report" data-rumor-report="${index}" data-rumor-entry="${position}" aria-label="Report this entry for ${escapeHtml(row.institution)}" title="Report this entry"><ion-icon name="flag-outline" aria-hidden="true"></ion-icon></button>`;
      return `<div class="rumor-entry"><span>${escapeHtml(line)}</span> ${control}</div>`;
    }).join("");
  };

  const renderRows = () => {
    const query = searchInput.value.trim().toLowerCase();
    const today = todayString();
    const visibleRows = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
      (categoryFilter === "All" || row.category === categoryFilter) &&
      (!statusFilter.value || row.status === statusFilter.value) &&
      matchesDeadline(row, deadlineFilter.value, today) &&
      [row.institution, row.status, row.rumors].some(value => value.toLowerCase().includes(query))
    ).sort(sortKey === "smart" ? (a, b) => compareSmart(a, b, today) : compareRows);

    count.textContent = `${visibleRows.length} of ${rows.length} ${rows.length === 1 ? "position" : "positions"}`;
    if (!visibleRows.length) {
      const message = loading ? "Loading the latest rumors…" : rows.length ? "No positions match these filters."
        : loadFailed ? "The tracker could not be loaded right now. Please try Refresh before adding a job." : "No positions yet. Add the first job or rumor.";
      tableBody.innerHTML = `<tr><td class="rumor-empty" colspan="7">${message}</td></tr>`;
      return;
    }
    tableBody.innerHTML = visibleRows.map(({ row, index }) => {
      const statusClass = row.status.startsWith("Offer") ? "offer" : ["Interviews", "Shortlist / Reference Req"].includes(row.status) ? "progress" : "posted";
      const jobLink = row.jobUrl ? `<a class="rumor-job-link" href="${escapeHtml(row.jobUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open job ad for ${escapeHtml(row.institution)}"><ion-icon name="open-outline" aria-hidden="true"></ion-icon></a>` : "";
      const passed = row.deadline && row.deadline < today ? ` <small class="rumor-muted">(passed)</small>` : "";
      return `<tr>
        <th scope="row"><div class="rumor-institution">${escapeHtml(row.institution)}${jobLink}</div></th>
        <td class="rumor-cell-category" data-label="Category">${escapeHtml(row.category)}</td>
        <td class="rumor-cell-deadline" data-label="Deadline">${row.deadline ? `<time datetime="${escapeHtml(row.deadline)}">${escapeHtml(row.deadline)}</time>${passed}` : `<span class="rumor-muted">None listed</span>`}</td>
        <td class="rumor-cell-status" data-label="Status"><span class="rumor-status rumor-status-${statusClass}">${escapeHtml(row.status)}</span></td>
        <td class="rumor-cell-log" data-label="Rumors &amp; dated log">${row.rumors ? `<div class="rumor-log">${logHtml(row, index)}</div>` : `<span class="rumor-muted">No reports yet</span>`}</td>
        <td class="rumor-cell-updated" data-label="Last updated">${row.updated ? `<time datetime="${escapeHtml(row.updated)}">${escapeHtml(row.updated)}</time>` : `<span class="rumor-muted">No dated update</span>`}</td>
        <td class="rumor-cell-action"><button type="button" class="rumor-row-update" data-rumor-update="${index}" aria-label="Update ${escapeHtml(row.institution)}">+ Update</button></td>
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
    showMessage(feedback, rows.length ? "Checking for new updates…" : "Loading the latest rumors…");
    renderRows();
    try {
      if (demoMode) {
        if (!rows.length) rows = demoRows.map(row => ({ ...row }));
        loadFailed = false;
      } else {
        const data = await requestApi();
        if (!Array.isArray(data)) throw new Error("The tracker did not return a list of positions.");
        const validRows = [];
        data.forEach(row => {
          try { validRows.push(normalizeRow(row)); } catch { /* Keep usable entries from a partial import. */ }
        });
        if (data.length && !validRows.length) throw new Error("No valid positions were returned.");
        rows = validRows;
        loadFailed = false;
        saveCachedRows();
        if (validRows.length < data.length) {
          showMessage(feedback, "Some entries could not be displayed. Please contact the site owner.", "error");
          return;
        }
      }
      showMessage(feedback, demoMode ? "Demo ready. Changes stay in this tab until you reload." : "Tracker refreshed.");
    } catch {
      loadFailed = true;
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
  const findMatches = (text, url) => {
    const id = adId(url);
    const byAd = id ? rows.map((row, index) => ({ row, index, byAd: true })).filter(({ row }) => adId(row.jobUrl) === id) : [];
    const query = looseName(text);
    const words = query.split(" ").filter(word => word.length > 1 && !ignoredWords.has(word));
    const byName = !words.length || query.length < 3 ? [] : rows
      .map((row, index) => ({ row, index, name: looseName(row.institution) }))
      .filter(({ name }) => name === query || words.every(word => name.includes(word)))
      .sort((a, b) => (b.name === query) - (a.name === query) || a.name.length - b.name.length);
    // The same job ad id always comes first; the server also merges these into one row.
    return [...byAd, ...byName.filter(item => !byAd.some(ad => ad.index === item.index))].slice(0, 4);
  };
  const renderMatches = () => {
    const matches = editingRow ? [] : findMatches(fields.institution.value, fields.jobUrl.value);
    matchesBox.hidden = !matches.length;
    const sameAd = matches.some(match => match.byAd);
    matchesBox.innerHTML = matches.length ? `<p><strong>${sameAd ? "This job ad is already listed." : "Already listed?"}</strong> Update the existing entry instead of adding a duplicate:</p>
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
    // Existing jobs default to "leave status unchanged", so adding a note cannot overwrite a
    // stage that someone else changed after this page loaded.
    keepStatusOption.disabled = keepStatusOption.hidden = !row;
    keepStatusOption.textContent = row ? `Leave status unchanged (now: ${row.status})` : "Leave status unchanged";
    fields.status.value = row ? "__keep__" : "Ad Posted";
    characterCount.textContent = "0 / 500";
    document.getElementById("rumor-modal-title").textContent = row ? "Update this position" : "Add a new job";
    document.getElementById("rumor-modal-description").textContent = row
      ? "The position details are locked. Your dated update will be appended to its existing log. Change the status only if the hiring stage moved."
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
  deadlineFilter.addEventListener("change", renderRows);
  sortSelect.addEventListener("change", () => {
    if (sortSelect.value === "custom") return;
    if (sortSelect.value === "smart") sortKey = "smart";
    else [sortKey, sortDirection] = sortSelect.value.split(":");
    updateSortHeaders();
    renderRows();
  });
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
  fields.jobUrl.addEventListener("input", renderMatches);
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
      institution: singleLine(fields.institution.value), category: fields.category.value,
      deadline: fields.deadline.value, jobUrl: fields.jobUrl.value.trim(),
      status: fields.status.value === "__keep__" ? "" : fields.status.value,
      rumor: singleLine(fields.rumor.value), website: fields.website.value
    };
    // Use the actual row identity even if a disabled/read-only form control is altered.
    if (editingRow) ["institution", "category", "deadline", "jobUrl"].forEach(name => { payload[name] = editingRow[name]; });
    if (!payload.institution || payload.institution.length > 200 || !payload.rumor || payload.rumor.length > 500) {
      showMessage(formFeedback, "Enter an institution (up to 200 characters) and a rumor (up to 500 characters).", "error");
      return;
    }
    const rumorProblem = rumorTextProblem(payload.rumor);
    if (rumorProblem) {
      showMessage(formFeedback, rumorProblem, "error");
      return;
    }
    if (!categories.includes(payload.category) || !(statuses.includes(payload.status) || (editingRow && payload.status === "")) || payload.website) {
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
          status: payload.status || existing?.status || editingRow?.status, rumors, updated: today
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
      saveCachedRows();
      statusFilter.value = "";
      deadlineFilter.value = "";
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

  // Report one entry: anonymous, fixed reasons only; only that entry is ever hidden.
  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-rumor-report]");
    if (!button) return;
    reportingRow = rows[Number(button.dataset.rumorReport)];
    reportingEntry = reportingRow ? entryLines(reportingRow)[Number(button.dataset.rumorEntry)] : "";
    if (!reportingRow || !reportingEntry) return;
    reportForm.reset();
    showMessage(reportFeedback, "");
    document.getElementById("rumor-report-job").textContent = `${reportingRow.institution} (${reportingRow.category}): ${reportingEntry.length > 160 ? `${reportingEntry.slice(0, 157)}...` : reportingEntry}`;
    reportDialog.showModal();
    document.body.classList.add("rumor-modal-open");
  });
  reportCancel.addEventListener("click", () => { if (!reporting) reportDialog.close(); });
  reportDialog.addEventListener("cancel", event => { if (reporting) event.preventDefault(); });
  reportDialog.addEventListener("close", () => document.body.classList.remove("rumor-modal-open"));
  reportForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (reporting || !reportingRow) return;
    const row = reportingRow;
    const entry = reportingEntry;
    reporting = true;
    reportSubmit.disabled = reportCancel.disabled = true;
    try {
      let hidden = false;
      if (demoMode) {
        hidden = false;
      } else {
        const result = await requestApi({
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "report", institution: row.institution, category: row.category, entry,
            reason: new FormData(reportForm).get("reason"),
            email: String(new FormData(reportForm).get("email") || "").trim(),
            explanation: String(new FormData(reportForm).get("explanation") || "").trim(),
            website: new FormData(reportForm).get("website") || ""
          })
        });
        if (!result || result.success !== true) throw new Error(result?.error || "The report could not be recorded.");
        hidden = result.hidden === true;
      }
      markReported(row, entry);
      const index = rows.findIndex(item => rowKey(item) === rowKey(row));
      if (hidden && index >= 0) {
        rows[index] = { ...rows[index], rumors: entryLines(rows[index]).filter(line => line !== entry).join("\n") };
      }
      saveCachedRows();
      renderRows();
      reportDialog.close();
      showMessage(feedback, "Thank you. Your anonymous report was recorded.", "success");
    } catch (error) {
      showMessage(reportFeedback, error.message || "The report could not be sent. Please try again later.", "error");
    } finally {
      reporting = false;
      reportSubmit.disabled = reportCancel.disabled = false;
    }
  });

  const demoNotice = document.getElementById("rumor-demo-notice");
  if (demoNotice && demoMode) {
    demoNotice.innerHTML = "<strong>Demo mode.</strong> These are fictional examples, including all dates and statuses. " +
      "Your submissions stay in memory in this tab and reset when you reload.";
    demoNotice.hidden = false;
  }
  updateSortHeaders();
  if (!demoMode) rows = readCachedRows();
  loadRows();
})();
