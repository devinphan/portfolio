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
    line: Number(row.line),       // line number
    depth: Number(row.depth),     // indentation depth
    length: Number(row.length),   // line length in characters
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// ========== Step 1.2: Process commits data ==========

function processCommits(data) {
  const grouped = d3.groups(data, (d) => d.commit);

  return grouped.map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;

    // datetime is already a Date object after loadData parsing
    let parsedDate = datetime instanceof Date ? datetime : new Date(datetime);

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
      lines: lines,
    };

    return ret;
  });
}

// ========== Step 1.3: Render summary stats ==========

function renderStats(data, commitsData) {
  d3.select('#stats').html('');

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Total LOC = total number of rows in the CSV (each row = one line of code)
  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length.toLocaleString());

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commitsData.length.toLocaleString());

  // Number of files
  const files = d3.group(data, (d) => d.file);
  dl.append('dt').text('Number of files');
  dl.append('dd').text(files.size.toLocaleString());

  // Average file length
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );
  const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
  dl.append('dt').text('Average file length');
  dl.append('dd').text(Math.round(avgFileLength).toLocaleString() + ' lines');

  // Longest file
  const longestFile = d3.greatest(fileLengths, (d) => d[1]);
  dl.append('dt').text('Longest file');
  dl.append('dd').text(`${longestFile[0]} (${longestFile[1]} lines)`);

  // Average line length (using the length column)
  const avgLineLength = d3.mean(data, (d) => d.length);
  dl.append('dt').text('Average line length');
  dl.append('dd').text(Math.round(avgLineLength).toLocaleString() + ' chars');

  // Average commit size
  const avgCommitSize = d3.mean(commitsData, (d) => d.totalLines);
  dl.append('dt').text('Average commit size');
  dl.append('dd').text(Math.round(avgCommitSize).toLocaleString() + ' lines');

  // Peak coding hour
  const workByHour = d3.rollups(
    commitsData,
    (v) => v.length,
    (d) => Math.floor(d.hourFrac)
  );
  const peakHour = d3.greatest(workByHour, (d) => d[1]);
  dl.append('dt').text('Peak coding hour');
  dl.append('dd').text(`${peakHour[0]}:00 (${peakHour[1]} commits)`);

  // Peak coding day
  const workByDay = d3.rollups(
    commitsData,
    (v) => v.length,
    (d) => d.datetime.toLocaleString('en', { weekday: 'long' })
  );
  const peakDay = d3.greatest(workByDay, (d) => d[1]);
  dl.append('dt').text('Peak coding day');
  dl.append('dd').text(`${peakDay[0]} (${peakDay[1]} commits)`);

  // Language breakdown (using the type column: css, js, html, etc.)
  const byType = d3.rollups(data, (v) => v.length, (d) => d.type);
  byType.sort((a, b) => b[1] - a[1]);
  dl.append('dt').text('Most common language');
  dl.append('dd').text(`${byType[0][0].toUpperCase()} (${byType[0][1].toLocaleString()} lines)`);
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

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  const [[x0, y0], [x1, y1]] = selection;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

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

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';

  if (selectedCommits.length === 0) return;

  const lines = selectedCommits.flatMap((d) => d.lines);

  // Use the `type` column (css, js, html) — this is what elocuent actually provides
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type || 'unknown'
  );

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

function brushed(event) {
  const selection = event.selection;

  d3.selectAll('circle').attr('class', (d) => {
    return isCommitSelected(selection, d) ? 'selected' : '';
  });

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
    { lines: maxLines, label: `${maxLines}` },
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

  // Global scales for brush
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commitsData, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

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

  // Color by time of day
  const colorScale = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24])
    .range(['#1a237e', '#4a148c', '#ff8f00', '#e65100', '#1a237e'])
    .interpolate(d3.interpolateRgb);

  // Sort so smaller dots render on top
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

  // Brush setup
  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);

  // Raise dots so tooltips still work through the brush overlay
  svg.selectAll('.dots, .overlay ~ *').raise();

  addSizeLegend(svg, usableArea, rScale, minLines, maxLines);
}

// ========== Main execution ==========

async function main() {
  const rawData = await loadData();
  commits = processCommits(rawData);
  renderStats(rawData, commits);
  renderScatterPlot(commits);
}

main();