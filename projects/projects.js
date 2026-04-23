// projects.js - Dynamic project rendering

import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  try {
    // Try different paths if needed
    const projects = await fetchJSON('../lib/projects.json');
    
    // Select the container
    const projectsContainer = document.querySelector('.projects');
    
    if (!projectsContainer) {
      console.error('Projects container not found!');
      return;
    }
    
    // Render the projects
    renderProjects(projects, projectsContainer, 'h2');
    
    // Update the title with count
    const projectsTitle = document.querySelector('.projects-title');
    if (projectsTitle && projects) {
      const count = projects.length;
      projectsTitle.innerHTML = `Projects (${count} ${count === 1 ? 'project' : 'projects'})`;
    }
    
  } catch (error) {
    console.error('Error loading projects:', error);
    const projectsContainer = document.querySelector('.projects');
    if (projectsContainer) {
      projectsContainer.innerHTML = '<p>Error loading projects. Please try again later.</p>';
    }
  }
}

// Run the function
loadProjects();