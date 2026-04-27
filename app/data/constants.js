/* Tool-wide constants.

   TOOL_VERSION_DATE: when the tool's encoded legal data was last reviewed.
   This is NOT today's date — it reflects when an HR/People Ops owner last
   verified that thresholds, state rules, and regulatory narrative are
   current. Update this value (and only this value, in this one file) when
   you do an annual review or push a mid-year correction. The date flows to
   the footer "Data last updated:" line, the memo header, and the
   Regulatory tab. */

const TOOL_VERSION_DATE = "April 26, 2026";

const FEDERAL_HCE_THRESHOLD = 107432;

const STRICT_ADMIN_STATES = ["new_york_nyc", "new_york_other", "oregon"];

/* Organization name for memo header + disclaimer.
   Blank by default; a deploying org can set this to customize. */
const ORG_NAME = "";

const STAGES = [
  "Employee Info",
  "HCE",
  "Computer Employee",
  "Administrative",
  "Executive",
  "Professional",
  "Results"
];
