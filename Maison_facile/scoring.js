// scoring.js — Système de notation universel v2
// Maisons, Hôtels, Taxis, Restaurants
// VERT ≥4.0 | JAUNE 2.5–3.9 | ROUGE <2.5 (suspendu + gardé en base)

const SEUILS = { vert: 4.0, jaune: 2.5 };
const TAXI_NEGATIFS_MAX = 20;

// ── COULEUR ET BADGE ──────────────────────────
function couleurScore(score) {
  if (score === null || score === undefined) return "gris";
  if (score >= SEUILS.vert)  return "vert";
  if (score >= SEUILS.jaune) return "jaune";
  return "rouge";
}

function badgeScore(score, nbAvis = 0) {
  if (!nbAvis) return `<span class="score-badge gris"><i class="ti ti-star" aria-hidden="true"></i> Nouveau</span>`;
  const c = couleurScore(score);
  const labels = { vert: "Excellent", jaune: "Moyen", rouge: "Mauvais", gris: "Nouveau" };
  return `<span class="score-badge ${c}">
    <i class="ti ti-star" aria-hidden="true"></i> ${score ? score.toFixed(1) : "—"}
    <span class="nb-avis">(${nbAvis} avis) · ${labels[c]}</span>
  </span>`;
}

// ── MARQUEUR CARTE LEAFLET ────────────────────
function marqueurCarte(prestataire) {
  const c = couleurScore(prestataire.scoreMoyen);
  const couleurs = { vert: "#16a34a", jaune: "#ca8a04", rouge: "#dc2626", gris: "#6b7280" };
  const texte = prestataire.loyer
    ? formatPrix(prestataire.loyer).replace(" F CFA", "F")
    : prestataire.nom || prestataire.titre || "";
  return L.divIcon({
    className: "",
    html: `<div class="map-marker" style="background:${couleurs[c]};border:2px solid white;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${texte}</div>`,
    iconAnchor: [40, 20]
  });
}

// ── SOUMETTRE UN AVIS ─────────────────────────
async function soumettreAvis(collection, prestatireId, note, commentaire, auteurId) {
  if (note < 1 || note > 5) return { success: false, message: "Note invalide (1 à 5)" };

  const key     = `mf_avis_${collection}`;
  const keyPres = `mf_${collection}`;
  const avis    = JSON.parse(localStorage.getItem(key) || "[]");
  const prestas = JSON.parse(localStorage.getItem(keyPres) || "[]");

  // Bloquer les doublons (un avis par utilisateur par prestataire)
  const dejaNote = avis.some(a => a.prestatireId === prestatireId && a.auteurId === auteurId);
  if (dejaNote) return { success: false, message: "Vous avez déjà noté ce prestataire." };

  const estNegatif = note <= 2;
  avis.push({
    prestatireId, note, commentaire, auteurId, estNegatif,
    date: new Date().toISOString()
  });
  localStorage.setItem(key, JSON.stringify(avis));

  // Recalculer le score (moyenne pondérée : derniers 50 avis, récents ×1.5)
  const avisPresta = avis
    .filter(a => a.prestatireId === prestatireId)
    .slice(-50);

  const { somme, poids } = avisPresta.reduce((acc, a, i) => {
    const w = i >= avisPresta.length - 10 ? 1.5 : 1.0; // les 10 derniers pèsent plus
    return { somme: acc.somme + a.note * w, poids: acc.poids + w };
  }, { somme: 0, poids: 0 });

  const nouveauScore = poids > 0 ? Math.round((somme / poids) * 10) / 10 : null;
  const nbAvisNegatifs = avisPresta.filter(a => a.estNegatif).length;

  // Mettre à jour le prestataire
  const idx = prestas.findIndex(p => p.id === prestatireId);
  if (idx !== -1) {
    prestas[idx].scoreMoyen = nouveauScore;
    prestas[idx].nbAvis = avisPresta.length;

    // Taxi : compter les avis négatifs consécutifs
    if (collection === "taxis") {
      const consecutifs = compterConsecutifsNegatifs(avisPresta);
      prestas[idx].nbAvisNegatifsConsecutifs = consecutifs;
      if (consecutifs >= TAXI_NEGATIFS_MAX) {
        prestas[idx].statut = "suspendu";
        alert("Ce chauffeur a été suspendu automatiquement après 20 avis négatifs consécutifs.");
      }
    }

    // Rouge → suspendu si ≥10 avis
    if (nouveauScore !== null && nouveauScore < SEUILS.jaune && avisPresta.length >= 10) {
      prestas[idx].statut = "suspendu";
    }
    localStorage.setItem(keyPres, JSON.stringify(prestas));
  }

  return {
    success: true,
    message: "Avis enregistré. Merci !",
    nouveauScore,
    couleur: couleurScore(nouveauScore)
  };
}

function compterConsecutifsNegatifs(avis) {
  let count = 0;
  for (let i = avis.length - 1; i >= 0; i--) {
    if (avis[i].estNegatif) count++;
    else break;
  }
  return count;
}

// ── WIDGET NOTATION (étoiles cliquables) ─────
function afficherWidgetNotation(containerId, collection, prestatireId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let noteSelectionnee = 0;
  el.innerHTML = `
    <div class="widget-notation">
      <p style="font-size:13px;margin-bottom:8px;color:var(--color-text-secondary, #6b7280)">Notez ce service :</p>
      <div class="etoiles" id="etoiles_${containerId}">
        ${[1,2,3,4,5].map(n => `
          <i class="ti ti-star etoile" data-note="${n}"
             style="font-size:24px;cursor:pointer;color:#d1d5db;transition:color .15s"
             onmouseover="survoleEtoile(${n},'${containerId}')"
             onmouseout="resetEtoiles('${containerId}')"
             onclick="selectionnerNote(${n},'${containerId}')"></i>
        `).join("")}
      </div>
      <textarea id="comm_${containerId}" placeholder="Commentaire (optionnel)..."
        style="width:100%;margin-top:10px;padding:8px;border:0.5px solid #d1d5db;border-radius:8px;font-size:13px;resize:vertical;min-height:60px"></textarea>
      <button onclick="envoyerAvis('${containerId}','${collection}','${prestatireId}')"
        style="width:100%;margin-top:8px;padding:10px;background:#1a6b3a;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">
        Envoyer mon avis
      </button>
      <p id="msg_${containerId}" style="font-size:12px;margin-top:6px;color:#16a34a"></p>
    </div>`;
}

function survoleEtoile(n, id) {
  document.querySelectorAll(`#etoiles_${id} .etoile`).forEach((e, i) => {
    e.style.color = i < n ? "#f59e0b" : "#d1d5db";
  });
}
function resetEtoiles(id) {
  const note = parseInt(document.getElementById(`etoiles_${id}`)?.dataset.note || "0");
  document.querySelectorAll(`#etoiles_${id} .etoile`).forEach((e, i) => {
    e.style.color = i < note ? "#f59e0b" : "#d1d5db";
  });
}
function selectionnerNote(n, id) {
  const el = document.getElementById(`etoiles_${id}`);
  if (el) el.dataset.note = n;
  survoleEtoile(n, id);
}
async function envoyerAvis(containerId, collection, prestatireId) {
  const note = parseInt(document.getElementById(`etoiles_${containerId}`)?.dataset.note || "0");
  if (!note) { alert("Veuillez sélectionner une note (1 à 5 étoiles)."); return; }
  const comm = document.getElementById(`comm_${containerId}`)?.value || "";
  const auteurId = `user_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const result = await soumettreAvis(collection, prestatireId, note, comm, auteurId);
  const msg = document.getElementById(`msg_${containerId}`);
  if (msg) { msg.textContent = result.message; msg.style.color = result.success ? "#16a34a" : "#dc2626"; }
}
