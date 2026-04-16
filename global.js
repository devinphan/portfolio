// global.js - Complete file for all steps

// ========== STEP 1: Initial setup ==========
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ========== STEP 3: Automatic navigation menu ==========

// Define all pages
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'Resume/', title: 'Resume' },
  { url: 'https://github.com/devinphan', title: 'GitHub' }
];

// Set base path for local vs GitHub Pages
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/portfolio/"  // Local path - change to your folder name
  : "/portfolio/";  // GitHub Pages repo name

// Create a header container to hold both theme switcher and nav
const headerContainer = document.createElement('div');
headerContainer.className = 'header-container';
document.body.prepend(headerContainer);

// Create nav element
const nav = document.createElement('nav');
headerContainer.append(nav);

// Loop through pages and create links
for (let page of pages) {
  let url = page.url;
  const title = page.title;
  
  // Fix URL for internal links
  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }
  
  // Create link element
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  
  // Add current class if this is the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
  
  // Open external links in new tab
  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  
  nav.append(a);
}

// ========== STEP 4: Dark mode switcher ==========

// Add theme switcher to header container - FIXED: "Theme:" and select on same line
headerContainer.insertAdjacentHTML(
  'beforeend',
  `<label class="color-scheme">Theme: <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

// Get reference to select element
const select = document.querySelector('.color-scheme select');

// Function to set color scheme (reusable)
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
}

// Load saved preference from localStorage
if ("colorScheme" in localStorage) {
  const savedTheme = localStorage.colorScheme;
  select.value = savedTheme;
  setColorScheme(savedTheme);
}

// Save preference when user changes theme
select.addEventListener('input', function (event) {
  const theme = event.target.value;
  console.log('color scheme changed to', theme);
  setColorScheme(theme);
  localStorage.colorScheme = theme;
});

// ========== STEP 5: Contact form handling ==========

const form = document.querySelector('#contact-form');

form?.addEventListener('submit', function(event) {
  event.preventDefault();
  
  const data = new FormData(form);
  let url = form.action || 'mailto:lea@verou.me';
  let params = [];
  
  for (let [name, value] of data) {
    console.log(name, value);
    const encodedValue = encodeURIComponent(value);
    params.push(`${name}=${encodedValue}`);
  }
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  console.log('Final URL:', url);
  location.href = url;
});