import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SB_URL = "https://eeldhbbzzbwkiobfyddp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbGRoYmJ6emJ3a2lvYmZ5ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTU3NTEsImV4cCI6MjA5NzA3MTc1MX0.80OzfN12twW9j7sj2yW2f18oM5-1GGBCefsU6rU6GtE";

const sbFetch = async (path, options = {}, token = null) => {
  const headers = {
    "apikey": SB_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${SB_URL}${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null }; }
    catch { return { ok: res.ok, status: res.status, data: text }; }
  } catch (err) {
    return { ok: false, status: 0, data: { msg: "NETWORK_ERROR" } };
  }
};

// Auth helpers
const sbSignUp = (email, password, name) =>
  sbFetch("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { name } }) });

const sbSignIn = (email, password) =>
  sbFetch("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });

const sbGetProfile = (userId, token) =>
  sbFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`, {}, token);

const sbCreateProfile = (id, name, token) =>
  sbFetch("/rest/v1/profiles", { method: "POST", body: JSON.stringify({ id, name, has_paid: false }) }, token);

const sbUpdateProfile = (userId, data, token) =>
  sbFetch(`/rest/v1/profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify(data) }, token);

const sbGetProgress = (userId, token) =>
  sbFetch(`/rest/v1/user_progress?user_id=eq.${userId}&select=*`, {}, token);

const sbUpsertProgress = (userId, flashcard_id, status, token) =>
  sbFetch("/rest/v1/user_progress", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, flashcard_id, status, updated_at: new Date().toISOString() }),
  }, token);

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const FLASHCARDS = [
  { id:1, year:2023, subject:"Biology", chapter:"Cell Biology", q:"Which organelle is known as the 'powerhouse of the cell'?", a:"Mitochondria — site of aerobic respiration and ATP synthesis via oxidative phosphorylation.", difficulty:"Easy" },
  { id:2, year:2023, subject:"Biology", chapter:"Cell Biology", q:"What is the fluid mosaic model?", a:"Singer & Nicolson's model (1972) describing plasma membrane as a fluid phospholipid bilayer with proteins embedded or attached.", difficulty:"Medium" },
  { id:3, year:2022, subject:"Biology", chapter:"Cell Biology", q:"Ribosome subunit sizes in eukaryotes?", a:"80S ribosome = 60S (large) + 40S (small). Prokaryotes have 70S (50S + 30S).", difficulty:"Medium" },
  { id:4, year:2021, subject:"Biology", chapter:"Cell Biology", q:"What is the role of the Golgi apparatus?", a:"Processing, packaging, and sorting proteins/lipids. Cis face receives from ER; trans face dispatches to destinations.", difficulty:"Easy" },
  { id:5, year:2023, subject:"Biology", chapter:"Genetics", q:"What is Mendel's Law of Segregation?", a:"Allele pairs separate during gamete formation; each gamete receives one allele.", difficulty:"Easy" },
  { id:6, year:2022, subject:"Biology", chapter:"Genetics", q:"What is co-dominance? Give an example.", a:"Both alleles expressed simultaneously. Example: ABO blood group — IA and IB are co-dominant → AB blood type.", difficulty:"Medium" },
  { id:7, year:2021, subject:"Biology", chapter:"Genetics", q:"Define linkage and its significance.", a:"Genes on same chromosome tend to be inherited together. Exception is crossing over during meiosis.", difficulty:"Hard" },
  { id:8, year:2020, subject:"Biology", chapter:"Genetics", q:"What is the central dogma of molecular biology?", a:"DNA → (Transcription) → mRNA → (Translation) → Protein. Proposed by Francis Crick, 1958.", difficulty:"Easy" },
  { id:9, year:2023, subject:"Biology", chapter:"Human Physiology", q:"What is the normal GFR in adults?", a:"125 mL/min (~180 L/day). Reduced GFR indicates kidney disease.", difficulty:"Medium" },
  { id:10, year:2022, subject:"Biology", chapter:"Human Physiology", q:"Enzyme converting Angiotensin I to Angiotensin II?", a:"ACE — Angiotensin Converting Enzyme. Located in lung endothelium. Target of ACE inhibitor drugs.", difficulty:"Hard" },
  { id:11, year:2023, subject:"Physics", chapter:"Mechanics", q:"State Newton's Second Law of Motion.", a:"F = ma. Net force equals mass × acceleration. Direction of force = direction of acceleration.", difficulty:"Easy" },
  { id:12, year:2022, subject:"Physics", chapter:"Mechanics", q:"What is the work-energy theorem?", a:"Net work done = change in KE: W_net = ΔKE = ½mv² − ½mu²", difficulty:"Medium" },
  { id:13, year:2021, subject:"Physics", chapter:"Mechanics", q:"Define escape velocity and its formula.", a:"Minimum velocity to escape gravitational pull. v_e = √(2GM/R) = √(2gR). Earth: ~11.2 km/s", difficulty:"Hard" },
  { id:14, year:2023, subject:"Physics", chapter:"Electrostatics", q:"State Coulomb's Law.", a:"F = kq₁q₂/r². Force proportional to product of charges, inversely proportional to square of distance.", difficulty:"Easy" },
  { id:15, year:2022, subject:"Physics", chapter:"Electrostatics", q:"State Gauss's Law.", a:"Total electric flux through a closed surface = Q_enclosed/ε₀. Φ = E·A·cosθ", difficulty:"Hard" },
  { id:16, year:2023, subject:"Chemistry", chapter:"Organic Chemistry", q:"What is Markovnikov's Rule?", a:"In HX addition to alkene, H adds to carbon with more H's; X adds to carbon with fewer H's (more stable carbocation).", difficulty:"Medium" },
  { id:17, year:2022, subject:"Chemistry", chapter:"Organic Chemistry", q:"Distinguish SN1 and SN2 reactions.", a:"SN1: two-step, carbocation intermediate, first order, favours tertiary. SN2: one-step, backside attack, second order, favours primary.", difficulty:"Hard" },
  { id:18, year:2023, subject:"Chemistry", chapter:"Physical Chemistry", q:"State Le Chatelier's Principle.", a:"If equilibrium is disturbed, the system shifts to counteract the change and re-establish equilibrium.", difficulty:"Easy" },
  { id:19, year:2022, subject:"Chemistry", chapter:"Physical Chemistry", q:"What is the Van't Hoff factor (i)?", a:"i = actual moles of particles / moles of solute. Non-electrolytes: i=1. Electrolytes: i>1.", difficulty:"Medium" },
  { id:20, year:2021, subject:"Chemistry", chapter:"Physical Chemistry", q:"Define activation energy.", a:"Minimum energy required for reactants to form products. Higher Ea = slower reaction rate.", difficulty:"Easy" },
];

const SUBJECTS = ["All","Biology","Physics","Chemistry"];
const YEARS = ["All",2023,2022,2021,2020];
const DIFFICULTY = ["All","Easy","Medium","Hard"];

// ── ICONS ─────────────────────────────────────────────────────────────────────
const IconFlip = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconArrow = ({ dir }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{dir==="left"?<polyline points="15 18 9 12 15 6"/>:<polyline points="9 18 15 12 9 6"/>}</svg>;
const IconStar = ({ filled }) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled?"#F59E0B":"none"} stroke="#F59E0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

// ── STYLES ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,700;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--navy:#080E1E;--navy2:#0F172A;--card:#131D35;--border:rgba(255,255,255,0.08);--saffron:#F59E0B;--saffron2:#FCD34D;--green:#10B981;--red:#EF4444;--text:#F1F5F9;--muted:#94A3B8;--pill:rgba(245,158,11,0.12)}
  body{background:var(--navy);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh}
  .app{min-height:100vh}
  .landing{min-height:100vh;display:flex;flex-direction:column}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--border)}
  .logo{font-family:'Fraunces',serif;font-size:22px;color:var(--saffron)}
  .logo span{color:var(--text)}
  .nav-cta{background:var(--saffron);color:#000;border:none;padding:10px 22px;border-radius:8px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s}
  .nav-cta:hover{opacity:.85}
  .hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:64px 24px;position:relative;overflow:hidden}
  .hero::before{content:'';position:absolute;width:600px;height:600px;background:radial-gradient(circle,rgba(245,158,11,.08) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
  .hero-tag{display:inline-flex;align-items:center;gap:8px;background:var(--pill);border:1px solid rgba(245,158,11,.2);color:var(--saffron);padding:6px 14px;border-radius:100px;font-size:13px;font-weight:600;margin-bottom:28px}
  .hero-dot{width:6px;height:6px;background:var(--saffron);border-radius:50%;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .hero h1{font-size:clamp(32px,6vw,64px);font-weight:800;line-height:1.05;letter-spacing:-1.5px;max-width:720px;margin-bottom:20px}
  .hero h1 em{font-family:'Fraunces',serif;font-style:italic;color:var(--saffron);font-weight:400}
  .hero p{font-size:17px;color:var(--muted);max-width:480px;line-height:1.6;margin-bottom:40px}
  .hero-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:60px}
  .btn-primary{background:var(--saffron);color:#000;border:none;padding:14px 32px;border-radius:10px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:transform .15s,opacity .15s}
  .btn-primary:hover{transform:translateY(-1px);opacity:.9}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border);padding:14px 28px;border-radius:10px;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer}
  .btn-ghost:hover{border-color:rgba(255,255,255,.25)}
  .stats{display:flex;gap:40px;justify-content:center;flex-wrap:wrap}
  .stat{text-align:center}
  .stat-num{font-size:28px;font-weight:800;color:var(--saffron)}
  .stat-label{font-size:13px;color:var(--muted);margin-top:2px}
  .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;padding:48px 32px 64px;max-width:960px;margin:0 auto;width:100%}
  .feature-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px}
  .feature-icon{font-size:28px;margin-bottom:12px}
  .feature-card h3{font-size:16px;font-weight:700;margin-bottom:6px}
  .feature-card p{font-size:14px;color:var(--muted);line-height:1.5}
  .auth-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .auth-box{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:40px;width:100%;max-width:420px}
  .auth-box h2{font-size:24px;font-weight:800;margin-bottom:6px}
  .auth-box .sub{color:var(--muted);font-size:14px;margin-bottom:28px}
  .field{margin-bottom:16px}
  .field label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:6px}
  .field input{width:100%;background:var(--navy);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px;font-family:inherit;font-size:15px;outline:none;transition:border-color .2s}
  .field input:focus{border-color:var(--saffron)}
  .auth-submit{width:100%;margin-top:8px}
  .auth-switch{text-align:center;margin-top:18px;font-size:14px;color:var(--muted)}
  .auth-switch button{background:none;border:none;color:var(--saffron);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer}
  .back-btn{background:none;border:none;color:var(--muted);font-family:inherit;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:24px}
  .error-msg{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#EF4444;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
  .success-msg{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10B981;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
  .pay-badge{background:var(--pill);border:1px solid rgba(245,158,11,.25);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center}
  .pay-price{font-size:48px;font-weight:800;color:var(--saffron)}
  .pay-price span{font-size:20px;color:var(--muted)}
  .pay-perks{list-style:none;margin:16px 0}
  .pay-perks li{font-size:14px;color:var(--muted);padding:4px 0;display:flex;align-items:center;gap:8px}
  .pay-perks li::before{content:'✓';color:var(--green);font-weight:700}
  .dashboard{min-height:100vh;display:flex;flex-direction:column}
  .dash-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:12px}
  .dash-logo{font-family:'Fraunces',serif;font-size:20px;color:var(--saffron)}
  .dash-logo span{color:var(--text)}
  .user-info{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
  .avatar{width:32px;height:32px;background:var(--saffron);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#000;flex-shrink:0}
  .logout-btn{background:none;border:1px solid var(--border);color:var(--muted);padding:6px 12px;border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer}
  .logout-btn:hover{border-color:var(--red);color:var(--red)}
  .progress-bar-wrap{background:var(--navy2);padding:12px 24px;display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--border);flex-wrap:wrap}
  .prog-label{font-size:13px;color:var(--muted);white-space:nowrap}
  .prog-track{flex:1;min-width:120px;height:6px;background:var(--border);border-radius:3px;overflow:hidden}
  .prog-fill{height:100%;background:linear-gradient(90deg,var(--saffron),var(--saffron2));border-radius:3px;transition:width .4s ease}
  .prog-count{font-size:13px;font-weight:700;color:var(--saffron);white-space:nowrap}
  .filters{display:flex;gap:10px;padding:16px 24px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--navy2)}
  .filter-group{display:flex;flex-direction:column;gap:4px}
  .filter-group label{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .filter-group select{background:var(--card);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:8px;font-family:inherit;font-size:13px;outline:none;cursor:pointer}
  .filter-group select:focus{border-color:var(--saffron)}
  .reset-btn{align-self:flex-end;background:none;border:1px solid var(--border);color:var(--muted);padding:7px 12px;border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer}
  .reset-btn:hover{border-color:var(--saffron);color:var(--saffron)}
  .card-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px}
  .card-counter{font-size:13px;color:var(--muted);margin-bottom:20px;font-weight:500;display:flex;align-items:center;gap:8px}
  .card-counter strong{color:var(--text)}
  .flashcard-wrap{perspective:1200px;width:100%;max-width:560px;margin-bottom:24px;cursor:pointer}
  .flashcard{width:100%;min-height:280px;position:relative;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.4,0,.2,1)}
  .flashcard.flipped{transform:rotateY(180deg)}
  .card-face{position:absolute;width:100%;min-height:280px;backface-visibility:hidden;border-radius:20px;padding:32px;display:flex;flex-direction:column}
  .card-front{background:var(--card);border:1px solid var(--border)}
  .card-back{background:linear-gradient(135deg,#0F2027,#203A43,#0F2027);border:1px solid rgba(245,158,11,.2);transform:rotateY(180deg)}
  .card-meta{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
  .badge{padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .badge-subject{background:var(--pill);color:var(--saffron)}
  .badge-year{background:rgba(255,255,255,.06);color:var(--muted)}
  .badge-easy{background:rgba(16,185,129,.12);color:#10B981}
  .badge-medium{background:rgba(245,158,11,.12);color:#F59E0B}
  .badge-hard{background:rgba(239,68,68,.12);color:#EF4444}
  .card-q{font-size:18px;font-weight:600;line-height:1.5;flex:1;display:flex;align-items:center}
  .card-hint{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);margin-top:20px}
  .card-a-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--saffron);margin-bottom:12px}
  .card-a{font-size:16px;line-height:1.65;flex:1;display:flex;align-items:center;color:var(--text)}
  .card-chapter{font-size:12px;color:rgba(245,158,11,.5);margin-top:16px}
  .card-actions{display:flex;gap:10px;width:100%;max-width:560px;justify-content:center;flex-wrap:wrap}
  .action-btn{flex:1;min-width:100px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:12px;border:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:transform .15s,opacity .2s}
  .action-btn:hover{transform:translateY(-1px);opacity:.85}
  .btn-wrong{background:rgba(239,68,68,.12);color:#EF4444}
  .btn-flip{background:rgba(255,255,255,.06);color:var(--text)}
  .btn-correct{background:rgba(16,185,129,.12);color:#10B981}
  .nav-btns{display:flex;gap:8px;margin-top:16px}
  .nav-btn{background:var(--card);border:1px solid var(--border);color:var(--text);width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .2s}
  .nav-btn:hover{border-color:var(--saffron)}
  .nav-btn:disabled{opacity:.3;cursor:not-allowed}
  .star-btn{background:none;border:none;cursor:pointer;padding:4px}
  .empty-state{text-align:center;color:var(--muted);font-size:15px;padding:48px}
  .sync-tag{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px}
  .sync-dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s infinite}
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:var(--muted)}
  .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--saffron);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:480px){.hero h1{font-size:30px}.features{padding:32px 16px 48px}.filters{padding:12px 16px}.card-area{padding:20px 16px}.card-face{padding:22px}.card-q{font-size:15px}.nav{padding:16px 20px}}
`;

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [session, setSession] = useState(null); // { token, userId, name }
  const [profile, setProfile] = useState(null);
  const [authData, setAuthData] = useState({ name:"", email:"", password:"" });
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterDiff, setFilterDiff] = useState("All");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [starred, setStarred] = useState(new Set());
  const [correct, setCorrect] = useState(new Set());
  const [wrong, setWrong] = useState(new Set());
  const [syncing, setSyncing] = useState(false);

  // ── LOAD PROFILE + PROGRESS ────────────────────────────────────────────────
  async function initUser(token, userId, fallbackName) {
    const { data: profiles } = await sbGetProfile(userId, token);
    let prof = Array.isArray(profiles) ? profiles[0] : null;

    if (!prof) {
      const name = fallbackName || "Student";
      await sbCreateProfile(userId, name, token);
      prof = { id: userId, name, has_paid: false };
    }

    setProfile(prof);
    setSession({ token, userId, name: prof.name });

    if (prof.has_paid) {
      await loadProgress(userId, token);
      setScreen("dashboard");
    } else {
      setScreen("payment");
    }
  }

  async function loadProgress(userId, token) {
    const { data } = await sbGetProgress(userId, token);
    if (!data) return;
    const c = new Set(), w = new Set(), s = new Set();
    data.forEach(row => {
      if (row.status === "correct") c.add(row.flashcard_id);
      if (row.status === "wrong") w.add(row.flashcard_id);
      if (row.status === "starred") s.add(row.flashcard_id);
    });
    setCorrect(c); setWrong(w); setStarred(s);
  }

  // ── AUTH ───────────────────────────────────────────────────────────────────
  

  async function handleSignup() {
    if (!authData.email || !authData.password || !authData.name) { setAuthError("Please fill in all fields."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    const { ok, data } = await sbSignUp(authData.email, authData.password, authData.name);
    setAuthLoading(false);
    
    }
    if (!ok) { setAuthError(data?.msg || data?.message || "Signup failed. Try again."); return; }
    setAuthSuccess("Account created! Check your email to verify, then log in.");
  }

  async function handleLogin() {
    if (!authData.email || !authData.password) { setAuthError("Please enter email and password."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    const { ok, data } = await sbSignIn(authData.email, authData.password);
    setAuthLoading(false);
    if (data?.msg === "NETWORK_ERROR") { setAuthError(SANDBOX_MSG); return; }
    if (!ok) { setAuthError(data?.error_description || data?.msg || "Login failed. Check credentials."); return; }
    const token = data.access_token;
    const userId = data.user.id;
    const name = data.user.user_metadata?.name || authData.email.split("@")[0];
    await initUser(token, userId, name);
  }

  function handlePreviewMode() {
    setSession({ token: null, userId: null, name: authData.name || "Preview User" });
    setScreen("dashboard");
  }

  function handleLogout() {
    setSession(null); setProfile(null);
    setCorrect(new Set()); setWrong(new Set()); setStarred(new Set());
    setCardIndex(0); setFlipped(false);
    setAuthData({ name:"", email:"", password:"" });
    setScreen("landing");
  }

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  async function handlePayment() {
    if (!session) return;
    // Razorpay callback will call this after payment verification
    await sbUpdateProfile(session.userId, { has_paid: true }, session.token);
    setProfile(p => ({ ...p, has_paid: true }));
    await loadProgress(session.userId, session.token);
    setScreen("dashboard");
  }

  // ── PROGRESS SAVE ─────────────────────────────────────────────────────────
  const saveProgress = useCallback(async (flashcard_id, status) => {
    if (!session) return;
    setSyncing(true);
    await sbUpsertProgress(session.userId, flashcard_id, status, session.token);
    setSyncing(false);
  }, [session]);

  // ── FLASHCARD LOGIC ────────────────────────────────────────────────────────
  const filtered = FLASHCARDS.filter(c => {
    if (filterSubject !== "All" && c.subject !== filterSubject) return false;
    if (filterYear !== "All" && c.year !== filterYear) return false;
    if (filterDiff !== "All" && c.difficulty !== filterDiff) return false;
    return true;
  });

  const card = filtered[cardIndex];
  const totalAnswered = correct.size + wrong.size;
  const progress = Math.round((totalAnswered / FLASHCARDS.length) * 100);

  function goNext() { setFlipped(false); setTimeout(() => setCardIndex(i => Math.min(i+1, filtered.length-1)), 200); }
  function goPrev() { setFlipped(false); setTimeout(() => setCardIndex(i => Math.max(i-1, 0)), 200); }

  async function toggleStar(id) {
    const willStar = !starred.has(id);
    setStarred(s => { const n = new Set(s); willStar ? n.add(id) : n.delete(id); return n; });
    if (session) await saveProgress(id, willStar ? "starred" : "correct");
  }

  async function markCorrect() {
    if (!card) return;
    setCorrect(s => { const n = new Set(s); n.add(card.id); return n; });
    setWrong(s => { const n = new Set(s); n.delete(card.id); return n; });
    if (session) await saveProgress(card.id, "correct");
    goNext();
  }

  async function markWrong() {
    if (!card) return;
    setWrong(s => { const n = new Set(s); n.add(card.id); return n; });
    setCorrect(s => { const n = new Set(s); n.delete(card.id); return n; });
    if (session) await saveProgress(card.id, "wrong");
    goNext();
  }

  function resetFilters() { setFilterSubject("All"); setFilterYear("All"); setFilterDiff("All"); setCardIndex(0); setFlipped(false); }
  useEffect(() => { setCardIndex(0); setFlipped(false); }, [filterSubject, filterYear, filterDiff]);

  const diffBadge = d => d==="Easy"?"badge-easy":d==="Medium"?"badge-medium":"badge-hard";
  const displayName = session?.name || "Student";

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* LANDING */}
        {screen === "landing" && (
          <div className="landing">
            <nav className="nav">
              <div className="logo">NEET<span>Flash</span></div>
              <button className="nav-cta" onClick={() => { setScreen("signup"); setAuthError(""); setAuthSuccess(""); }}>Start for ₹69</button>
            </nav>
            <section className="hero">
              <div className="hero-tag"><div className="hero-dot"/>10 Years of NEET PYQs — Flashcard Format</div>
              <h1>Stop reading. Start<br/><em>remembering.</em></h1>
              <p>Every NEET UG question from 2014–2023, converted into smart flashcards. Subject-wise, chapter-wise, difficulty-wise.</p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => { setScreen("signup"); setAuthError(""); setAuthSuccess(""); }}>Get Full Access — ₹69</button>
                <button className="btn-ghost" onClick={() => setScreen("dashboard")}>Try Free Preview</button>
              </div>
              <div className="stats">
                <div className="stat"><div className="stat-num">1800+</div><div className="stat-label">Flashcards</div></div>
                <div className="stat"><div className="stat-num">10</div><div className="stat-label">Years of PYQs</div></div>
                <div className="stat"><div className="stat-num">3</div><div className="stat-label">Subjects</div></div>
                <div className="stat"><div className="stat-num">₹69</div><div className="stat-label">Full Access</div></div>
              </div>
            </section>
            <div className="features">
              {[
                { icon:"⚡", title:"Instant Recall", desc:"Flip format forces active recall — proven to retain 2x more than passive reading." },
                { icon:"🎯", title:"Filter by Chapter", desc:"Studying Genetics tonight? Filter to just that chapter. No distractions." },
                { icon:"📅", title:"Year-wise Practice", desc:"Practice 2023 paper or mix all years for comprehensive prep." },
                { icon:"📈", title:"Progress Saves", desc:"Every card you mark syncs to your account. Pick up exactly where you left off." },
              ].map(f => (
                <div key={f.title} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3><p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIGNUP */}
        {screen === "signup" && (
          <div className="auth-screen">
            <div className="auth-box">
              <button className="back-btn" onClick={() => setScreen("landing")}>← Back</button>
              <div className="logo" style={{marginBottom:16}}>NEET<span style={{color:"#F1F5F9"}}>Flash</span></div>
              <h2>Create account</h2>
              <p className="sub">Get full access for just ₹69</p>
              {authError && <div className="error-msg">{authError}</div>}
              {authSuccess && <div className="success-msg">{authSuccess}</div>}
              <div className="field"><label>Full Name</label>
                <input placeholder="Your name" value={authData.name} onChange={e => setAuthData(p=>({...p,name:e.target.value}))} />
              </div>
              <div className="field"><label>Email</label>
                <input type="email" placeholder="you@email.com" value={authData.email} onChange={e => setAuthData(p=>({...p,email:e.target.value}))} />
              </div>
              <div className="field"><label>Password</label>
                <input type="password" placeholder="Min 6 characters" value={authData.password} onChange={e => setAuthData(p=>({...p,password:e.target.value}))} />
              </div>
              <button className="btn-primary auth-submit" onClick={handleSignup} disabled={authLoading}>
                {authLoading ? "Creating account…" : "Create Account"}
              </button>
              <div className="auth-switch">Already have one? <button onClick={() => { setScreen("login"); setAuthError(""); setAuthSuccess(""); }}>Log in</button></div>
              {authError && authError.includes("blocked") && (
                <button className="btn-ghost auth-submit" style={{marginTop:12}} onClick={handlePreviewMode}>
                  Enter Preview Mode Instead →
                </button>
              )}
            </div>
          </div>
        )}

        {/* LOGIN */}
        {screen === "login" && (
          <div className="auth-screen">
            <div className="auth-box">
              <button className="back-btn" onClick={() => setScreen("landing")}>← Back</button>
              <div className="logo" style={{marginBottom:16}}>NEET<span style={{color:"#F1F5F9"}}>Flash</span></div>
              <h2>Welcome back</h2>
              <p className="sub">Login to access your flashcards</p>
              {authError && <div className="error-msg">{authError}</div>}
              {authSuccess && <div className="success-msg">{authSuccess}</div>}
              <div className="field"><label>Email</label>
                <input type="email" placeholder="you@email.com" value={authData.email} onChange={e => setAuthData(p=>({...p,email:e.target.value}))} />
              </div>
              <div className="field"><label>Password</label>
                <input type="password" placeholder="••••••••" value={authData.password} onChange={e => setAuthData(p=>({...p,password:e.target.value}))} />
              </div>
              <button className="btn-primary auth-submit" onClick={handleLogin} disabled={authLoading}>
                {authLoading ? "Logging in…" : "Continue"}
              </button>
              <div className="auth-switch">No account? <button onClick={() => { setScreen("signup"); setAuthError(""); setAuthSuccess(""); }}>Sign up</button></div>
              {authError && authError.includes("blocked") && (
                <button className="btn-ghost auth-submit" style={{marginTop:12}} onClick={handlePreviewMode}>
                  Enter Preview Mode Instead →
                </button>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT */}
        {screen === "payment" && (
          <div className="auth-screen">
            <div className="auth-box">
              <div className="logo" style={{marginBottom:16}}>NEET<span style={{color:"#F1F5F9"}}>Flash</span></div>
              <h2>Unlock Full Access</h2>
              <p className="sub">Hey {displayName} 👋 One-time payment. No subscription.</p>
              <div className="pay-badge">
                <div className="pay-price">₹69 <span>one-time</span></div>
                <ul className="pay-perks">
                  <li>1800+ NEET PYQ Flashcards</li>
                  <li>All 10 years (2014–2023)</li>
                  <li>Biology, Physics & Chemistry</li>
                  <li>Chapter-wise filters</li>
                  <li>Progress saves to your account</li>
                  <li>Lifetime access</li>
                </ul>
              </div>
              <button className="btn-primary auth-submit" onClick={handlePayment}>Pay ₹69 via Razorpay</button>
              <p style={{textAlign:"center",marginTop:8,fontSize:12,color:"var(--muted)"}}>
                <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}} onClick={handleLogout}>← Sign out</button>
              </p>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {screen === "dashboard" && (
          <div className="dashboard">
            <header className="dash-header">
              <div className="dash-logo">NEET<span>Flash</span></div>
              <div className="user-info">
                {syncing
                  ? <span className="sync-tag">Saving…</span>
                  : session && <span className="sync-tag"><span className="sync-dot"/>Synced</span>
                }
                {session && <><div className="avatar">{displayName[0].toUpperCase()}</div><span>{displayName}</span></>}
                <button className="logout-btn" onClick={session ? handleLogout : () => setScreen("landing")}>
                  {session ? "Sign out" : "Exit"}
                </button>
              </div>
            </header>

            <div className="progress-bar-wrap">
              <span className="prog-label">Progress</span>
              <div className="prog-track"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
              <span className="prog-count">{totalAnswered}/{FLASHCARDS.length} · ✓{correct.size} ✗{wrong.size}</span>
            </div>

            <div className="filters">
              <div className="filter-group"><label>Subject</label>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group"><label>Year</label>
                <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value)||"All")}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="filter-group"><label>Difficulty</label>
                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                  {DIFFICULTY.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <button className="reset-btn" onClick={resetFilters}>Reset</button>
            </div>

            <div className="card-area">
              {filtered.length === 0 ? (
                <div className="empty-state">No cards match. <button className="reset-btn" style={{marginLeft:8}} onClick={resetFilters}>Reset</button></div>
              ) : (
                <>
                  <div className="card-counter">
                    Card <strong>{cardIndex+1}</strong> of <strong>{filtered.length}</strong>
                    <button className="star-btn" onClick={() => card && toggleStar(card.id)}>
                      <IconStar filled={!!(card && starred.has(card.id))} />
                    </button>
                    {card && (correct.has(card.id)||wrong.has(card.id)) && (
                      <span style={{fontSize:12,color:correct.has(card.id)?"var(--green)":"var(--red)"}}>
                        {correct.has(card.id)?"✓ Known":"✗ Review"}
                      </span>
                    )}
                  </div>

                  {card && (
                    <div className="flashcard-wrap" onClick={() => setFlipped(f=>!f)}>
                      <div className={`flashcard${flipped?" flipped":""}`}>
                        <div className="card-face card-front">
                          <div className="card-meta">
                            <span className="badge badge-subject">{card.subject}</span>
                            <span className="badge badge-year">{card.year}</span>
                            <span className={`badge ${diffBadge(card.difficulty)}`}>{card.difficulty}</span>
                          </div>
                          <div className="card-q">{card.q}</div>
                          <div className="card-hint"><IconFlip/><span>Tap to reveal answer</span></div>
                          <div className="card-chapter">{card.chapter}</div>
                        </div>
                        <div className="card-face card-back">
                          <div className="card-a-label">Answer</div>
                          <div className="card-a">{card.a}</div>
                          <div className="card-chapter" style={{color:"rgba(245,158,11,.6)"}}>{card.chapter} · {card.year}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card-actions">
                    <button className="action-btn btn-wrong" onClick={markWrong}><IconX/>Need Review</button>
                    <button className="action-btn btn-flip" onClick={()=>setFlipped(f=>!f)}><IconFlip/>Flip</button>
                    <button className="action-btn btn-correct" onClick={markCorrect}><IconCheck/>Got It</button>
                  </div>

                  <div className="nav-btns">
                    <button className="nav-btn" onClick={goPrev} disabled={cardIndex===0}><IconArrow dir="left"/></button>
                    <button className="nav-btn" onClick={goNext} disabled={cardIndex===filtered.length-1}><IconArrow dir="right"/></button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
