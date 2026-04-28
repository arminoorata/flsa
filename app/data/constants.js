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
const FEDERAL_EAP_WEEKLY = 684;
const FEDERAL_EAP_ANNUAL = 35568;
const FEDERAL_COMPUTER_HOURLY = 27.63;

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

/* Pay basis options. Drives auto-answers for salary tests and Helix
   Energy v. Hewitt (2023) risk flags. */
const PAY_BASIS_OPTIONS = [
  { value: "salary", label: "Salary (predetermined fixed weekly+ amount, not reduced for quality/quantity of work)" },
  { value: "hourly", label: "Hourly rate" },
  { value: "day_rate", label: "Day rate (paid by the day, regardless of hours worked)" },
  { value: "fee_basis", label: "Fee basis (per project, case, or completed assignment)" },
  { value: "other", label: "Commission only, draw, piecework, or other" }
];

/* Severity levels for risk flags (highest to lowest impact). */
const FLAG_SEVERITY = {
  CRITICAL: { key: "critical", label: "Critical", rank: 0 },
  HIGH:     { key: "high",     label: "High",     rank: 1 },
  MEDIUM:   { key: "medium",   label: "Medium",   rank: 2 },
  LOW:      { key: "low",      label: "Low",      rank: 3 }
};
