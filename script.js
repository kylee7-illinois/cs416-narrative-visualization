const stateCsvUrl = "us-states.csv";
const usTopoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const scenes = [
  {
    title: "Scene 1: Early Outbreaks",
    text: "The first reported cases appeared in a small number of states before the pandemic became a nationwide event.",
    annotation: "By March 15, 2020, reported cases were still concentrated in a limited set of states. The bar chart highlights the early uneven pattern before the outbreak became nationwide.",
    date: "2020-03-15"
  },
  {
    title: "Scene 2: Nationwide Spread",
    text: "As weeks passed, reported cases increased across the country. Use the date slider to see how the geographic pattern changed.",
    annotation: "By late spring and summer 2020, reported cases were no longer limited to the first outbreak states. The map shows the spread becoming a nationwide pattern over time."
  },
  {
    title: "Scene 3: Explore State-Level Details",
    text: "After the guided story, explore how each state changed by selecting a state, date, and metric.",
    annotation: "Select a state, date, and metric to examine how the local trajectory compares with the national spread. The highlighted point on the line chart marks the selected date when data is available."
  }
];

let stateNameByFips = new Map();
let stateFipsByName = new Map();

let covidData;
let byDate;
let byState;
let dates;
let usStates;
let currentScene = 0;
let selectedDate;
let selectedMetric = "cases";
let selectedState = "New York";

const vis = d3.select("#vis");
const controls = d3.select("#controls");
const annotation = d3.select("#annotation");
const tooltip = d3.select("#tooltip");

Promise.all([
  d3.csv(stateCsvUrl, d => ({
    date: d.date,
    state: d.state,
    fips: String(d.fips).padStart(2, "0"),
    cases: +d.cases,
    deaths: +d.deaths
  })),
  d3.json(usTopoUrl)
]).then(([rows, us]) => {
  covidData = rows.filter(d => d.date.startsWith("2020") && d.fips !== "00");
  byDate = d3.group(covidData, d => d.date);
  byState = d3.group(covidData, d => d.state);
  
  dates = Array.from(byDate.keys()).sort();
  selectedDate = "2020-03-15";
  
  usStates = topojson.feature(us, us.objects.states).features;

  stateNameByFips = new Map(usStates.map(d => [String(d.id).padStart(2, "0"), d.properties.name]));
  stateFipsByName = new Map(usStates.map(d => [d.properties.name, String(d.id).padStart(2, "0")]));

  render();
});

function render() {
  renderNav();
  d3.select("#sceneTitle").text(scenes[currentScene].title);
  d3.select("#sceneText").text(scenes[currentScene].text);
  annotation.text(scenes[currentScene].annotation);
  controls.html("");
  vis.html("");

  if (currentScene === 0) renderScene1();
  if (currentScene === 1) renderScene2();
  if (currentScene === 2) renderScene3();
}

function renderNav() {
  d3.select("#prevBtn")
    .property("disabled", currentScene === 0)
    .on("click", () => {
      currentScene = Math.max(0, currentScene - 1);
      render();
    });

  d3.select("#nextBtn")
    .property("disabled", currentScene === scenes.length - 1)
    .on("click", () => {
      currentScene = Math.min(scenes.length - 1, currentScene + 1);
      render();
    });

  const dots = d3.select("#sceneDots")
    .selectAll(".dot")
    .data(scenes.map((scene, index) => ({ ...scene, index })));

  dots.join("span")
    .attr("class", (_, i) => i === currentScene ? "dot active" : "dot")
    .on("click", function () {
      currentScene = d3.select(this).datum().index;
      render();
    });
}

function addInteractionTip(text) {
  controls.append("div")
    .attr("class", "interaction-tip")
    .text(text);
}

function addSvgCallout(svg, {
  x,
  y,
  dx = 80,
  dy = -50,
  title,
  body,
  anchor = "start",
  textX = null,
  textY = null,
  maxWidth = 180,
  showLine = true
}) {
  const group = svg.append("g")
    .attr("class", "svg-callout");

  const labelX = textX === null ? x + dx + (anchor === "end" ? -8 : 8) : textX;
  const labelY = textY === null ? y + dy - 6 : textY;

  const lineEndX = anchor === "end" ? labelX + 6 : labelX - 6;
  const lineEndY = labelY + 8;

  if (showLine) {
    group.append("line")
      .attr("class", "callout-line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", lineEndX)
      .attr("y2", lineEndY);
  }

  group.append("circle")
    .attr("class", "callout-dot")
    .attr("cx", x)
    .attr("cy", y)
    .attr("r", 4.5);

  const textGroup = group.append("g")
    .attr("transform", `translate(${labelX},${labelY})`);

  const text = textGroup.append("text")
    .attr("class", "callout-text")
    .attr("text-anchor", anchor);

  text.append("tspan")
    .attr("class", "callout-title")
    .attr("x", 0)
    .attr("dy", 0)
    .text(title);

  wrapText(text, body, maxWidth, anchor);
}

function wrapText(text, body, width, anchor = "start") {
  const words = body.split(/\s+/).reverse();
  let word;
  let line = [];

  let tspan = text.append("tspan")
    .attr("x", 0)
    .attr("dy", 16)
    .attr("text-anchor", anchor);

  while (word = words.pop()) {
    line.push(word);
    tspan.text(line.join(" "));
    
    if (tspan.node().getComputedTextLength() > width) {
      line.pop();
      tspan.text(line.join(" "));
      line = [word];
      
      tspan = text.append("tspan")
        .attr("x", 0)
        .attr("dy", 14)
        .attr("text-anchor", anchor)
        .text(word);
    }
  }
}

function getProjectedStateCenter(fips, projection) {
  const feature = usStates.find(d => String(d.id).padStart(2, "0") === fips);
  return d3.geoPath(projection).centroid(feature);
}

function renderScene1() {
  addInteractionTip("Tip: Hover over a bar to see the exact case and death counts.");
  const sceneDate = scenes[0].date;
  const rows = (byDate.get(sceneDate) || [])
    .filter(d => d.cases > 0)
    .sort((a, b) => d3.descending(a.cases, b.cases))
    .slice(0, 12);

  const width = 940;
  const height = 520;
  const margin = { top: 42, right: 36, bottom: 90, left: 72 };

  const svg = vis.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left)
    .attr("y", 24)
    .text(`Reported cumulative cases by state on ${formatDate(sceneDate)}`);

  const x = d3.scaleBand()
    .domain(rows.map(d => d.state))
    .range([margin.left, width - margin.right])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.cases)]).nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-35)");

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  svg.selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("x", d => x(d.state))
    .attr("y", d => y(d.cases))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.cases))
    .attr("rx", 5)
    .attr("fill", "#3b82f6")
    .on("mousemove", (event, d) => showTooltip(event, `<strong>${d.state}</strong><br>${d3.format(",")(d.cases)} cases<br>${d3.format(",")(d.deaths)} deaths`))
    .on("mouseleave", hideTooltip);

  const top = rows[0];
  addSvgCallout(svg, {
    x: x(top.state) + x.bandwidth() / 2,
    y: y(top.cases),
    textX: margin.left + 360,
    textY: margin.top + 95,
    maxWidth: 220,
    title: "Early concentration",
    body: `${top.state} led this early snapshot, showing that reported cases were still concentrated rather than evenly spread.`
  });
}

function renderScene2() {
  selectedDate = selectedDate || "2020-12-31";
  addInteractionTip("Tip: Move the date slider and hover over states to see detailed values.");
  addDateSlider(selectedDate, value => {
    selectedDate = value;
    renderScene2MapOnly();
  });

  renderScene2MapOnly();
}

function renderScene2MapOnly() {
  vis.html("");
  renderMap({
    container: vis,
    date: selectedDate,
    metric: "cases",
    selectedState: null,
    onClickState: null,
    title: `Cumulative reported cases on ${formatDate(selectedDate)}`,
    calloutFips: "36",
    calloutTitle: "Visible outbreak center",
    calloutBody: "New York was one of the most visible outbreak centers in 2020."
  });
}

function renderScene3() {
  selectedDate = selectedDate || "2020-12-31";
  addInteractionTip("Tip: Click a state on the map or use the dropdown, then hover over the map or line chart for details.");
  addDateSlider(selectedDate, value => {
    selectedDate = value;
    drawScene3();
  });
  addMetricToggle();
  addStateDropdown();
  drawScene3();
}

function drawScene3() {
  vis.html("");

  const wrap = vis.append("div")
    .style("display", "grid")
    .style("grid-template-columns", "minmax(320px, 1fr) minmax(320px, 1fr)")
    .style("gap", "20px")
    .style("align-items", "start");

  const mapDiv = wrap.append("div");
  const lineDiv = wrap.append("div");

  const selectedFips = getFipsForState(selectedState);

  renderMap({
    container: mapDiv,
    date: selectedDate,
    metric: selectedMetric,
    selectedState,
    onClickState: state => {
      selectedState = state;
      d3.select("#stateSelect").property("value", selectedState);
      drawScene3();
    },
    title: `${capitalize(selectedMetric)} by state on ${formatDate(selectedDate)}`,
    calloutFips: selectedFips,
    calloutTitle: "Selected state",
    calloutBody: `${selectedState} is highlighted for closer inspection.`
  });

  renderLineChart(lineDiv);
}

function renderMap({ container, date, metric, selectedState, onClickState, title, calloutFips, calloutTitle, calloutBody }) {
  const width = 620;
  const height = 420;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", 12)
    .attr("y", 24)
    .text(title);

  const projection = d3.geoAlbersUsa()
    .fitSize([width, height - 30], { type: "FeatureCollection", features: usStates });

  const path = d3.geoPath(projection);
  const rows = byDate.get(date) || [];
  
  const rowByFips = d3.index(rows, d => d.fips);

  const maxValue = d3.max(rows, d => d[metric]) || 1;
  const color = d3.scaleSequentialLog()
    .domain([1, maxValue])
    .interpolator(d3.interpolateBlues);

  svg.append("g")
    .attr("transform", "translate(0,24)")
    .selectAll("path")
    .data(usStates)
    .join("path")
    .attr("class", d => {
      const fips = String(d.id).padStart(2, "0");
      const name = stateNameByFips.get(fips);
      return name === selectedState ? "state selected-state" : "state";
    })
    .attr("d", path)
    .attr("fill", d => {
      const fips = String(d.id).padStart(2, "0");
      const row = rowByFips.get(fips);
      const value = row ? row[metric] : 0;
      return value > 0 ? color(value) : "#e5e7eb";
    })
    .on("mousemove", (event, d) => {
      const fips = String(d.id).padStart(2, "0");
      const row = rowByFips.get(fips);
      const name = stateNameByFips.get(fips) || "Unknown";
      const value = row ? d3.format(",")(row[metric]) : "No data";
      const cases = row ? d3.format(",")(row.cases) : "No data";
      const deaths = row ? d3.format(",")(row.deaths) : "No data";
      showTooltip(event, `<strong>${name}</strong><br>${capitalize(metric)}: ${value}<br>Cases: ${cases}<br>Deaths: ${deaths}`);
    })
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => {
      if (!onClickState) return;
      const fips = String(d.id).padStart(2, "0");
      const name = stateNameByFips.get(fips);
      if (name) onClickState(name);
    });

  const center = getProjectedStateCenter(calloutFips, projection);
  if (center) {
    const adjustedX = center[0];
    const adjustedY = center[1] + 24;
    const row = rowByFips.get(String(calloutFips).padStart(2, "0"));
    const valueText = row ? d3.format(",")(row[metric]) : "No data";
    addSvgCallout(svg, {
      x: adjustedX,
      y: adjustedY,
      textX: width - 45,
      textY: 55,
      anchor: "end",
      maxWidth: 180,
      showLine: false,
      title: calloutTitle,
      body: `${calloutBody} ${capitalize(metric)}: ${valueText}.`
    });
  }

  drawLegend(svg, color, maxValue, width, height);
}

function drawLegend(svg, color, maxValue, width, height) {
  const legendWidth = 180;
  const legendHeight = 10;
  const x = d3.scaleLinear()
    .domain([0, legendWidth])
    .range([1, maxValue]);

  const legend = svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 24},${height - 28})`);

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(x(t * legendWidth)));
  });

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#legend-gradient)");

  legend.append("text")
    .attr("class", "chart-note")
    .attr("x", 0)
    .attr("y", -6)
    .text("Lower");

  legend.append("text")
    .attr("class", "chart-note")
    .attr("x", legendWidth)
    .attr("y", -6)
    .attr("text-anchor", "end")
    .text("Higher");
}

function renderLineChart(container) {
  const stateRows = (byState.get(selectedState) || [])
    .filter(d => d.date.startsWith("2020"));

  const width = 620;
  const height = 420;
  const margin = { top: 44, right: 34, bottom: 44, left: 70 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left)
    .attr("y", 24)
    .text(`${selectedState}: cumulative ${selectedMetric} in 2020`);

  const parse = d3.timeParse("%Y-%m-%d");
  const x = d3.scaleTime()
    .domain(d3.extent(stateRows, d => parse(d.date)))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stateRows, d => d[selectedMetric]) || 1]).nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  const line = d3.line()
    .x(d => x(parse(d.date)))
    .y(d => y(d[selectedMetric]));

  svg.append("path")
    .datum(stateRows)
    .attr("fill", "none")
    .attr("stroke", "#1d4ed8")
    .attr("stroke-width", 3)
    .attr("d", line);

  const selectedRow = stateRows.find(d => d.date === selectedDate);

  svg.append("circle")
    .attr("cx", x(parse(selectedRow.date)))
    .attr("cy", y(selectedRow[selectedMetric]))
    .attr("r", 6)
    .attr("fill", "#ef4444");

  svg.append("line")
    .attr("x1", x(parse(selectedRow.date)))
    .attr("x2", x(parse(selectedRow.date)))
    .attr("y1", y(selectedRow[selectedMetric]))
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#ef4444")
    .attr("stroke-dasharray", "4 4");

  svg.append("text")
    .attr("class", "chart-note")
    .attr("x", margin.left)
    .attr("y", height - 8)
    .text(`${formatDate(selectedRow.date)}: ${d3.format(",")(selectedRow[selectedMetric])} cumulative ${selectedMetric}`);

  const pointX = x(parse(selectedRow.date));
  const pointY = y(selectedRow[selectedMetric]);
  addSvgCallout(svg, {
    x: pointX,
    y: pointY,
    textX: pointX > width * 0.66 ? pointX - 105 : pointX + 95,
    textY: pointY < height * 0.35 ? pointY + 80 : pointY - 70,
    anchor: pointX > width * 0.66 ? "end" : "start",
    maxWidth: 160,
    title: "Selected date value",
    body: `${d3.format(",")(selectedRow[selectedMetric])} cumulative ${selectedMetric} on ${formatDate(selectedRow.date)}.`
  });

  svg.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const bisect = d3.bisector(d => parse(d.date)).center;
      const i = bisect(stateRows, date);
      const d = stateRows[Math.max(0, Math.min(stateRows.length - 1, i))];
      showTooltip(event, `<strong>${selectedState}</strong><br>${formatDate(d.date)}<br>${capitalize(selectedMetric)}: ${d3.format(",")(d[selectedMetric])}`);
    })
    .on("mouseleave", hideTooltip);
}

function addDateSlider(initialValue, onChange) {
  const group = controls.append("div").attr("class", "control-group");
  group.append("label").attr("for", "dateSlider").text("Date");
  group.append("input")
    .attr("id", "dateSlider")
    .attr("type", "range")
    .attr("min", 0)
    .attr("max", dates.length - 1)
    .attr("value", dates.indexOf(initialValue) >= 0 ? dates.indexOf(initialValue) : dates.length - 1)
    .on("input", function () {
      const value = dates[+this.value];
      d3.select("#dateLabel").text(formatDate(value));
      onChange(value);
    });
  group.append("span")
    .attr("id", "dateLabel")
    .text(formatDate(initialValue));
}

function addMetricToggle() {
  const group = controls.append("div").attr("class", "control-group");
  group.append("label").text("Metric");
  group.selectAll("button.metric")
    .data(["cases", "deaths"])
    .join("button")
    .attr("class", "metric")
    .style("background", d => d === selectedMetric ? "#ea580c" : "#64748b")
    .text(d => capitalize(d))
    .on("click", (_, d) => {
      selectedMetric = d;
      render();
    });
}

function addStateDropdown() {
  const states = Array.from(byState.keys()).sort();
  const group = controls.append("div").attr("class", "control-group");
  group.append("label").attr("for", "stateSelect").text("State");
  group.append("select")
    .attr("id", "stateSelect")
    .selectAll("option")
    .data(states)
    .join("option")
    .attr("value", d => d)
    .property("selected", d => d === selectedState)
    .text(d => d);

  d3.select("#stateSelect").on("change", function () {
    selectedState = this.value;
    drawScene3();
  });
}

function getFipsForState(stateName) {
  return stateFipsByName.get(stateName);
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`)
    .html(html);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function formatDate(dateString) {
  const parse = d3.timeParse("%Y-%m-%d");
  const format = d3.timeFormat("%b %d, %Y");
  return format(parse(dateString));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}