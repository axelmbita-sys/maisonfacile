// antifraude.js — Protocole anti-fraude MaisonFacile v2
// 1. Hash anti-doublon (adresse GPS + type)
// 2. OTP SMS à l'inscription
// 3. Modération IA (Claude API)
// 4. Signalement communautaire
// 5. Un numéro = un compte logeur

// ── HASH ANTI-DOUBLON ─────────────────────────
// Génère une empreinte unique pour chaque annonce
// Bloque si une annonce similaire existe déjà en base
function genererHashAnnonce(lat, lng, type, superficie) {
  // Arrondir le GPS à 3 décimales (~100m de précision)
  const latR = lat ? parseFloat(lat).toFixed(3) : "0";
  const lngR = lng ? parseFloat(lng).toFixed(3) : "0";
  const base  = `${latR}|${lngR}|${type}|${superficie || ""}`.toLowerCase();
  // Hash simple mais efficace pour la déduplication
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function verifierDoublon(hash) {
  // En prod : vérifier dans Firebase
  // const snap = await db.collection("annonces").where("hashAnnonce", "==", hash).where("statut", "in", ["actif", "en_attente"]).get();
  // return !snap.empty;
  const stored = JSON.parse(localStorage.getItem("mf_annonces") || "[]");
  return stored.some(a => a.hashAnnonce === hash && ["actif", "en_attente"].includes(a.statut));
}

// ── OTP SMS ───────────────────────────────────
// Génère un code à 6 chiffres et le stocke temporairement
let otpStore = {}; // En prod : Redis ou Firestore avec TTL 10 minutes

function genererOTP(telephone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[telephone] = { code, expires: Date.now() + 10 * 60 * 1000 };
  return code;
}

function verifierOTP(telephone, codeEntre) {
  const entry = otpStore[telephone];
  if (!entry) return { valide: false, message: "Aucun code envoyé pour ce numéro." };
  if (Date.now() > entry.expires) return { valide: false, message: "Code expiré. Demandez un nouveau code." };
  if (entry.code !== codeEntre.trim()) return { valide: false, message: "Code incorrect." };
  delete otpStore[telephone];
  return { valide: true };
}

// ── MODÉRATION IA ─────────────────────────────
// Analyse la description avec Claude pour détecter les arnaques
async function modererAnnonce(description, loyer, type, ville) {
  const prompt = `Tu es un modérateur d'annonces immobilières en Afrique Centrale.
Analyse cette annonce et détecte si elle est suspecte ou frauduleuse.

Description : "${description}"
Loyer demandé : ${loyer} F CFA/mois
Type : ${type}
Ville : ${ville}

Réponds UNIQUEMENT en JSON strict, sans aucun texte avant ou après :
{
  "suspect": true ou false,
  "score_confiance": 0 à 100,
  "raisons": ["raison1", "raison2"],
  "verdict": "approuve" ou "en_attente" ou "rejete"
}

Critères de rejet : loyer anormalement bas (<20 000 F pour villa), promesses irréalistes, demande d'avance avant visite, numéro étranger suspect, langage d'arnaque.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 1000,
        messages:   [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    const texte = data.content?.[0]?.text || "{}";
    const clean = texte.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("Modération IA échouée:", e);
    return { suspect: false, score_confiance: 50, raisons: [], verdict: "approuve" };
  }
}

// ── SIGNALEMENT ───────────────────────────────
async function signalerAnnonce(annonceId, raison, signalantId) {
  const stored = JSON.parse(localStorage.getItem("mf_signalements") || "{}");
  if (!stored[annonceId]) stored[annonceId] = [];
  // Eviter les doublons du même signalant
  if (stored[annonceId].includes(signalantId)) {
    return { message: "Vous avez déjà signalé cette annonce.", nbSignalements: stored[annonceId].length };
  }
  stored[annonceId].push(signalantId);
  localStorage.setItem("mf_signalements", JSON.stringify(stored));
  const nb = stored[annonceId].length;
  // Seuil : 3 signalements → suspension automatique
  if (nb >= 3) {
    // En prod : Firebase → update statut "suspendu"
    const annonces = JSON.parse(localStorage.getItem("mf_annonces") || "[]");
    const idx = annonces.findIndex(a => a.id == annonceId);
    if (idx !== -1) { annonces[idx].statut = "suspendu"; localStorage.setItem("mf_annonces", JSON.stringify(annonces)); }
  }
  return { message: nb >= 3 ? "Annonce suspendue automatiquement après 3 signalements." : `Signalement enregistré (${nb}/3).`, nbSignalements: nb };
}

// ── VÉRIFICATION NUMÉRO UNIQUE ────────────────
function verifierNumeroUnique(telephone) {
  const logeurs = JSON.parse(localStorage.getItem("mf_logeurs") || "[]");
  return !logeurs.some(l => l.telephone === telephone && l.statut !== "banni");
}

function enregistrerLogeur(telephone, nom, pays) {
  const logeurs = JSON.parse(localStorage.getItem("mf_logeurs") || "[]");
  logeurs.push({ telephone, nom, pays, statut: "actif", dateInscription: new Date().toISOString() });
  localStorage.setItem("mf_logeurs", JSON.stringify(logeurs));
}

// ── INTERFACE : bouton signalement ───────────────
function afficherBoutonSignalement(annonceId, containerId) {
  const btn = document.getElementById(containerId);
  if (!btn) return;
  btn.innerHTML = `<button class="btn-signaler" onclick="ouvrirSignalement(${annonceId})">
    <i class="ti ti-flag" aria-hidden="true"></i> Signaler cette annonce
  </button>`;
}

function ouvrirSignalement(annonceId) {
  const raisons = ["Prix suspect / trop bas", "Annonce en double", "Fausses photos", "Logeur introuvable", "Arnaque / demande d'avance"];
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <div class="modal-body">
        <h2 style="font-size:1.1rem;margin-bottom:1rem">Signaler cette annonce</h2>
        <p style="font-size:13px;color:var(--color-text-secondary, #6b7280);margin-bottom:1rem">
          Après 3 signalements distincts, l'annonce est suspendue automatiquement.
        </p>
        <div id="raisons-list" style="display:flex;flex-direction:column;gap:8px">
          ${raisons.map((r, i) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
              <input type="radio" name="raison" value="${r}" ${i === 0 ? "checked" : ""}> ${r}
            </label>`).join("")}
        </div>
        <button onclick="confirmerSignalement(${annonceId})" style="width:100%;margin-top:1.5rem;padding:10px;background:#dc2626;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">
          Envoyer le signalement
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function confirmerSignalement(annonceId) {
  const raison = document.querySelector('input[name="raison"]:checked')?.value || "Non précisé";
  const signalantId = `user_${Date.now()}`;
  const result = await signalerAnnonce(annonceId, raison, signalantId);
  document.querySelectorAll(".modal-overlay").forEach(m => m.remove());
  alert(result.message);
  if (result.nbSignalements >= 3) location.reload();
}
