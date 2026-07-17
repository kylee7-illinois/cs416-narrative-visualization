# CS416 COVID-19 Narrative Visualization

This project was created for the UIUC CS416 Narrative Visualization assignment. It uses D3 to show how reported COVID-19 cases spread across U.S. states during 2020.

The visualization starts with an early 2020 snapshot, then uses a map and date slider to show how the spread became national. The final scene lets users choose a state and compare its cumulative cases or deaths over time.

## Project Title

**How COVID-19 Spread Across the United States in 2020**

## Narrative Structure

This project uses an **interactive slideshow** structure.

The visualization contains three scenes:

1. **Early Outbreaks**  
   A bar chart showing that early reported cases were concentrated in a limited number of states.

2. **Nationwide Spread**  
   A U.S. choropleth map with a date slider showing how reported cases expanded across the country over time.

3. **State-Level Exploration**  
   A U.S. map and line chart that allow users to select a state, change the date, and switch between cumulative cases and cumulative deaths.

## Dataset

The project uses the New York Times COVID-19 state-level dataset.

Dataset source:

- New York Times COVID-19 Data  
  https://github.com/nytimes/covid-19-data

The main data file used by the visualization is:

- `us-states.csv`

The dataset contains cumulative reported COVID-19 cases and deaths by U.S. state and date.

Relevant columns:

- `date`
- `state`
- `fips`
- `cases`
- `deaths`

## Libraries

This project is implemented with D3 and TopoJSON Client.

Libraries used:

- D3
- TopoJSON Client

No Tableau, Vega, Vega-Lite, Plotly, or other high-level visualization libraries are used.

## Files

Required project files:

- `index.html` - The main application entry point and layout template.
- `style.css` - Custom responsive layout and visual styling.
- `script.js` - D3 code for loading data, drawing scenes, and handling interactions.
- `README.md` - Project description and run instructions.
- `us-states.csv` - New York Times 2020 COVID-19 dataset

## Interactions

The visualization includes the following user interactions:

- Previous / Next scene buttons
- Scene navigation dots
- Date slider
- State dropdown
- Cases / Deaths metric toggle
- State click interaction on the map
- Tooltip hover interaction on bars, states, and the line chart

## Parameters

The main visualization parameters are:

- `currentScene`
- `selectedDate`
- `selectedMetric`
- `selectedState`

These parameters control which scene is displayed, which date is shown, which metric is visualized, and which state is selected.

## Annotations

The visualization includes fixed annotations that appear as part of each scene. These annotations highlight important data points or trends and do not depend on mouseover interaction.

Tooltips are also provided as additional free-form interaction.

## Local Run

For local testing, run the project from a local web server instead of opening `index.html` directly. This is recommended because the page loads data files through JavaScript.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deployment

The project is deployed through GitHub Pages from the repository’s main branch. The deployed page was tested in Chrome to verify that the local CSV, external TopoJSON file, controls, annotations, and tooltips load correctly.

## Notes

After deployment, test the hosted page to make sure the data files load and that the scene navigation, slider, dropdown, map click, annotations, and tooltips work correctly.
