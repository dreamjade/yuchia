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


// --- CORRECTED PAGE NAVIGATION LOGIC ---

// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Function to set the active page and navigation link
const setActivePage = function (pageName) {
  let pageFound = false;
  // Activate the correct page
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].dataset.page === pageName) {
      pages[i].classList.add("active");
      pageFound = true; // Mark that we found a valid page
    } else {
      pages[i].classList.remove("active");
    }
  }

  // If the requested pageName wasn't found, default to 'about'
  if (!pageFound && pages.length > 0) {
    pageName = "about"; // Default page name
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].dataset.page === pageName) {
        pages[i].classList.add("active");
        break; // Found the default page
      }
    }
    // Optionally update hash if it was invalid
    // Be careful with history.replaceState to avoid unwanted back button behavior
    // window.location.hash = pageName; // This might trigger hashchange again
  }


  // Activate the correct navigation link based on the potentially updated pageName
  for (let i = 0; i < navigationLinks.length; i++) {
    if (navigationLinks[i].innerHTML.toLowerCase() === pageName) {
      navigationLinks[i].classList.add("active");
    } else {
      navigationLinks[i].classList.remove("active");
    }
  }

  window.scrollTo(0, 0);
};

// Add click event to all nav links
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    const targetPage = this.innerHTML.toLowerCase();
    // Update URL hash (this might trigger hashchange listener below,
    // but we also call setActivePage directly for immediate feedback)
    window.location.hash = targetPage;
    setActivePage(targetPage);
  });
}

// Function to handle hash changes (URL fragment identifier changes)
const handleHashChange = function () {
  let pageName = window.location.hash.substring(1); // Use substring(1) - handles empty hash correctly

  // Default to 'about' if hash is empty
  if (!pageName && pages.length > 0) {
    pageName = "about";
    // Optionally update hash if it was empty - be careful about triggering listener again
    // window.location.hash = pageName;
  }

  // Set the active page based on the determined pageName
  setActivePage(pageName);
};

// Listen for hash changes (e.g., back/forward button, manual URL change)
window.addEventListener("hashchange", handleHashChange);

// Set initial page based on hash when the page loads
window.addEventListener("DOMContentLoaded", handleHashChange);