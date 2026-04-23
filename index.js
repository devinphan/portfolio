// index.js - Display latest projects and GitHub stats on home page

import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// ========== Display Latest Projects ==========

// Fetch all project data from the JSON file
const projects = await fetchJSON('./lib/projects.json');

// Get the first 3 projects
const latestProjects = projects.slice(0, 3);

// Select the container where projects will be displayed
const projectsContainer = document.querySelector('.projects');

// Render the latest projects with h2 heading level
renderProjects(latestProjects, projectsContainer, 'h2');

// ========== Display GitHub Stats with Dropdown ==========

// Fetch GitHub data using YOUR username
const githubData = await fetchGitHubData('devinphan');

// Select the containers for profile stats
const profileStats = document.getElementById('profile-stats');
const allProfileStats = document.getElementById('all-profile-stats');

// Format date nicely
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Get a friendly value for display, handling null/empty values
function getFriendlyValue(value, type = 'text') {
  if (value === null || value === '') {
    if (type === 'number') return 0;
    return 'Not provided';
  }
  return value;
}

// Display all stats in the full container
if (allProfileStats && githubData) {
  allProfileStats.innerHTML = `
    <dl>
      <dt>📁 Public Repos:</dt><dd>${githubData.public_repos || 0}</dd>
      <dt>📄 Public Gists:</dt><dd>${githubData.public_gists || 0}</dd>
      <dt>👥 Followers:</dt><dd>${githubData.followers || 0}</dd>
      <dt>👤 Following:</dt><dd>${githubData.following || 0}</dd>
      <dt>🏷️ Name:</dt><dd>${getFriendlyValue(githubData.name)}</dd>
      <dt>🔗 GitHub URL:</dt><dd><a href="${githubData.html_url}" target="_blank">${githubData.html_url}</a></dd>
      <dt>📅 Joined:</dt><dd>${formatDate(githubData.created_at)}</dd>
      <dt>🆔 User ID:</dt><dd>${githubData.id}</dd>
    </dl>
  `;
}

// Function to update the displayed stat based on dropdown selection
function updateDisplayedStat(statKey) {
  if (!profileStats || !githubData) return;
  
  let value = githubData[statKey];
  let displayValue = '';
  let icon = '';
  let label = '';
  
  // Get the human-readable label from the dropdown
  const selectElement = document.getElementById('stat-select');
  if (selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    label = selectedOption.text.replace(/^[^\w]+/, ''); // Remove emoji from label
  }
  
  // Format the value based on the stat type
  switch(statKey) {
    case 'public_repos':
      icon = '📁';
      displayValue = `${value || 0} repositories`;
      break;
    case 'public_gists':
      icon = '📄';
      displayValue = `${value || 0} gists`;
      break;
    case 'followers':
      icon = '👥';
      displayValue = `${value || 0} followers`;
      break;
    case 'following':
      icon = '👤';
      displayValue = `${value || 0} following`;
      break;
    case 'name':
      icon = '🏷️';
      displayValue = getFriendlyValue(value, 'text');
      if (displayValue === 'Not provided') {
        displayValue = 'No name set on GitHub profile';
      }
      break;
    case 'bio':
      icon = '📝';
      displayValue = getFriendlyValue(value, 'text');
      if (displayValue === 'Not provided') {
        displayValue = 'No bio available';
      }
      break;
    case 'location':
      icon = '📍';
      displayValue = getFriendlyValue(value, 'text');
      break;
    case 'created_at':
      icon = '📅';
      displayValue = formatDate(value);
      label = 'Joined GitHub';
      break;
    case 'html_url':
      icon = '🔗';
      displayValue = `<a href="${value}" target="_blank">View GitHub Profile</a>`;
      label = 'GitHub Profile';
      break;
    default:
      displayValue = getFriendlyValue(value, 'text');
  }
  
  // Update the container
  profileStats.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-content">
        <h3>${label}</h3>
        <p class="stat-value">${displayValue}</p>
      </div>
    </div>
  `;
}

// Get the select element and add event listener
const statSelect = document.getElementById('stat-select');
if (statSelect) {
  // Display the first stat by default
  updateDisplayedStat(statSelect.value);
  
  // Update when dropdown changes
  statSelect.addEventListener('change', (event) => {
    updateDisplayedStat(event.target.value);
  });
}