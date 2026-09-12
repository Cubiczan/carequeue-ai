# Deep Research: Best Practices & Evidence Matrix

## A CFO's Operating Manual for Evidence-Based Decision Making

---

## 1. Why This Matters

Bad decisions don't come from lack of data. They come from undisciplined evidence gathering, confirmation bias in source selection, and failure to weight evidence by quality. This document provides a repeatable methodology for conducting deep research that produces decision-grade outputs — whether for board decks, investment theses, M&A due diligence, or strategic pivots.

**The core principle:** Treat every strategic question like a clinical trial. Define the question before you search. Grade every source. Track what you don't know as rigorously as what you do.

---

## 2. The 7-Phase Research Protocol

### Phase 1: Question Architecture

Before touching a search bar, decompose the research question using the **PICO-F framework** (adapted from clinical research for business):

| Element | Definition | Example |
|---------|-----------|---------|
| **P** — Population/Problem | What entity, market, or situation? | Battery recycling market in North America |
| **I** — Intervention/Initiative | What action or decision is being evaluated? | Equipment leasing vs. outright sale model |
| **C** — Comparator | What's the alternative or baseline? | Traditional capital equipment sales |
| **O** — Outcome | What metrics define success? | IRR, customer acquisition velocity, ARR impact |
| **F** — Frame | Time horizon, geography, constraints | Pre-IPO (6 months), ASX-listed comparables |

**Output:** A written research brief (1 paragraph) that anchors all subsequent work. If the brief is vague, the research will be vague.

### Phase 2: Source Strategy & Search Design

Map sources BEFORE searching. Use the **Source Pyramid**:

```
            ┌─────────────────┐
            │  PRIMARY DATA   │  ← Proprietary, highest value
            │  (Internal ops, │     Customer interviews, pilot data
            │   financials)   │
            ├─────────────────┤
            │  DOMAIN EXPERT  │  ← Investment banks, industry advisors,
            │   ANALYSIS      │     sector-specific consultancies
            ├─────────────────┤
            │  PEER-REVIEWED  │  ← Academic journals, government reports,
            │   & OFFICIAL    │     regulatory filings (SEC, ASX, ACRA)
            ├─────────────────┤
            │  HIGH-QUALITY   │  ← McKinsey/BCG/Bain, Bloomberg, Reuters,
            │   SECONDARY     │     S&P, specialized trade publications
            ├─────────────────┤
            │  GENERAL        │  ← News outlets, industry blogs,
            │   SECONDARY     │     conference presentations
            └─────────────────┘
```

**Search Protocol:**
1. Start broad with 1–2 word queries, then narrow with specifics
2. Run minimum 3 independent search paths per question to avoid single-source dependency
3. Document every search query and source visited (audit trail)
4. Prioritize original sources over aggregators — always find the primary document
5. Date-stamp everything — evidence decays, especially in fast-moving markets

### Phase 3: Evidence Collection & Extraction

For each source, extract into a structured note:

```
SOURCE ID:      [Unique reference]
TITLE:          [Full title]
AUTHOR/ORG:     [Who produced this]
DATE:           [Publication date]
SOURCE TYPE:    [Primary / Expert / Peer-reviewed / Secondary]
KEY CLAIMS:     [Bullet the 2-3 core assertions]
DATA POINTS:    [Specific numbers, benchmarks, metrics]
METHODOLOGY:    [How did they arrive at their conclusions?]
LIMITATIONS:    [What's missing, what's biased, what's assumed?]
RELEVANCE:      [High / Medium / Low to your research question]
CONTRADICTIONS: [Does this conflict with other sources? Which?]
```

### Phase 4: Evidence Quality Grading

Adapt the **GRADE framework** (used globally by WHO, NICE, and 100+ organizations) for business decisions:

| Grade | Label | Definition | Business Translation |
|-------|-------|-----------|---------------------|
| ⊕⊕⊕⊕ | **HIGH** | Very confident the true effect is close to the estimate | Audited financials, controlled A/B tests, verified operational data, regulatory filings |
| ⊕⊕⊕○ | **MODERATE** | Moderately confident; true effect likely close but could differ | Expert analysis with clear methodology, well-designed surveys, industry benchmarks from reputable firms |
| ⊕⊕○○ | **LOW** | Limited confidence; true effect may differ substantially | Case studies, analogies from adjacent markets, management estimates, unaudited projections |
| ⊕○○○ | **VERY LOW** | Very little confidence; true effect likely substantially different | Anecdotal evidence, single-source claims, undated materials, promotional content, AI-generated content without verification |

**Five Factors That Downgrade Evidence Quality:**

1. **Risk of Bias** — Who funded this? What's their incentive? (e.g., vendor whitepapers, sell-side analyst reports)
2. **Inconsistency** — Do different sources tell different stories? Unexplained variance = lower grade
3. **Indirectness** — Is the evidence from your exact context, or an analogy? (e.g., using SaaS metrics for hardware recycling)
4. **Imprecision** — Are the numbers ranges or point estimates? How wide are the confidence intervals?
5. **Publication Bias** — Are you only seeing positive outcomes? Where are the failures?

**Three Factors That Upgrade Evidence Quality:**

1. **Large Effect Size** — If the signal is overwhelming (e.g., 3x cost advantage), even moderate evidence becomes compelling
2. **Dose-Response** — More of X consistently yields more of Y across multiple sources
3. **Confounders Accounted** — The analysis controls for alternative explanations

### Phase 5: The Evidence Matrix

This is the core analytical artifact. Build it for every major decision.

#### 5a. Claim-Evidence Matrix

Map each claim to its supporting evidence, graded by quality:

| # | Claim / Hypothesis | Source 1 | Source 2 | Source 3 | Evidence Grade | Confidence Level |
|---|-------------------|----------|----------|----------|---------------|-----------------|
| 1 | Market will reach $X by 2030 | Bloomberg (⊕⊕⊕○) | Industry report (⊕⊕○○) | Mgmt estimate (⊕○○○) | MODERATE | Medium — two independent sources align, but methodology differs |
| 2 | Leasing model increases customer acquisition 2x | Competitor case study (⊕⊕○○) | Internal pilot (⊕⊕⊕⊕) | — | MODERATE-HIGH | High — internal data validates external analogy |
| 3 | Regulatory tailwinds will accelerate adoption | IRA legislation (⊕⊕⊕⊕) | DOE guidance (⊕⊕⊕○) | Trade association (⊕⊕○○) | HIGH | High — multiple official sources, consistent direction |

#### 5b. CSD Matrix (Certainties, Suppositions, Doubts)

Adapted from design thinking (Pinheiro & Alt), this is the executive-level summary:

| Certainties (Act on these) | Suppositions (Test these) | Doubts (Resolve before committing) |
|---------------------------|--------------------------|-----------------------------------|
| Things we know and have HIGH-grade evidence for | Things we believe based on MODERATE evidence — need validation | Things we don't know and need HIGH-grade evidence to proceed |
| *e.g., Regulatory framework supports domestic recycling* | *e.g., Leasing model will improve unit economics* | *e.g., Will offtake partners accept leasing terms?* |

#### 5c. Contradiction Matrix

When sources disagree, don't average — investigate:

| Topic | Source A Says | Source B Says | Resolution Path |
|-------|-------------|-------------|----------------|
| Market size 2030 | $15B (Industry report) | $25B (Consulting firm) | Check: different scope definitions? Different CAGR assumptions? Different geographies? |
| Recovery rates | 95% (Vendor claim) | 80% (Academic study) | Check: lab vs. production conditions? Feed material differences? |

### Phase 6: Synthesis & Decision Framing

Convert the evidence matrix into a decision-ready output using the **3-Box Framework**:

**Box 1 — What the Evidence Says** (facts only, no spin)
- Summarize the strongest claims with their evidence grades
- Flag material contradictions
- State what's unknown

**Box 2 — What It Means for Us** (interpretation)
- Apply to your specific context (company stage, market position, capital constraints)
- Identify asymmetric risks (what happens if we're wrong?)
- Model the scenarios: base case, upside, downside

**Box 3 — What We Should Do** (recommendation)
- State the recommendation clearly
- List the conditions under which the recommendation changes
- Define the next evidence milestones (what would cause us to revisit?)

### Phase 7: Evidence Maintenance

Research is not a one-time event. Establish a cadence:

| Trigger | Action |
|---------|--------|
| New data from operations | Update relevant claims in the Evidence Matrix |
| Quarterly board prep | Re-grade top 10 claims — has evidence strengthened or weakened? |
| Market shift / competitor move | Rapid re-assessment of affected claims |
| 6-month staleness | Any evidence >6 months old gets flagged for refresh |
| Pre-decision gate | Full matrix review before committing capital >$100K |

---

## 3. Evidence Quality Quick Reference

### Source Reliability Tier List

| Tier | Source Type | Typical Grade | Use Case |
|------|-----------|--------------|----------|
| **S** | Audited financials, regulatory filings, internal operational data | ⊕⊕⊕⊕ | Financial modeling, due diligence, compliance |
| **A** | Peer-reviewed research, government statistics, central bank data | ⊕⊕⊕⊕ to ⊕⊕⊕○ | Market sizing, technology validation, policy analysis |
| **B** | Top-tier consulting reports (McKinsey, BCG, Bain), Bloomberg, S&P | ⊕⊕⊕○ | Strategic benchmarking, market trends, competitive intel |
| **C** | Trade publications, industry associations, conference proceedings | ⊕⊕⊕○ to ⊕⊕○○ | Industry dynamics, emerging trends, expert opinion |
| **D** | News articles, company press releases, sell-side research | ⊕⊕○○ | Context and narrative, not for hard numbers |
| **F** | Social media, forums, unattributed claims, promotional content | ⊕○○○ | Signal detection only — never cite as evidence |

### Red Flags That Downgrade Any Source

- No author, no date, no methodology disclosed
- Funded by a party with direct financial interest in the conclusion
- Cherry-picked time frames or geographies
- Survivorship bias (only shows winners)
- Circular sourcing (Source A cites Source B which cites Source A)
- Claims precision where none exists (e.g., "the market will be exactly $14.7B")

---

## 4. Application Templates

### Template A: Investment Memo Evidence Matrix

For evaluating capital allocation decisions (M&A, capex, new markets):

| Decision Criterion | Evidence For | Grade | Evidence Against | Grade | Net Assessment |
|-------------------|-------------|-------|-----------------|-------|---------------|
| Strategic fit | [Source + claim] | ⊕⊕⊕○ | [Source + claim] | ⊕⊕○○ | Favorable |
| Financial return | [Source + claim] | ⊕⊕⊕⊕ | [Source + claim] | ⊕⊕⊕○ | Mixed — need sensitivity analysis |
| Execution risk | [Source + claim] | ⊕⊕○○ | [Source + claim] | ⊕⊕⊕○ | Unfavorable — mitigations needed |
| Market timing | [Source + claim] | ⊕⊕⊕○ | — | — | Favorable, but evidence is moderate |

### Template B: Due Diligence Evidence Tracker

For investor presentations and data room preparation:

| Claim in Investor Materials | Supporting Evidence | Grade | Verification Status | Risk if Challenged |
|---------------------------|-------------------|-------|-------------------|-------------------|
| Plant cost of $X | Invoices, contracts | ⊕⊕⊕⊕ | Verified | Low |
| Revenue projection of $Y | Management model | ⊕⊕○○ | Unverified | High — needs third-party validation |
| Technology advantage of Z% | Lab results + pilot | ⊕⊕⊕○ | Partially verified | Medium — needs production-scale confirmation |

### Template C: Competitive Intelligence Matrix

| Dimension | Our Position | Evidence | Competitor A | Evidence | Competitor B | Evidence |
|-----------|-------------|----------|-------------|----------|-------------|----------|
| Recovery rate | 95% | Internal ops (⊕⊕⊕⊕) | 85% | Trade pub (⊕⊕○○) | Unknown | — |
| Cost per ton | $X | Internal P&L (⊕⊕⊕⊕) | $Y | Conference pres (⊕⊕○○) | $Z | Press release (⊕○○○) |
| Customer base | [Named] | Contracts (⊕⊕⊕⊕) | [Inferred] | News (⊕⊕○○) | [Claimed] | Website (⊕○○○) |

---

## 5. Common Research Anti-Patterns

| Anti-Pattern | What It Looks Like | Fix |
|-------------|-------------------|-----|
| **Confirmation Bias** | Only searching for evidence that supports the thesis | Assign someone to build the counter-case. Use the Contradiction Matrix. |
| **Authority Bias** | "McKinsey said it, so it must be true" | Grade the methodology, not the brand. Even S-tier sources can be wrong. |
| **Recency Bias** | Over-weighting the latest article over longitudinal data | Always include historical data points. Ask "has this been true for 3+ years?" |
| **Anchoring** | First number you see becomes the reference point | Collect 3+ independent estimates before forming a view. |
| **Narrative Fallacy** | A compelling story overrides weak data | Separate the story from the numbers. Grade them independently. |
| **Precision Illusion** | False comfort from specific numbers on weak foundations | Always report confidence intervals. "Between $10B and $20B" beats "$14.7B" on weak evidence. |
| **Sunk Cost Trap** | Continuing research to justify time already spent | Set a time-box per phase. If evidence isn't converging, the question may be wrong. |

---

## 6. Integration with Decision Governance

This research methodology feeds into three decision frameworks:

### Pre-Mortem Gate
Before committing to a decision, ask: "If this fails in 12 months, what evidence did we ignore?" Cross-reference against the Doubts column of the CSD Matrix.

### Kill Criteria
Define upfront: "We abandon this initiative if [specific evidence condition] is met." Tie kill criteria to specific Evidence Matrix rows.

### Evidence Refresh Cadence
| Decision Type | Refresh Frequency | Who Owns It |
|--------------|-------------------|-------------|
| Active M&A | Weekly | Deal lead |
| Capital allocation >$500K | Monthly | CFO / Finance lead |
| Strategic plan assumptions | Quarterly | Strategy team |
| Market sizing / TAM | Semi-annually | Product / Strategy |
| Competitive positioning | Quarterly | Competitive intel |

---

## 7. Checklist: Before You Present Research

- [ ] Research question is written and specific (PICO-F complete)
- [ ] Minimum 3 independent source paths used
- [ ] Every claim has at least 2 sources
- [ ] All sources graded using the 4-tier GRADE system
- [ ] Contradictions identified and resolution paths documented
- [ ] CSD Matrix completed (Certainties / Suppositions / Doubts)
- [ ] Evidence grade matches the confidence of the recommendation
- [ ] Known gaps and limitations stated explicitly
- [ ] Time-sensitivity of evidence flagged (when does this expire?)
- [ ] Counter-arguments addressed, not ignored
- [ ] Decision-maker can trace any claim back to its source in <60 seconds

---

## Appendix: Key Frameworks Referenced

| Framework | Origin | Application |
|-----------|--------|------------|
| **GRADE** | WHO / Cochrane Collaboration (2000+) | Evidence quality grading — adapted here from clinical to business decisions |
| **PRISMA** | Moher et al. (2009, updated 2020) | Systematic review reporting — adapted here for search protocol discipline |
| **CSD Matrix** | Pinheiro, Alt & Livework São Paulo | Categorizing known/unknown/uncertain — used here for executive synthesis |
| **MECE** | McKinsey & Company | Mutually Exclusive, Collectively Exhaustive — applied to evidence categorization |
| **PICO** | Evidence-Based Medicine tradition | Question framing — extended here with F (Frame) for business context |
| **GE-McKinsey Matrix** | GE / McKinsey (1970s) | Portfolio evaluation — referenced as downstream consumer of evidence matrices |
| **Pre-Mortem** | Gary Klein (1989) | Prospective failure analysis — integrated as decision governance gate |

---

*Version 1.0 — Generated for strategic decision support. This is a living document. Update as your decision governance matures.*
