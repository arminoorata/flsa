# 02 — Regulatory Context

This document provides the legal and regulatory background necessary to understand why the tool exists and what it encodes. A builder must understand this context to implement the tool correctly. Thresholds and rules without context lead to misimplementation.

---

## The Fair Labor Standards Act (FLSA)

### What It Is

The FLSA is the primary federal law governing minimum wage, overtime pay, and youth employment. It was enacted in 1938 and has been amended many times. It is codified at **29 U.S.C. §§ 201-219** and implemented through regulations at **29 C.F.R. Parts 500-899**.

### Core Rule: Overtime

Under FLSA **Section 7** (29 U.S.C. § 207), covered non-exempt employees must be paid overtime at **1.5 times the regular rate of pay** for all hours worked over 40 in a workweek. Some states have stricter rules (daily overtime, double time, etc.).

### The Exemption System

FLSA **Section 13** (29 U.S.C. § 213) provides numerous exemptions from minimum wage and overtime requirements. The most commonly used are the "white collar" exemptions in Section 13(a)(1) and Section 13(a)(17):

- **Executive** (29 C.F.R. § 541.100)
- **Administrative** (29 C.F.R. § 541.200)
- **Professional** (29 C.F.R. § 541.300)
- **Computer Employee** (29 C.F.R. § 541.400)
- **Outside Sales** (29 C.F.R. § 541.500)
- **Highly Compensated Employee** (29 C.F.R. § 541.601)

Each exemption has its own specific requirements, typically involving:
1. **Salary basis test:** Paid on a salary (not hourly) basis
2. **Salary level test:** Paid at or above a minimum threshold
3. **Duties test:** Primary duties meet specific criteria

An employee must pass ALL applicable tests to be exempt. Job titles are irrelevant, only actual duties matter.

---

## The 2024 DOL Rule and Its Invalidation

### The Biden DOL's April 2024 Rule

On April 23, 2024, the U.S. Department of Labor (DOL) issued a final rule titled "Defining and Delimiting the Exemptions for Executive, Administrative, Professional, Outside Sales, and Computer Employees." The rule proposed a two-step increase to the salary thresholds:

| Date | EAP Threshold | HCE Threshold |
|------|--------------|---------------|
| Before July 1, 2024 | $684/week ($35,568/yr) | $107,432/yr |
| July 1, 2024 | $844/week ($43,888/yr) | $132,964/yr |
| January 1, 2025 | $1,128/week ($58,656/yr) | $151,164/yr |

The rule also included automatic triennial updates beginning July 1, 2027.

**Source:** 89 Fed. Reg. 32,842 (April 26, 2024); 29 C.F.R. Part 541.

### The Texas Court Decision

On November 15, 2024, Judge Sean Jordan of the U.S. District Court for the Eastern District of Texas vacated the rule in its entirety in *Texas v. U.S. Department of Labor*, No. 4:24-CV-499.

The court held that the DOL exceeded its statutory authority by:

1. **Displacing the duties test with a salary test.** The court found that raising the salary threshold so high that millions of otherwise-qualifying employees would become non-exempt solely due to salary was inconsistent with the FLSA's statutory text, which defines exemptions based on duties.

2. **Improperly implementing automatic indexing.** The triennial auto-update mechanism circumvented the notice-and-comment rulemaking requirements of the Administrative Procedure Act.

The ruling was nationwide and reversed BOTH the July 2024 increase ($844/week) AND the planned January 2025 increase ($1,128/week). The salary thresholds reverted to the 2019 levels:

- **EAP salary minimum:** $684/week ($35,568/year)
- **HCE total compensation:** $107,432/year
- **Computer employee hourly alternative:** $27.63/hour

**These are the thresholds in effect as of April 2026.**

### The Trump DOL Outlook

The DOL's Spring 2025 regulatory agenda listed overtime rulemaking as a "long-term" project with no specific proposed rule date. Historically:

- The **Trump 2019 rule** raised the threshold from $455/week (set in 2004) to $684/week, a modest but meaningful increase. This is the rule currently in effect.
- The **Trump 2024 campaign** proposed eliminating taxes on overtime pay. No legislation has been enacted. Such a change would affect take-home pay for non-exempt employees but would not change classification rules.

**Expected trajectory:** Any future Trump DOL overtime rule would likely propose a modest threshold increase (splitting the difference between the current $684/week and the struck-down $1,128/week). Such a rule would go through notice-and-comment rulemaking, meaning 12+ months from proposal to implementation. No such rule has been proposed as of April 2026.

Other Trump DOL priorities listed in the regulatory agenda:
- Independent contractor classification rulemaking (September 2025 target)
- Joint employer standards (December 2025 target)
- Tip credit and service charge clarifications

**Tool implication:** The tool must display CURRENT thresholds ($684/week, $107,432 HCE) and must include a Regulatory Landscape tab explaining the status of pending changes. When new rules are proposed or finalized, the threshold data file must be updated.

---

## State Law Overlay

The FLSA establishes a **floor, not a ceiling.** States may impose stricter requirements, and when they do, the state law applies. Key principles:

### More Protective Standard Wins

When federal and state law differ:
- Higher salary threshold applies
- Stricter duties test applies
- Employee benefits from the combination

### Example: California Software Engineer

A software engineer in California making $100,000/year:
- **Federal computer employee test:** Salary ≥ $684/week? YES (passes at $100K)
- **California computer employee test:** Salary ≥ $122,573.13/year? NO ($100K is below)
- **Result:** Employee is NOT exempt under the CA computer employee exemption. Must be classified as NON-EXEMPT and paid overtime (with California's daily OT rules).

This is the most common misclassification error: applying federal thresholds to California employees without checking the much higher state thresholds.

### High-Impact States for Classification

The tool encodes state-specific rules for these jurisdictions:

| State | Key Differences from Federal |
|-------|------------------------------|
| **California** | Much higher salary thresholds; daily OT rules; "50%+ time" quantitative duties test; separate computer software exemption with its own very high threshold |
| **New York** | Higher EAP threshold varying by region; administrative exemption cannot apply to customer-facing work |
| **Washington** | Highest EAP threshold in the US; computer professional hourly threshold |
| **Colorado** | Daily OT for >12 hours; computer exemption requirements beyond federal |
| **Connecticut** | Does NOT recognize HCE exemption at all |
| **Oregon** | Same administrative restriction as New York |
| **Maine** | Higher EAP threshold tied to minimum wage |

See `04-data-model.md` for the specific 2026 threshold values.

---

## The Exemption Categories in Detail

### Highly Compensated Employee (HCE) — 29 C.F.R. § 541.601

Applies to employees who:
1. Receive total annual compensation of at least $107,432 (federal)
2. Perform office or non-manual work as their primary duty
3. Customarily and regularly perform AT LEAST ONE exempt duty from the executive, administrative, or professional exemptions

The HCE exemption is a **shortcut** designed for highly paid white-collar workers. Instead of meeting the FULL duties test for any single exemption, they only need to regularly perform ONE exempt duty.

**Important:** Connecticut does not recognize this exemption. CT employees must meet full duties tests regardless of salary.

**Legal basis:** The $107,432 threshold requires at least $684/week be paid on a salary or fee basis; the remainder can include nondiscretionary bonuses, commissions, and other compensation, but NOT equity grants at grant (they count when they vest and are paid). See 29 C.F.R. § 541.601(b).

### Computer Employee — 29 C.F.R. § 541.400

Applies to computer systems analysts, computer programmers, software engineers, and other similarly skilled workers who:
1. Are paid either (a) on a salary/fee basis at ≥ $684/week OR (b) on an hourly basis at ≥ $27.63/hour
2. Have a primary duty consisting of:
   - (A) Applying systems analysis techniques and procedures (consulting with users to determine functional specifications)
   - (B) Designing, developing, documenting, analyzing, creating, testing, or modifying computer systems or programs based on user or system design specifications
   - (C) Designing, documenting, testing, creating, or modifying computer programs related to machine operating systems
   - (D) A combination of the above requiring the same skill level

**Does NOT apply to:**
- Hardware manufacture or repair (29 C.F.R. § 541.401)
- Employees who use computers as tools (CAD operators, writers, graphic designers)
- Entry-level workers lacking the skill to work independently

**Legal basis:** FLSA Sections 13(a)(1) and 13(a)(17); 29 C.F.R. §§ 541.400-541.402. DOL Fact Sheet #17E.

**California note:** California Labor Code § 515.5 has its own computer software professional exemption with a MUCH higher salary threshold (currently $122,573.13/year) and additional duties requirements. California treats this as a separate, stricter exemption from the federal one.

### Administrative — 29 C.F.R. § 541.200

Applies to employees who:
1. Are paid on a salary or fee basis at ≥ $684/week (federal) or higher state threshold
2. Have a primary duty of office or non-manual work directly related to the MANAGEMENT or GENERAL BUSINESS OPERATIONS of the employer or the employer's customers
3. Include the exercise of DISCRETION AND INDEPENDENT JUDGMENT with respect to matters of significance

**The critical distinction: production vs. administration.**

"Administrative" means work that supports RUNNING the business:
- Human Resources, finance, legal, compliance, accounting
- Marketing, public relations, government relations
- Quality control, procurement, safety
- Risk management, business development (analytical, not sales)
- IT administration (not software development)

"Production" means work that IS the business's core output:
- For a software company: software engineering
- For a manufacturer: assembly-line work
- For a consulting firm: client service delivery
- For a retailer: selling merchandise

**Production roles generally DO NOT qualify** for the administrative exemption, even if highly paid and exercising judgment. This is the single most common misclassification error.

**State variations:**
- **New York and Oregon:** Administrative exemption cannot be satisfied by duties relating to CUSTOMERS. The primary duty must relate to the management or general business operations of the EMPLOYER ITSELF.

**Legal basis:** 29 C.F.R. §§ 541.200-541.204. See also *Helix Energy Solutions v. Hewitt*, 598 U.S. 39 (2023) for a recent Supreme Court decision on related salary-basis issues.

### Executive — 29 C.F.R. § 541.100

Applies to employees who:
1. Are paid on a salary basis at ≥ $684/week (federal) or higher state threshold
2. Have a primary duty of MANAGEMENT of the enterprise or a customarily recognized department or subdivision
3. Customarily and regularly direct the work of at least TWO OR MORE other full-time employees (or their equivalent)
4. Have the authority to hire or fire, OR their recommendations on hiring, firing, advancement, or promotion are given particular weight

**Hard requirement:** Without 2+ FTE direct reports whose work is regularly directed, the executive exemption cannot apply. Managing one person, or temporarily managing a project team, is insufficient.

**"Particular weight":** The employee's recommendations on personnel decisions must be part of the process and given serious consideration, even if not always followed. Factors include: whether such recommendations are part of job duties, frequency, and whether they are usually followed (29 C.F.R. § 541.105).

**Legal basis:** 29 C.F.R. §§ 541.100-541.106. DOL Fact Sheet #17B.

### Learned Professional — 29 C.F.R. § 541.301

Applies to employees who:
1. Are paid on a salary or fee basis at ≥ $684/week (federal) or higher state threshold
2. Have a primary duty requiring advanced knowledge in a field of science or learning
3. The knowledge is acquired by a PROLONGED COURSE OF SPECIALIZED INTELLECTUAL INSTRUCTION

**Traditional learned professions:**
- Law (JD + bar admission)
- Medicine (MD, DO)
- Accounting (CPA)
- Engineering (licensed PE)
- Architecture (licensed)
- Teaching (certified teachers)
- Actuarial science
- Certain sciences (chemistry, biology, physics) at advanced levels
- Pharmacy

**Does NOT include:**
- General business degrees
- Skills acquired through experience only
- Roles where the degree is preferred but not strictly required

**Legal basis:** 29 C.F.R. §§ 541.301-541.304. DOL Fact Sheet #17D.

### Outside Sales — 29 C.F.R. § 541.500

Applies to employees who:
1. Have a primary duty of MAKING SALES or obtaining orders/contracts for services or facilities
2. Are customarily and regularly engaged AWAY from the employer's place of business

**No salary requirement** exists for this exemption (uniquely among the white-collar exemptions).

**"Away from the employer's place of business"** means in the field, at customer locations, traveling. Selling from an office, home office, or via phone/video does NOT qualify. Inside sales reps, sales development reps (SDRs), and remote account managers are typically NOT exempt under outside sales, regardless of revenue generated.

**Legal basis:** 29 C.F.R. §§ 541.500-541.504. DOL Fact Sheet #17F.

---

## Overtime Calculation: Regular Rate

If a rebuilder is tempted to say "just pay 1.5x the hourly rate," note that the "regular rate" for overtime calculation is more complex:

- Non-discretionary bonuses, commissions, shift differentials, and other incentive pay MUST be included in the regular rate calculation.
- Only TRULY discretionary bonuses (given at employer's sole discretion, not announced in advance, not based on performance metrics) can be excluded.
- See 29 C.F.R. Part 778 for detailed regular rate calculation rules.

**Tool implication:** The tool mentions this in the overtime rules section of the memo for non-exempt employees. It does not calculate actual overtime pay.

---

## Why Fintech Is Tricky

Crypto/fintech companies face several classification challenges that the tool addresses:

1. **High-paid technical talent.** Many software engineers meet the federal computer employee threshold but not California's. The tool explicitly tests both.

2. **Production vs. administration confusion.** Product managers, technical program managers, and similar roles are borderline. The tool forces the user to explicitly categorize.

3. **"Quant" and compliance roles.** These may qualify under professional exemption if credentialed, or administrative if business-facing. The tool tests both.

4. **Remote workforce spans jurisdictions.** An employee's work state determines their applicable law. The tool asks for work state explicitly and applies state-specific rules.

5. **IPO readiness.** Public company standards for classification documentation are higher. The memo output is designed to satisfy audit standards.

---

## Bottom Line for the Builder

The tool's job is to walk an HR user through:

1. Salary-based tests (easy, mathematical)
2. Duties-based tests (hard, judgment-based)
3. State overlay (critical, missed by many tools)
4. Memo generation with documented reasoning (for audit)

The tool must be faithful to the regulatory structure (6 exemption categories, each with specific tests) while being usable by non-lawyers. It must flag borderline cases rather than force binary outcomes.

Continue to `03-requirements.md`.
