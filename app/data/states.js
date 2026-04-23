/* All 50 states + DC, with NY split into two regions. Alphabetical. */

const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico",
  "New York (NYC/Nassau/Suffolk/Westchester)", "New York (rest of state)",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
];

/* Maps state labels to THRESHOLDS keys. States not in this map use federal. */
const STATE_TO_THRESHOLD = {
  "California": "california",
  "Colorado": "colorado",
  "Connecticut": "connecticut",
  "Maine": "maine",
  "New York (NYC/Nassau/Suffolk/Westchester)": "new_york_nyc",
  "New York (rest of state)": "new_york_other",
  "Washington": "washington",
  "Oregon": "oregon"
};

function getStateKey(stateLabel) {
  return STATE_TO_THRESHOLD[stateLabel] || "federal";
}

function getThreshold(stateLabel) {
  return THRESHOLDS[getStateKey(stateLabel)];
}
