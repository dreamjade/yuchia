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

const setActivePage = (pageName, shouldScroll = false) => {
  const targetPageName = validPageNames.includes(pageName) ? pageName : "about";

  // Toggle active class on articles
  pages.forEach(page => {
    page.classList.toggle("active", page.dataset.page === targetPageName);
  });

  // Toggle active class on navbar links
  navigationLinks.forEach(link => {
    const linkTarget = link.dataset.target || link.textContent.trim().toLowerCase();
    link.classList.toggle("active", linkTarget === targetPageName);
  });

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// Listen to Hash Changes for Routing
const handleHashChange = (e) => {
  const pageName = window.location.hash.replace(/^#/, "").toLowerCase();
  // Only smooth scroll if triggered by user interaction (hashchange event), not initial load
  const isUserNavigation = e && e.type === "hashchange";
  setActivePage(pageName, isUserNavigation);
};

window.addEventListener("hashchange", handleHashChange);
window.addEventListener("DOMContentLoaded", () => handleHashChange());

navigationLinks.forEach(link => {
  link.addEventListener("click", () => {
    const targetPage = link.dataset.target || link.textContent.trim().toLowerCase();
    if (window.location.hash === `#${targetPage}`) {
      setActivePage(targetPage, true);
    } else {
      window.location.hash = targetPage;
    }
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