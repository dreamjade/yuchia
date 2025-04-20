'use strict';

// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }

// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
if (sidebar && sidebarBtn) { // Add check to prevent errors if elements don't exist
  sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });
}


// testimonials variables (Commented out as in original)
// const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
// const modalContainer = document.querySelector("[data-modal-container]");
// const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
// const overlay = document.querySelector("[data-overlay]");
// modal variable
//const modalImg = document.querySelector("[data-modal-img]");
//const modalTitle = document.querySelector("[data-modal-title]");
//const modalText = document.querySelector("[data-modal-text]");
// modal toggle function
//const testimonialsModalFunc = function () {
//  modalContainer.classList.toggle("active");
// overlay.classList.toggle("active");
//}
// add click event to all modal items
//for (let i = 0; i < testimonialsItem.length; i++) {
//  testimonialsItem[i].addEventListener("click", function () {
//    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
//    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
//    modalTitle.innerHTML = this.querySelector("[data-testimonials-title]").innerHTML;
//    modalText.innerHTML = this.querySelector("[data-testimonials-text]").innerHTML;
//    testimonialsModalFunc();
//  });
//}
// add click event to modal close button
// modalCloseBtn.addEventListener("click", testimonialsModalFunc);
// overlay.addEventListener("click", testimonialsModalFunc);


// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]"); // Corrected selector name
const filterBtn = document.querySelectorAll("[data-filter-btn]");

if (select) { // Add check
  select.addEventListener("click", function () { elementToggleFunc(this); });
}

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    if (selectValue) { // Add check
      selectValue.innerText = this.innerText;
    }
    if (select) { // Add check
      elementToggleFunc(select);
    }
    filterFunc(selectedValue);
  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {
  for (let i = 0; i < filterItems.length; i++) {
    // Default to show all if category is 'all' or if the item's category matches
    if (selectedValue === "all" || selectedValue === filterItems[i].dataset.category.toLowerCase()) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn.length > 0 ? filterBtn[0] : null; // Handle case where no filter buttons exist

for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    if (selectValue) { // Add check
      selectValue.innerText = this.innerText; // Update select box text if it exists
    }
    filterFunc(selectedValue);

    if (lastClickedBtn) {
      lastClickedBtn.classList.remove("active");
    }
    this.classList.add("active");
    lastClickedBtn = this;
  });
}


// contact form variables (Keep only if you uncomment the contact form HTML)
/*
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
if (form && formInputs.length > 0 && formBtn) { // Add checks
  for (let i = 0; i < formInputs.length; i++) {
    formInputs[i].addEventListener("input", function () {
      // check form validation
      if (form.checkValidity()) {
        formBtn.removeAttribute("disabled");
      } else {
        formBtn.setAttribute("disabled", "");
      }
    });
  }
}
*/


// --- PAGE NAVIGATION LOGIC (Corrected) ---

const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");
const validPageNames = Array.from(pages).map(p => p.dataset.page); // Get valid page names once

// Function to set the active page and navigation link
const setActivePage = function (pageName) {
  let targetPageName = pageName; // Use a temporary variable

  // Default to 'about' if the requested pageName is invalid
  if (!validPageNames.includes(targetPageName)) {
    targetPageName = "about"; // Default page name
  }

  // Activate the correct page
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.toggle("active", pages[i].dataset.page === targetPageName);
  }

  // Activate the correct navigation link
  for (let i = 0; i < navigationLinks.length; i++) {
    navigationLinks[i].classList.toggle("active", navigationLinks[i].innerHTML.toLowerCase() === targetPageName);
  }

  window.scrollTo(0, 0);
};

// Add click event to all nav links
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    const targetPage = this.innerHTML.toLowerCase();
    if (window.location.hash !== `#${targetPage}`) {
      window.location.hash = targetPage; // Update hash only if it's different
    } else {
      setActivePage(targetPage); // Manually update if hash is already correct (e.g., clicking current page)
    }
  });
}

// Function to handle hash changes (URL fragment identifier changes)
const handleHashChange = function () {
  let pageName = window.location.hash.substring(1); // Use substring(1)
  setActivePage(pageName); // Let setActivePage handle defaulting
};

// Listen for hash changes (e.g., back/forward button, manual URL change)
window.addEventListener("hashchange", handleHashChange);

// Set initial page based on hash when the page loads
window.addEventListener("DOMContentLoaded", () => {
  // Run filter function for 'all' initially if filter items exist
  if (filterItems.length > 0) {
    filterFunc("all");
    if (lastClickedBtn) {
      lastClickedBtn.classList.add("active"); // Ensure 'All' button is active initially
    }
  }
  handleHashChange(); // Then handle page navigation based on hash
});

// --- END OF PAGE NAVIGATION LOGIC ---


// --- LIGHT/DARK THEME TOGGLE ---

const themeToggleButton = document.getElementById('theme-toggle-btn');
const bodyElement = document.body;

// Function to apply the theme based on saved preference or system setting
const applyThemePreference = () => {
  // 1. Check localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    bodyElement.classList.toggle('light-theme', savedTheme === 'light');
    return; // Exit if we found a saved theme
  }

  // 2. Check prefers-color-scheme media query (Optional Fallback)
  // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // bodyElement.classList.toggle('light-theme', !prefersDark); // Add light-theme if system is NOT dark
};

// Function to handle the toggle button click
const handleThemeToggle = () => {
  bodyElement.classList.toggle('light-theme');

  // Save the user's preference to localStorage
  if (bodyElement.classList.contains('light-theme')) {
    localStorage.setItem('theme', 'light');
    // Optional: Update button icon/text for light mode (e.g., to a moon)
    // if (themeToggleButton) themeToggleButton.querySelector('ion-icon').name = 'moon-outline';
  } else {
    localStorage.setItem('theme', 'dark');
    // Optional: Update button icon/text for dark mode (e.g., back to contrast or a sun)
    // if (themeToggleButton) themeToggleButton.querySelector('ion-icon').name = 'contrast-outline';
  }
};

// Add event listener to the button
if (themeToggleButton) { // Check if the button exists
  themeToggleButton.addEventListener('click', handleThemeToggle);
}

// Apply the theme preference early
applyThemePreference();

// --- END OF LIGHT/DARK THEME TOGGLE ---