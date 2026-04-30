// global.js - Complete file for all steps

// ========== STEP 1: Initial setup ==========
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ========== STEP 1.2: fetchJSON Function ==========
export async function fetchJSON(url) {
  try {
    console.log('Fetching from URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched data:', data);
    return data;
    
  } catch (error) {
    console.error('Error fetching JSON:', error);
    return [];
  }
}

// ========== STEP 1.4: renderProjects Function (UPDATED with year) ==========

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('renderProjects: containerElement is null or undefined');
    return;
  }
  
  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadings.includes(headingLevel)) {
    console.warn(`Invalid headingLevel "${headingLevel}", defaulting to "h2"`);
    headingLevel = 'h2';
  }
  
  containerElement.innerHTML = '';
  
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found. Check back later!</p>';
    return;
  }
  
  for (let project of projects) {
    const article = document.createElement('article');
    
    const title = escapeHTML(project.title) || 'Untitled Project';
    const image = project.image || 'https://via.placeholder.com/300x200?text=No+Image';
    const description = escapeHTML(project.description) || 'No description available.';
    const year = project.year || 'N/A';
    
    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${image}" alt="${title}">
      <div class="project-content">
        <p>${description}</p>
        <p class="project-year">${year}</p>
      </div>
    `;
    
    containerElement.appendChild(article);
  }
}

// ========== STEP 3: GitHub API Integration ==========
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

// Helper function to enhance GitHub data with custom info
export function enhanceGitHubData(data) {
  return {
    ...data,
    name: data.name || "Devin Phan",
    bio: data.bio || "📊 3rd year Data Science major at UC San Diego | Passionate about machine learning and data visualization",
    location: data.location || "San Diego, CA"
  };
}

// ========== Navigation Menu (Step 3 from earlier) ==========
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'Resume/', title: 'Resume' },
  { url: 'https://github.com/devinphan', title: 'GitHub' }
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/portfolio/"
  : "/portfolio/";

const headerContainer = document.createElement('div');
headerContainer.className = 'header-container';
document.body.prepend(headerContainer);

const nav = document.createElement('nav');
headerContainer.append(nav);

for (let page of pages) {
  let url = page.url;
  const title = page.title;
  
  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }
  
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
  
  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  
  nav.append(a);
}

// ========== Dark Mode Switcher ==========
headerContainer.insertAdjacentHTML(
  'beforeend',
  `<label class="color-scheme">Theme: <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
}

if ("colorScheme" in localStorage) {
  const savedTheme = localStorage.colorScheme;
  select.value = savedTheme;
  setColorScheme(savedTheme);
}

select.addEventListener('input', function (event) {
  const theme = event.target.value;
  console.log('color scheme changed to', theme);
  setColorScheme(theme);
  localStorage.colorScheme = theme;
});

// ========== Contact Form Handling ==========
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