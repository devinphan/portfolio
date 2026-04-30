// projects.js - Dynamic project rendering with interactive D3 pie chart

import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ========== Load Project Data ==========

// Fetch project data from the JSON file
const projects = await fetchJSON('../lib/projects.json');

// Select the container where projects will be rendered
const projectsContainer = document.querySelector('.projects');

// Select the search input
const searchInput = document.querySelector('.search-bar');

// ========== Global State Variables ==========

let currentQuery = '';           // Current search query
let selectedYear = null;         // Currently selected year for filtering
let colorScale = null;           // Color scale for consistent colors

// ========== Step 4.2-4.3: Search Functionality ==========

// Function to filter projects based on search query AND selected year
function filterProjects(projects, query, year) {
  let filtered = projects;
  
  // Filter by search query
  if (query && query.trim() !== '') {
    filtered = filtered.filter((project) => {
      const searchableText = Object.values(project).join('\n').toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });
  }
  
  // Filter by selected year
  if (year) {
    filtered = filtered.filter((project) => project.year === year);
  }
  
  return filtered;
}

// ========== Step 5.1-5.3: Interactive Pie Chart ==========

// Function to render legend with click handlers
function renderLegend(pieData, selectedYear, onLegendClick) {
  const legend = d3.select('.legend');
  legend.html('');
  
  if (!pieData || pieData.length === 0) {
    legend.html('<li class="legend-empty">No data to display</li>');
    return;
  }
  
  pieData.forEach((d, idx) => {
    const isSelected = selectedYear === d.label;
    legend
      .append('li')
      .attr('class', `legend-item ${isSelected ? 'selected' : ''}`)
      .attr('style', `--color: ${colorScale(idx)}`)
      .html(`
        <span class="swatch"></span>
        <span class="legend-label">${d.label}</span>
        <em class="legend-count">(${d.value} project${d.value !== 1 ? 's' : ''})</em>
      `)
      .on('click', () => onLegendClick(d.label));
  });
}

// Function to render the pie chart with click handlers
function renderPieChart(projectsData, selectedYear, onSliceClick) {
  // Clear previous chart paths
  d3.select('#projects-pie-plot').selectAll('path').remove();
  
  // If no projects, return
  if (!projectsData || projectsData.length === 0) {
    console.log('No projects to display in pie chart');
    // Show empty state message
    d3.select('#projects-pie-plot')
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'canvastext')
      .attr('font-size', '8')
      .text('No data');
    renderLegend([], selectedYear, onSliceClick);
    return;
  }
  
  // Remove any empty state text if present
  d3.select('#projects-pie-plot').selectAll('text').remove();
  
  // Group projects by year and count them
  const rolledData = d3.rollups(
    projectsData,
    (v) => v.length,
    (d) => d.year
  );
  
  if (rolledData.length === 0) {
    console.log('No year data to display in pie chart');
    return;
  }
  
  // Convert to array of objects for D3
  const pieData = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));
  
  console.log('Pie chart data:', pieData);
  
  // Create color scale if not exists
  if (!colorScale) {
    colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  }
  
  // Create arc generator
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);
  
  // Create pie generator
  const pieGenerator = d3.pie().value((d) => d.value);
  const arcData = pieGenerator(pieData);
  
  // Generate paths for each slice with click handlers
  const svg = d3.select('#projects-pie-plot');
  
  arcData.forEach((slice, index) => {
    const path = arcGenerator(slice);
    const dataPoint = pieData[index];
    const isSelected = selectedYear === dataPoint.label;
    
    svg
      .append('path')
      .attr('d', path)
      .attr('fill', colorScale(index))
      .attr('stroke', 'canvas')
      .attr('stroke-width', '1.5')
      .attr('class', `pie-slice ${isSelected ? 'selected' : ''}`)
      .attr('data-year', dataPoint.label)
      .attr('data-count', dataPoint.value)
      .on('click', () => onSliceClick(dataPoint.label));
  });
  
  // Render legend
  renderLegend(pieData, selectedYear, onSliceClick);
}

// Add hover interactions for pie slices
function addHoverInteractions() {
  // Step 5.1: Fade out other wedges on hover
  const svg = d3.select('#projects-pie-plot');
  
  svg.selectAll('path')
    .on('mouseenter', function() {
      svg.selectAll('path').transition().duration(200).attr('opacity', 0.4);
      d3.select(this).transition().duration(200).attr('opacity', 1);
    })
    .on('mouseleave', function() {
      svg.selectAll('path').transition().duration(200).attr('opacity', 1);
    });
}

// ========== Update All Content ==========

// Function to update everything based on current filters
function updateAll() {
  // Filter projects by both search query and selected year
  const filteredProjects = filterProjects(projects, currentQuery, selectedYear);
  
  // Update projects title with count
  const projectsTitle = document.querySelector('.projects-title');
  if (projectsTitle) {
    const count = filteredProjects.length;
    const totalCount = projects.length;
    
    let titleText = `Projects (${count}`;
    if (count !== totalCount && (currentQuery || selectedYear)) {
      titleText += ` of ${totalCount}`;
    }
    titleText += ` ${count === 1 ? 'project' : 'projects'})`;
    
    // Add filter indicators
    const filters = [];
    if (selectedYear) filters.push(`Year: ${selectedYear}`);
    if (currentQuery && currentQuery.trim() !== '') filters.push(`Search: "${currentQuery}"`);
    if (filters.length > 0) {
      titleText += ` — Filtered by ${filters.join(', ')}`;
    }
    
    projectsTitle.innerHTML = titleText;
  }
  
  // Render filtered projects
  renderProjects(filteredProjects, projectsContainer, 'h2');
  
  // Render pie chart with current selection
  renderPieChart(filteredProjects, selectedYear, handleSliceClick);
  
  // Add hover interactions
  addHoverInteractions();
}

// ========== Step 5.2: Handle Pie Slice Click ==========

function handleSliceClick(year) {
  // Toggle selection: if same year is clicked, deselect; otherwise select new
  if (selectedYear === year) {
    selectedYear = null;  // Deselect
    console.log('Deselected year filter');
  } else {
    selectedYear = year;  // Select new year
    console.log('Filtering by year:', year);
  }
  
  // Update everything with new selection
  updateAll();
}

// ========== Step 4.2: Search Event Listener ==========

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    currentQuery = event.target.value;
    console.log('Search query:', currentQuery);
    updateAll();
  });
}

// ========== Initial Render ==========

// Initial render without filters
updateAll();

console.log('Page loaded with', projects.length, 'projects');