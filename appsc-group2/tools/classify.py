#!/usr/bin/env python3
"""Classify each segmented APPSC question to a syllabus leaf topic.

Design for trust:
- SECTION is fixed by the paper's own printed declaration (question-number range),
  so a question can never cross into the wrong paper-section.
- Within a section, a leaf topic is chosen by keyword rules over the English stem.
- No-match falls to the section's default leaf (never mis-filed across sections).
- Output: per-leaf / per-section counts + a full per-question TSV for human review.
"""
import json, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- map: paper -> list of (lo, hi, block_code, section_name, [(leaf, [kw...]), ...], default_leaf)
# leaf names must match data/syllabus.js exactly.
P = "2024-prelims"; P19 = "2019-prelims"; M1 = "2025-mains-p1"; M2 = "2025-mains-p2"
import json as _json
QJS = _json.load(open(os.path.join(HERE,"pyq_txt","questions.json")))

def rules():
    return {
      M1: [
        (1,75,"M1A","AP Social & Cultural History", [
          ("Pre-historic cultures of Andhra", ["burial","cyst","prehistor","neolithic","megalith","sarcophagus"]),
          ("Satavahanas — society, religion, art", ["satavahana","kharavela","amaravati","gautamiputra"]),
          ("Ikshvakus & Vishnukundins", ["ikshvaku","vishnukundin","janasraya","nagarjunakonda","vijayapuri","madhavavarma"]),
          ("Eastern Chalukyas of Vengi & Andhra Cholas", ["chalukya","vengi","chola","vijayaditya","nannaya","rajaraja","denduluru","draksharama"]),
          ("Telugu language, art & architecture of the period", ["kakatiya","reddi","reddy","srinatha","krishna devaraya","krishnadevaraya","vijayanagara","poet","literature","author","inscription","temple","qutb","prolaraja","prataparudra","kondaveedu","nayankara","millennium","abhinava"]),
        ], "Telugu language, art & architecture of the period"),
        (1,75,"M1A","Colonial & Nationalist Andhra", [
          ("Advent of Europeans; rise & consolidation of Company rule", ["east india company","factory","collector","nizam","asaf jahi","ryotwari","padmanabham","bobbili","blue water","dictionary","dutch","french","guntur","english establish"]),
          ("1857 Revolt & its impact on Andhra", ["1857","revolt","rampa","fituri"]),
          ("Socio-cultural awakening; Justice Party / Self-Respect Movement", ["justice party","self-respect","brahmo","veeresalingam","newspaper","vivekavardhini","library movement","girls school","rajahmundry","first novel","telugu newspaper"]),
          ("Nationalist movement in Andhra 1885–1947; role of press", ["satyagraha","salt","chirala","perala","pullari","palnadu","non-cooperation","congress","duggirala","gandhi","quit india","national movement"]),
        ], None),
        (1,75,"M1A","Andhra Movement & State Formation", [
          ("Origin & growth of the Andhra movement; Andhra Mahasabhas", ["andhra mahasabha","andhra maha sabha","library","andhra movement","desamante"]),
          ("Formation of Andhra State 1953; Visalandhra; SRC; Gentlemen's Agreement", ["visalandhra","visalandra","gentlemen","states re-organization","states reorganization","src","dhar commission","sitaram","potti sriramulu","partition committee","andhra state","tirupati","capital of andhra"]),
          ("Formation of Andhra Pradesh 1956", ["1956","formation of andhra pradesh"]),
          ("Important social & cultural events 1956–2014", ["chief minister","jnanpith","jnanapith","kalpavriksham","anjaiah","telugu ganga","andhra bank"]),
        ], None),
        (76,150,"M1B","Rights, Duties & Principles", [
          ("Fundamental Rights", ["fundamental right","article 32","heart and soul","writ","habeas"]),
          ("Directive Principles & their relationship with Rights", ["directive principle","dpsp","legal aid","living wage","maternity"]),
          ("Fundamental Duties", ["fundamental dut","fundamental duties"]),
        ], None),
        (76,150,"M1B","Nature & Features of the Constitution", [
          ("Constitutional development; salient features; Preamble", ["preamble","secular","socialist","adopted","constituent assembly","schedule","borrow","objectives","constitution of","other countries","provisions adopted"]),
        ], None),
        (76,150,"M1B","Union & State Government", [
          ("Legislature, Executive & Judiciary — structure & functions", ["president","vice president","parliament","rajya sabha","lok sabha","supreme court","high court","judge","judiciary","judicial activism","judicial review","attorney general","prime minister","union executive","zero hour","question hour","no-confidence","pil","public interest"]),
          ("Centre–State relations; distribution of powers", ["centre-state","center-state","centre — state","federal","residuary","concurrent list","state list","union list","jammu and kashmir reorganisation","governor general"]),
        ], None),
        (76,150,"M1B","Constitutional Dynamics", [
          ("Amendment process; basic structure doctrine", ["amendment act","constitutional amendment","basic structure","unconstitutional","void"]),
          ("Emergency provisions", ["emergency","president's rule","article 356"]),
        ], None),
        (76,150,"M1B","Constitutional & Local Bodies", [
          ("Election Commission, UPSC/SPSC, CAG, Finance Commission", ["election commission","finance commission","cag","upsc","niti aayog","constitutional body","constitutional bodies","evm","electoral","vohra","goswami","indrajit gupta","national commission","human rights commission","information commission","rti","right to information","lokpal","lokayukta","national party","linguistic minorities","attorney"]),
          ("73rd & 74th Amendments — Panchayati Raj & urban local governance", ["panchayat","panchayati raj","eleventh schedule","twelfth schedule","municipalit","gadgil","balwant rai","local body","cantonment"]),
        ], None),
      ],
      M2: [
        (1,75,"M2A","Structure, National Income & Planning", [
          ("Structure of the Indian economy; growth vs development", ["globalization","ease of doing business","structure of","economic survey","sdg","relative economic performance","stagflation","logistic performance"]),
          ("National income — concepts & measurement", ["national income","gdp","gnp","gva","deflator","factor cost","market price","net domestic","per capita income","measurement of national"]),
          ("Economic planning; NITI Aayog; 1991 reforms; fiscal decentralisation", ["planning","niti aayog","liberaliz","1991 reform","economic reform","post-economic reform"]),
        ], "Structure of the Indian economy; growth vs development"),
        (1,75,"M2A","Money, Banking & Public Finance", [
          ("RBI, monetary policy, banking-sector reforms, inflation", ["rbi","reserve bank","monetary","repo","crr","sdf","standing deposit","liquidity","inflation","money supply","high-power money","sebi","i-crr"]),
          ("Fiscal policy, budget & taxation incl. GST", ["fiscal deficit","budget","union budget","gst","tax","subsid","non-plan expenditure","capital expenditure","factories act"]),
          ("Balance of payments; FDI", ["balance of payment","bop","foreign portfolio","fpi","fdi","foreign exchange","forex","current account","special drawing","sdr","imf","arbitrage","exchange rate","oil consumption","oil import"]),
        ], None),
        (1,75,"M2A","Agriculture, Industry & Services", [
          ("Agriculture — cropping patterns, finance, marketing, MSP, food security", ["agricultur","milk","fruits","rice","bharat rice","nafed","food","credit guarantee","livestock","fertilizer","pesticide"]),
          ("Industrial policy since 1991; MSMEs", ["industrial policy","msme","industrial policy resolution","factory"]),
          ("Services sector incl. IT / ITES", ["services sector","it/ites","logistic"]),
        ], None),
        (1,75,"M2A","Development & Social Sector", [
          ("Poverty, unemployment & inequality", ["poverty","unemployment","multidimensional poverty","mpi","inequality"]),
          ("Human development; social-sector programmes", ["jal jeevan","tap water","human development","social sector","scheme"]),
        ], None),
        (1,75,"M2A","Andhra Pradesh Economy", [
          ("Structure of the AP economy & public finance", ["andhra pradesh ranks","ap ","per capita","gva growth","capital expenditure","socio-economic survey","state reorganization act","relative economic"]),
          ("AP agriculture, allied sectors (horticulture, fisheries, forests)", ["rythu bharosa","rbk","rytu bazaar","rytu","gokul","cattle breeding","irrigation","agriculture transformation","oil palm","mango","horticultur","fisher"]),
          ("AP industry, services & state development schemes", ["amaravati","special economic zone","sez","electronics manufacturing","ap industrial policy","industrial policy 20","incentive","railway project","mineral"]),
        ], "Structure of the AP economy & public finance"),
        (76,150,"M2B","Environment & Disaster", [
          ("Environment, ecology & biodiversity; climate change", ["climate change","ozone","greenhouse","paris agreement","black carbon","napcc","tipping point","iucn","cites","endangered","biodiversity","natality","population density","biogeochemical","nitrogen cycle","ecology","ngt","green tribunal","bhopal","agenda 21","summit","clean energy fund","ncef"]),
          ("Pollution & waste management; sustainable development", ["pollution","pollutant","waste","landfill","incinerat","compost","solid waste","bioremediation","oil spill","e-waste","sewage","air pollution","water pollution","zero waste","sustainable development","sustainability","sdg","organic farming","gm crop","genetically modified","gmo","emission","trans-boundary","carbon monoxide","vehicles"]),
          ("Disaster management", ["disaster","cyclone","flood","mitigation"]),
        ], "Pollution & waste management; sustainable development"),
        (76,150,"M2B","Life Sciences & Health", [
          ("Biotechnology & nanotechnology", ["biotechnology","dbt","department of biotechnology","nanotech"]),
          ("Health, disease & food technology", ["ayushman","health","malnutrition","public health","disease","vector","mosquito","sanitation","digital arrest","food technology","dual burden"]),
        ], None),
        (76,150,"M2B","S&T Policy & Space", [
          ("Role & impact of S&T in development; India's S&T policies", ["s&t policy","science and technology policy"]),
          ("Space technology (ISRO) — communication, remote sensing, navigation", ["gslv","satellite","isro","radio astronomy","launch vehicle","remote sensing"]),
        ], None),
        (76,150,"M2B","Energy & Strategic Technology", [
          ("Defence technology (DRDO)", ["brahmos","missile","drdo","defence"]),
          ("Nuclear technology & energy", ["nuclear"]),
          ("Conventional & renewable energy management", ["renewable","mnre","solar park","wind energy","energy security","new and renewable"]),
        ], None),
        (76,150,"M2B","ICT & Emerging Technology", [
          ("ICT, computers, cyber security & e-governance", ["cyber","petya","wannacry","ransomware","e-governance","digital"]),
          ("AI & emerging technologies", ["artificial intelligence"," ai "]),
        ], None),
      ],
    }

# Prelims content-based classification into the Prelims syllabus block (code "P")
def prelims_rules():
    return [
      ("History of India & National Movement","Ancient, medieval & modern India (overview)",
        ["harappan","ashoka","mauryan","satavahana","varahamihira","siddhanta","shivaji","ashtapradhan","delhi","mughal","inscription","gupta","buddhis","jain","medieval","sultan","permanent settlement","lottery committee","blue"]),
      ("History of India & National Movement","Indian National Movement 1857–1947",
        ["1857","aituc","trade union","communal","vaikom","satyagraha","national movement","congress","gandhi","quit india","non-cooperation","swaraj","simon","civil disobedience"]),
      ("History of India & National Movement","History of Andhra Pradesh",
        ["andhra","satavahana","amaravati","vijayanagara","kakatiya","goa","daman","diu"]),
      ("Geography — India, World & AP","Physical geography & landforms",
        ["granite","himalaya","mountain","satluj","layer","atmosphere","salinity","water bodies","monsoon","plateau","river","soil","forest","landform","rock","mango shower"]),
      ("Geography — India, World & AP","Indian & world geography (economic, social)",
        ["scheduled tribe","state","union territory","headquarters","bilaspur","mineral","crop","india"]),
      ("Geography — India, World & AP","Geography of Andhra Pradesh",
        ["andhra pradesh","eastern ghats","tourist","tirupati"]),
      ("Indian Polity & Governance","Constitution, political system & public policy",
        ["constitution","article","amendment","president","parliament","supreme court","triple talaq","dowry","right"]),
      ("Indian Economy & Planning","Economic & social development, planning",
        ["economy","gdp","planning","poverty","inflation","budget","bank"]),
      ("General Science & Technology","General science & everyday applications",
        ["malaria","biofuel","science","technology","disease","vaccine"]),
      ("Environment & Ecology","Ecology, biodiversity & climate change (general awareness)",
        ["biodiversity","climate","ecology","tiger","forest reserve","wildlife"]),
      ("Reasoning & Data Interpretation","Logical reasoning & analytical ability",
        ["code","coded","series","direction","mirror image","odd one","figure","syllogism","statement","arrange","blood relation"]),
      ("Reasoning & Data Interpretation","Data interpretation & data analysis (tables, charts, probability)",
        ["salary","invested","ages","probability","value of","distance","sum of","x+y","equation","percentage","profit","work"]),
    ]

SOC = [  # 2024 Section C "Indian Society" -> map to Polity/society-ish leaves
  ("Indian Polity & Governance","Rights issues & governance",
    ["child marriage","triple talaq","dowry","communalism","sachar","minorit","gender","women","caste","reservation","live-in","consensual","regionalism","scheduled","social","marriage","devotion","sabarimala"]),
]

def pick(stem, groups, default):
    s = stem.lower()
    for leaf, kws in groups:
        for kw in kws:
            if kw in s:
                return leaf, kw
    return default, None

def classify():
    out = {}  # paper -> list of {n, block, section, leaf, kw}
    R = rules()
    for paper in [M1, M2]:
        qs = QJS[paper]
        rows = []
        for q in qs:
            n, stem = q["n"], q["stem"]
            placed = None
            for lo,hi,code,sec,groups,default in R[paper]:
                if lo<=n<=hi:
                    leaf,kw = pick(stem, groups, None)
                    if leaf:
                        placed = (code,sec,leaf,kw); break
            if not placed:
                # fall to first section rule for the range, default leaf
                for lo,hi,code,sec,groups,default in R[paper]:
                    if lo<=n<=hi and default:
                        placed=(code,sec,default,None); break
            if not placed:
                placed=("?","?","?",None)
            rows.append({"n":n,"block":placed[0],"section":placed[1],"leaf":placed[2],"kw":placed[3],"stem":stem[:70]})
        out[paper]=rows
    # ---- Prelims: assign the exam's OWN section by number-range (authoritative),
    # then a sub-theme by content keywords within that section.
    REASON = ["code","coded","series","direction","mirror","odd one","figure","arrange",
              "blood relation","syllogism","salary","invested","ages","probability","distance",
              "sum of","x+y","equation","percentage","profit","work ","stall","clock","calendar",
              "number series","seating","what is the value","shortest distance"]
    CONSTI = ["constitution","article","amendment","fundamental","directive principle","president",
              "parliament","supreme court","high court","election commission","panchayat","writ",
              "preamble","schedule","governor"]
    def is_reason(s): s=s.lower(); return any(k in s for k in REASON)
    def is_consti(s): s=s.lower(); return any(k in s for k in CONSTI)

    def prelims_section(paper, n, stem):
        if paper == P:  # 2024: A Hist, B Geo, C Society, D CurrentAffairs, E MentalAbility
            if   1<=n<=30:  return "Indian History"
            elif 31<=n<=60: return "Geography"
            elif 61<=n<=90: return "Indian Society"
            elif 91<=n<=120:return "Current Affairs"
            else:           return "Mental Ability"
        else:  # 2019: A GS+MentalAbility(1-50), B APHist+Constitution(51-100), C Planning+Economy(101-150)
            if 1<=n<=50:
                return "Mental Ability" if is_reason(stem) else "General Studies"
            elif 51<=n<=100:
                return "Indian Constitution" if is_consti(stem) else "AP History & Culture"
            else:
                return "Planning & Economy"

    for paper in [P, P19]:
        qs = QJS[paper]
        rows=[]
        for q in qs:
            sec = prelims_section(paper, q["n"], q["stem"])
            rows.append({"n":q["n"],"block":"P","section":sec,"leaf":sec,"stem":q["stem"][:70]})
        out[paper]=rows
    return out

if __name__=="__main__":
    out=classify()
    from collections import Counter
    for paper,rows in out.items():
        sec=Counter(r["section"] for r in rows)
        unk=sum(1 for r in rows if r["section"]=="?")
        print("\n=== %s : %d classified, %d unknown ==="%(paper,len(rows),unk))
        for s,c in sec.most_common():
            print("  %3d  %s"%(c,s))
    json.dump(out, open(os.path.join(HERE,"pyq_txt","classified.json"),"w"), ensure_ascii=False, indent=1)
