// global.js - Complete file with navigation and persistent theme switcher

// ========== NAVIGATION MENU (Step 3) ==========

const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'Resume/', title: 'Resume' },
    { url: 'https://github.com/devinphan', title: 'GitHub' }
  ];
  
  const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "/portfolio/";  // ← Changed to match your folder name!
  
  const nav = document.createElement('nav');
  document.body.prepend(nav);
  
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
  
  // ========== THEME SWITCHER (Steps 4.2 - 4.5) ==========
  
  // Add the theme dropdown
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
  );
  
  // Get the select element
  const select = document.querySelector('.color-scheme select');
  
  // Function to set the color scheme (reusable)
  function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
  }
  
  // Load saved preference from localStorage when page loads
  if ("colorScheme" in localStorage) {
    const savedTheme = localStorage.colorScheme;
    select.value = savedTheme;
    setColorScheme(savedTheme);
  }
  
  // Save preference when user changes the theme
  select.addEventListener('input', function (event) {
    const theme = event.target.value;
    console.log('color scheme changed to', theme);
    
    setColorScheme(theme);
    localStorage.colorScheme = theme;
  });

  // ========== CONTACT FORM HANDLING (Step 5 - Optional) ==========

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