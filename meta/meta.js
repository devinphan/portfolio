// meta/main.js - Code analysis visualization

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Global variables for scales (needed for brush)
let xScale = null;
let yScale = null;
let commits = null;

// ========== Step 1.1: Load and parse CSV data ==========

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    code: Number(row.code),
    comment: Number(row.comment),
    blank: Number(row.blank),
  }));
  return data;
}

// ========== Step 1.2: Process commits data ==========

function processCommits(data) {
  const grouped = d3.groups(data, (d) => d.commit);
  
  return grouped.map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;
    
    let parsedDate = datetime ? new Date(datetime) : new Date(`${date}T${time}${timezone}`);
    
    let ret = {
      id: commit,
      url: 'https://github.com/devinphan/portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime: parsedDate,
      hourFrac: parsedDate.getHours() + parsedDate.getMinutes() / 60,
      totalLines: lines.length,
      lines: lines, // Make lines accessible for language breakdown
    };
    
    return ret;
  });
}

// ========== Step 1.3: Render summary stats ==========

function renderStats(data, commitsData) {
  d3.select('#stats').html('');
  
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
  const totalCode = data.filter(d => d.code === 1).length;
  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(totalCode.toLocaleString());
  
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commitsData.length.toLocaleString());
  
  const files = d3.group(data, d => d.file);
  dl.append('dt').text('Number of files');
  dl.append('dd').text(files.size.toLocaleString());
  
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );
  const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
  dl.append('dt').text('Average file length');
  dl.append('dd').text(Math.round(avgFileLength).toLocaleString());
  
  const longestFile = d3.greatest(fileLengths, (d) => d[1]);
  dl.append('dt').text('Longest file');
  dl.append('dd').text(`${longestFile[0]} (${longestFile[1]} lines)`);
  
  dl.append('dt').text('Total lines (all)');
  dl.append('dd').text(data.length.toLocaleString());
  
  const authors = d3.group(commitsData, d => d.author);
  dl.append('dt').text('Number of authors');
  dl.append('dd').text(authors.size);
  
  const avgCommitSize = d3.mean(commitsData, d => d.totalLines);
  dl.append('dt').text('Average commit size');
  dl.append('dd').text(Math.round(avgCommitSize).toLocaleString());
  
  const workByHour = d3.rollups(
    commitsData,
    (v) => v.length,
    (d) => Math.floor(d.hourFrac)
  );
  const peakHour = d3.greatest(workByHour, (d) => d[1]);
  dl.append('dt').text('Peak coding hour');
  dl.append('dd').text(`${peakHour[0]}:00 (${peakHour[1]} commits)`);
  
  const workByDay = d3.rollups(
    commitsData,
    (v) => v.length,
    (d) => d.datetime.toLocaleString('en', { weekday: 'long' })
  );
  const peakDay = d3.greatest(workByDay, (d) => d[1]);
  dl.append('dt').text('Peak coding day');
  dl.append('dd').text(`${peakDay[0]} (${peakDay[1]} commits)`);
  
  const totalComments = data.filter(d => d.comment === 1).length;
  dl.append('dt').text('Total comment lines');
  dl.append('dd').text(totalComments.toLocaleString());
  
  const commentRatio = totalCode / totalComments;
  dl.append('dt').text('Code:Comment ratio');
  dl.append('dd').text(commentRatio.toFixed(2));
}

// ========== Step 3.1-3.4: Tooltip Functions ==========

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id.slice(0, 7);
  
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  
  const hours = Math.floor(commit.hourFrac);
  const minutes = Math.round((commit.hourFrac % 1) * 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  time.textContent = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 15}px`;
  tooltip.style.top = `${event.clientY + 15}px`;
}

// ========== Step 5: Brushing Functions ==========

// Step 5.4: Check if a commit is selected by the brush
function isCommitSelected(selection, commit) {
  if (!selection) return false;
  
  // Get the x and y coordinates of the commit
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  // Check if point is within brush bounds
  const [[x0, y0], [x1, y1]] = selection;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Step 5.5: Update the selection count display
function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commit${selectedCommits.length !== 1 ? 's' : ''} selected`;

  return selectedCommits;
}

// Step 5.6: Render language breakdown for selected commits
function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  
  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';

  if (selectedCommits.length === 0) {
    return;
  }
  
  // Get all lines from selected commits
  const lines = selectedCommits.flatMap((d) => d.lines);
  
  // Use d3.rollup to count lines per file type (language)
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.file.split('.').pop() || 'unknown' // Get file extension
  );
  
  // Sort by count descending and display
  const sortedBreakdown = Array.from(breakdown).sort((a, b) => b[1] - a[1]);
  const totalLines = lines.length;
  
  for (const [language, count] of sortedBreakdown) {
    const proportion = count / totalLines;
    const formatted = d3.format('.1~%')(proportion);
    
    const dt = document.createElement('dt');
    dt.textContent = language.toUpperCase();
    container.appendChild(dt);
    
    const dd = document.createElement('dd');
    dd.textContent = `${count} lines (${formatted})`;
    container.appendChild(dd);
  }
}

// Step 5.1 & 5.2 & 5.4: Brush event handler
function brushed(event) {
  const selection = event.selection;
  
  // Update circle classes based on selection
  d3.selectAll('circle').attr('class', (d) => {
    return isCommitSelected(selection, d) ? 'selected' : '';
  });
  
  // Update displays
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

// ========== Step 2 & 4: Scatterplot Visualization ==========

function addSizeLegend(svg, usableArea, rScale, minLines, maxLines) {
  const legendX = usableArea.right - 90;
  const legendY = usableArea.top + 50;
  
  const legendGroup = svg
    .append('g')
    .attr('class', 'size-legend')
    .attr('transform', `translate(${legendX}, ${legendY})`);
  
  legendGroup.append('text')
    .attr('x', 0)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', 'canvastext')
    .text('Lines changed');
  
  const sampleSizes = [
    { lines: minLines, label: `${minLines}` },
    { lines: Math.round((minLines + maxLines) / 2), label: `${Math.round((minLines + maxLines) / 2)}` },
    { lines: maxLines, label: `${maxLines}` }
  ];
  
  sampleSizes.forEach((sample, i) => {
    const y = i * 30;
    legendGroup
      .append('circle')
      .attr('cx', 15)
      .attr('cy', y)
      .attr('r', rScale(sample.lines))
      .attr('fill', '#888')
      .attr('fill-opacity', 0.7)
      .attr('stroke', 'canvas')
      .attr('stroke-width', 0.5);
    
    legendGroup
      .append('text')
      .attr('x', 40)
      .attr('y', y + 4)
      .style('font-size', '10px')
      .style('fill', 'canvastext')
      .text(`${sample.label} lines`);
  });
}

function renderScatterPlot(commitsData) {
  d3.select('#chart').html('');
  
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
  
  // Create scales and make them global for brush
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commitsData, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  
  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);
  
  // Radius scale
  const [minLines, maxLines] = d3.extent(commitsData, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 22]);
  
  // Gridlines
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );
  
  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
  
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);
  
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
  
  // Axis labels
  svg
    .append('text')
    .attr('x', usableArea.left + usableArea.width / 2)
    .attr('y', height - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', 'canvastext')
    .text('Date');
  
  svg
    .append('text')
    .attr('x', -usableArea.top - usableArea.height / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .style('font-size', '12px')
    .style('fill', 'canvastext')
    .text('Time of Day');
  
  // Color scale
  const colorScale = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24])
    .range(['#1a237e', '#4a148c', '#ff8f00', '#e65100', '#1a237e'])
    .interpolate(d3.interpolateRgb);
  
  // Sort commits so smaller dots render on top
  const sortedCommits = d3.sort(commitsData, (d) => -d.totalLines);
  
  const dots = svg.append('g').attr('class', 'dots');
  
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', (d) => colorScale(d.hourFrac))
    .attr('stroke', 'canvas')
    .attr('stroke-width', 0.5)
    .attr('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget)
        .attr('fill-opacity', 1)
        .attr('stroke-width', 2);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget)
        .attr('fill-opacity', 0.7)
        .attr('stroke-width', 0.5);
      updateTooltipVisibility(false);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    });
  
  // Step 5.1 & 5.2: Set up brush
  const brush = d3.brush()
    .on('start brush end', brushed);
  
  svg.call(brush);
  
  // Step 5.2: Raise dots and other elements so tooltips work
  svg.selectAll('.dots, .overlay ~ *').raise();
  
  // Add size legend
  addSizeLegend(svg, usableArea, rScale, minLines, maxLines);
}

// ========== Main execution ==========

async function main() {
  const rawData = await loadData();
  console.log('Raw data loaded:', rawData.length, 'rows');
  
  commits = processCommits(rawData);
  console.log('Processed commits:', commits.length, 'commits');
  
  renderStats(rawData, commits);
  renderScatterPlot(commits);
}

main();