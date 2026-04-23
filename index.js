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

// ========== Display GitHub Stats ==========

// Fetch GitHub data (replace 'devinphan' with your actual GitHub username)
const githubData = await fetchGitHubData('devinphan');

// Select the container for profile stats
const profileStats = document.querySelector('#profile-stats');

// If the container exists, populate it with GitHub data
if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}