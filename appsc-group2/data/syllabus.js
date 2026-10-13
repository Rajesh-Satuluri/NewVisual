/* APPSC Group 2 — official syllabus tree + exam blueprint + notification history.
   Phase 0: structure only. Each leaf topic carries a `pyq` slot (null until Phase 1
   attaches real previous-year questions). The app is PYQ-aware from day one, so
   Phase 1 is a pure data drop-in — no UI rewrite.

   Syllabus compiled from APPSC public syllabus sources (psc.ap.gov.in scheme,
   Prepp / StudyIQ / Adda247 / KPIAS). To be reconciled against the official
   2026 notification when released (~Oct 2026). The Mains is encoded to the
   current (2023-onward) OBJECTIVE 2-paper pattern; an older scheme used a
   descriptive format — see `blueprintNote`. */
window.APPSC_G2 = {
  exam: "APPSC Group 2",
  updated: "2026-10-13",
  phase: 0,
  phaseNote: "Phase 0 = syllabus skeleton. Previous-year questions, coverage gaps, heatmaps and quiz arrive in Phase 1 once PYQ PDFs are parsed.",
  blueprintNote: "Encoded to the current objective 2-paper Mains pattern (2023 onward). Older cycles used a descriptive scheme and some lists show a 3rd paper — confirm against the official 2026 notification before relying on paper boundaries.",

  /* ---- Exam pattern / blueprint ---- */
  pattern: {
    prelims: {
      name: "Preliminary (Screening) Test",
      papers: [
        { label: "Paper I — General Studies & Mental Ability", questions: 150, marks: 150, minutes: 150 }
      ],
      negative: "1/3 mark per wrong answer",
      meritCounts: false,
      note: "Screening only — marks are NOT counted in the final merit list. It only shortlists candidates for the Mains."
    },
    mains: {
      name: "Main Examination",
      papers: [
        { label: "Paper I — AP Social & Cultural History + Indian Constitution", questions: 150, marks: 150, minutes: 150 },
        { label: "Paper II — Indian & AP Economy + Science & Technology", questions: 150, marks: 150, minutes: 150 }
      ],
      negative: "1/3 mark per wrong answer",
      meritCounts: true,
      note: "Objective type. Mains marks decide the final merit ranking."
    },
    cpt: {
      name: "Computer Proficiency Test (CPT)",
      marks: 100,
      meritCounts: false,
      note: "Qualifying only. Minimum: 40 (OC), 35 (BC), 30 (SC/ST/PH)."
    }
  },

  /* ---- Notification history (frequency) ---- */
  notifications: [
    { year: "2008", no: "reported", posts: null, verified: false, note: "Earlier cycle — reported by prep sites, not verified against an official source." },
    { year: "2011", no: "reported", posts: null, verified: false, note: "Earlier cycle — reported by prep sites, not verified against an official source." },
    { year: "2016", no: "18/2016", posts: null, verified: true, note: "Screening + Mains stages referenced on the APPSC portal." },
    { year: "2018–19", no: "notified 31 Dec 2018", posts: 446, verified: true, screening: "5 May 2019", mains: "18–19 Jul 2019", note: "446 vacancies." },
    { year: "2023–24", no: "11/2023", posts: 897, verified: true, screening: "25 Feb 2024", mains: "Feb 2025", note: "~897 posts. Advert released 7 Dec 2023." },
    { year: "2026", no: "expected ~15 Oct 2026", posts: 700, verified: false, upcoming: true, note: "Upcoming cycle — sources vary (≈673–750 posts). Confirm on psc.ap.gov.in." }
  ],

  /* ---- Syllabus tree: stages -> papers -> sections -> topics ----
     Each section has `marks` (official where known). Topics split the section
     weight; `pyq` is null in Phase 0. `ap` flags Andhra-Pradesh-specific topics. */
  syllabus: [
    {
      stage: "Prelims",
      code: "P",
      paper: "Screening Test — General Studies & Mental Ability",
      marks: 150, questions: 150, minutes: 150,
      meritCounts: false,
      intro: "One objective paper. Official 10-point screening syllabus. No official per-area mark split, so weights below are indicative; Phase 1 PYQ counts will replace them.",
      sections: [
        { name: "Current Events", marks: null, topics: [
          { name: "Regional, national & international current affairs" },
          { name: "Government schemes & policies in the news" }
        ]},
        { name: "History of India & National Movement", marks: null, topics: [
          { name: "Ancient, medieval & modern India (overview)" },
          { name: "Indian National Movement 1857–1947" },
          { name: "History of Andhra Pradesh", ap: true }
        ]},
        { name: "Geography — India, World & AP", marks: null, topics: [
          { name: "Physical geography & landforms" },
          { name: "Indian & world geography (economic, social)" },
          { name: "Geography of Andhra Pradesh", ap: true }
        ]},
        { name: "Indian Polity & Governance", marks: null, topics: [
          { name: "Constitution, political system & public policy" },
          { name: "Panchayati Raj & local governance" },
          { name: "Rights issues & governance" }
        ]},
        { name: "Indian Economy & Planning", marks: null, topics: [
          { name: "Economic & social development, planning" },
          { name: "Poverty, inclusion, demographics" },
          { name: "Sustainable development" }
        ]},
        { name: "General Science & Technology", marks: null, topics: [
          { name: "General science & everyday applications" },
          { name: "Contemporary developments in S&T and IT" }
        ]},
        { name: "Environment & Ecology", marks: null, topics: [
          { name: "Ecology, biodiversity & climate change (general awareness)" }
        ]},
        { name: "Disaster Management", marks: null, topics: [
          { name: "Vulnerability profile, prevention & mitigation strategies" }
        ]},
        { name: "AP Bifurcation & its Implications", marks: null, ap: true, topics: [
          { name: "Administrative, economic, social, cultural, political & legal implications of the 2014 bifurcation", ap: true }
        ]},
        { name: "Reasoning & Data Interpretation", marks: null, topics: [
          { name: "Logical reasoning & analytical ability" },
          { name: "Data interpretation & data analysis (tables, charts, probability)" }
        ]}
      ]
    },

    {
      stage: "Mains",
      code: "M1A",
      paper: "Paper I · Section A — Social & Cultural History of Andhra Pradesh",
      marks: 75,
      meritCounts: true,
      sections: [
        { name: "Early Dynasties & Culture (up to ~10th c.)", marks: 19, ap: true, topics: [
          { name: "Pre-historic cultures of Andhra" },
          { name: "Satavahanas — society, religion, art" },
          { name: "Ikshvakus & Vishnukundins" },
          { name: "Eastern Chalukyas of Vengi & Andhra Cholas" },
          { name: "Telugu language, art & architecture of the period" }
        ]},
        { name: "11th–16th Century Andhradesa", marks: 19, ap: true, topics: [
          { name: "Major & minor dynasties, 11th–16th c. A.D." },
          { name: "Socio-cultural & religious conditions; caste; status of women" },
          { name: "Growth of Telugu language, literature, art & painting" }
        ]},
        { name: "Colonial & Nationalist Andhra (1757–1947)", marks: 19, ap: true, topics: [
          { name: "Advent of Europeans; rise & consolidation of Company rule" },
          { name: "1857 Revolt & its impact on Andhra" },
          { name: "Socio-cultural awakening; Justice Party / Self-Respect Movement" },
          { name: "Nationalist movement in Andhra 1885–1947; role of press" }
        ]},
        { name: "Andhra Movement & State Formation (1900–2014)", marks: 18, ap: true, topics: [
          { name: "Origin & growth of the Andhra movement; Andhra Mahasabhas" },
          { name: "Formation of Andhra State 1953; Visalandhra; SRC; Gentlemen's Agreement" },
          { name: "Formation of Andhra Pradesh 1956" },
          { name: "Important social & cultural events 1956–2014" }
        ]}
      ]
    },

    {
      stage: "Mains",
      code: "M1B",
      paper: "Paper I · Section B — Overview of the Indian Constitution",
      marks: 75,
      meritCounts: true,
      sections: [
        { name: "Nature & Features of the Constitution", marks: 15, topics: [
          { name: "Constitutional development; salient features; Preamble" }
        ]},
        { name: "Rights, Duties & Principles", marks: 15, topics: [
          { name: "Fundamental Rights" },
          { name: "Directive Principles & their relationship with Rights" },
          { name: "Fundamental Duties" }
        ]},
        { name: "Union & State Government", marks: 15, topics: [
          { name: "Legislature, Executive & Judiciary — structure & functions" },
          { name: "Centre–State relations; distribution of powers" }
        ]},
        { name: "Constitutional Dynamics", marks: 15, topics: [
          { name: "Amendment process; basic structure doctrine" },
          { name: "Emergency provisions" }
        ]},
        { name: "Constitutional & Local Bodies", marks: 15, topics: [
          { name: "Election Commission, UPSC/SPSC, CAG, Finance Commission" },
          { name: "73rd & 74th Amendments — Panchayati Raj & urban local governance" }
        ]}
      ]
    },

    {
      stage: "Mains",
      code: "M2A",
      paper: "Paper II · Section A — Indian & Andhra Pradesh Economy",
      marks: 75,
      meritCounts: true,
      sections: [
        { name: "Structure, National Income & Planning", marks: 15, topics: [
          { name: "Structure of the Indian economy; growth vs development" },
          { name: "National income — concepts & measurement" },
          { name: "Economic planning; NITI Aayog; 1991 reforms; fiscal decentralisation" }
        ]},
        { name: "Money, Banking & Public Finance", marks: 15, topics: [
          { name: "RBI, monetary policy, banking-sector reforms, inflation" },
          { name: "Fiscal policy, budget & taxation incl. GST" },
          { name: "Balance of payments; FDI" }
        ]},
        { name: "Agriculture, Industry & Services", marks: 15, topics: [
          { name: "Agriculture — cropping patterns, finance, marketing, MSP, food security" },
          { name: "Industrial policy since 1991; MSMEs" },
          { name: "Services sector incl. IT / ITES" }
        ]},
        { name: "Development & Social Sector", marks: 15, topics: [
          { name: "Poverty, unemployment & inequality" },
          { name: "Human development; social-sector programmes" }
        ]},
        { name: "Andhra Pradesh Economy", marks: 15, ap: true, topics: [
          { name: "Structure of the AP economy & public finance", ap: true },
          { name: "AP agriculture, allied sectors (horticulture, fisheries, forests)", ap: true },
          { name: "AP industry, services & state development schemes", ap: true }
        ]}
      ]
    },

    {
      stage: "Mains",
      code: "M2B",
      paper: "Paper II · Section B — Science & Technology",
      marks: 75,
      meritCounts: true,
      sections: [
        { name: "S&T Policy & Space", marks: 15, topics: [
          { name: "Role & impact of S&T in development; India's S&T policies" },
          { name: "Space technology (ISRO) — communication, remote sensing, navigation" }
        ]},
        { name: "Energy & Strategic Technology", marks: 15, topics: [
          { name: "Defence technology (DRDO)" },
          { name: "Nuclear technology & energy" },
          { name: "Conventional & renewable energy management" }
        ]},
        { name: "ICT & Emerging Technology", marks: 15, topics: [
          { name: "ICT, computers, cyber security & e-governance" },
          { name: "AI & emerging technologies" }
        ]},
        { name: "Life Sciences & Health", marks: 15, topics: [
          { name: "Biotechnology & nanotechnology" },
          { name: "Health, disease & food technology" }
        ]},
        { name: "Environment & Disaster", marks: 15, topics: [
          { name: "Environment, ecology & biodiversity; climate change" },
          { name: "Pollution & waste management; sustainable development" },
          { name: "Disaster management" }
        ]}
      ]
    }
  ]
};
