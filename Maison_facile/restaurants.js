// =============================================
// RESTAURANTS.JS — Logique page restaurants v2.0
// Congo (CG), Gabon (GA), Cameroun (CM), Côte d'Ivoire (CI)
// Règle : Les notes < 2.5 (Rouge) sont masquées du public
// =============================================

import { VILLES, OPERATEURS_INFO, formatPrix, drapeauPays } from './data.js';
import { ouvrirNotation, couleurScore } from './scoring.js';

const RESTOS_DEMO = [
  { id:'r1', nom:'Le Phare du Chariot', pays:'Congo', ville:'Brazzaville', quartier:'Poto-Poto',
    cuisine:'africaine', prixMoyen:6500, telephone:'+242 06 444 55 66', lat:-4.268, lng:15.248, statut:'actif', scoresMoyen:4.4, nbAvis:45, description:'Spécialités de poissons braisés, Saka-Saka et Maboké authentiques.' },
  { id:'r2', nom:'L\'Alizé du Bord de Mer', pays:'Gabon', ville:'Libreville', quartier:'Louis',
    cuisine:'internationale', prixMoyen:18000, telephone:'+241 07 888 99 00', lat:0.395, lng:9.449, statut:'actif', scoresMoyen:4.1, nbAvis:28, description:'Cuisine raffinée face à la mer. Idéal pour vos rendez-vous d\'affaires.' },
  { id:'r3', nom:'Le Marseillais', pays:'Cameroun', ville:'Douala', quartier:'Bonanjo',
    cuisine:'grillade', prixMoyen:8000, telephone:'+237 699 111 222', lat:4.043, lng:9.689, statut:'actif', scoresMoyen:3.5, nbAvis:19, description:'Poulets et poissons braisés au feu de bois. Ambiance chaleureuse.' },
  { id:'r4', nom:'Maquis Du Val', pays:"Côte d'Ivoire", ville:'Abidjan', quartier:'Cocody',
    cuisine:'africaine', prixMoyen:7500, telephone:'+225 07 999 888 77', lat:5.348, lng:-3.978, statut:'actif', scoresMoyen:4.6, nbAvis:92, description:'Le maquis gastronomique incontournable. Garba premium, Alloco et Kédjénou.' },
  { id:'r5', nom:'Le Snack Rapide', pays:'Congo', ville:'Pointe-Noire', quartier:'Grand Marché',
    cuisine:'fast', prixMoyen:2500, telephone:'+242 05 333 44 55', lat:-4.781, lng:11.859, statut:'actif', scoresMoyen:2.2, nbAvis:14, description:'Chawarmas et burgers sur le pouce.' }
];

document.addEventListener('DOMContentLoaded', () => {
  setupBurger();
  filtrerRestaurants();
  initMapResto();
  initOperateursInscriptionResto();

  // Attacher les fonctions à la fenêtre globale pour les boutons HTML
  window.filtrerRestaurants = filtrerRestaurants;
  window.resetFiltreResto = resetFiltreResto;
  window.ouvrirNotation = ouvrirNotation;
  window.ouvrirInscriptionResto = ouvrirInscriptionResto;
  window.updateVillesResto = updateVillesResto;
  window.inscrireResto = inscrireResto;
});

function filtrerRestaurants() {
  // BARRIÈRE DE SÉCURITÉ : On filtre uniquement les actifs dont le score n'est PAS rouge (< 2.5)
  let liste = RESTOS_DEMO.filter(r => {
    const couleur = couleurScore(r.scoresMoyen);
    return r.statut === 'actif' && couleur !== 'rouge';
  });

  const pays = document.getElementById('fPays')?.value;
  const ville = document.getElementById('fVille')?.value.toLowerCase();
  const cuisine = document.getElementById('fCuisine')?.value;
  const scoreMin = parseFloat(document.getElementById('fScore')?.value) || 0;
  const budget = document.getElementById('fPrix')?.value;

  if (pays) liste = liste.filter(r => r.pays === pays);
  if (ville) liste = liste.filter(r => r.ville.toLowerCase().includes(ville) || r.quartier.toLowerCase().includes(ville));
  if (cuisine) liste = liste.filter(r => r.cuisine === cuisine);
  if (scoreMin) liste = liste.filter(r => (r.scoresMoyen || 0) >= scoreMin);

  if (budget === 'economique') liste = liste.filter(r => r.prixMoyen < 5000);
  else if (budget === 'moyen') liste = liste.filter(r => r.prixMoyen >= 5000 && r.prixMoyen <= 15000);
  else if (budget === 'haut') liste = liste.filter(r => r.prixMoyen > 15000);

  liste.sort((a,b) => (b.scoresMoyen || 0) - (a.scoresMoyen || 0));

  const ct = document.getElementById('countResto');
  if (ct) ct.textContent = `${liste.length} restaurant${liste.length>1?'s':''} affiché${liste.length>1?'s':''}`;
  renderRestos(liste);
}

function renderRestos(liste) {
  const grid = document.getElementById('restoGrid');
  if (!grid) return;
  if (!liste.length) { grid.innerHTML = '<p style="color:var(--color-text-secondary);padding:2rem">Aucun restaurant disponible.</p>'; return; }
  
  const labelsCuisine = { africaine: '🍲 Africaine', internationale: '🥩 Internationale', grillade: '🔥 Grillades', fast: '🍔 Fast Food' };

  grid.innerHTML = liste.map(r => {
    const sc = r.scoresMoyen || 0;
    const couleur = sc >= 4 ? '#16a34a' : '#ca8a04';
    return `<div class="annonce-card">
      <div class="card-body" style="padding-top:1.5rem">
        <span class="card-pays-badge" style="top:15px;left:15px">${drapeauPays(r.pays)} ${r.ville}</span>
        <span style="float:right;background:${couleur};color:#fff;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:500">
          ★ ${sc ? sc.toFixed(1) : 'Nouveau'}
        </span>
        <div style="clear:both;margin-top:1rem"></div>
        <h3 class="card-title" style="font-size:1.2rem;margin-bottom:0.25rem">${r.nom}</h3>
        <p style="font-size:13px;font-weight:500;color:var(--color-text-secondary);margin-bottom:0.5rem">${labelsCuisine[r.cuisine] || 'Restaurant'}</p>
        <p class="card-desc" style="margin-bottom:0.5rem">${r.description}</p>
        <p class="card-price" style="font-size:14px;margin-bottom:1rem">Budget moyen : <span>${formatPrix(r.prixMoyen)}</span></p>
        <div class="card-footer" style="gap:8px">
          <button class="card-contact" style="flex:1" onclick="ouvrirNotation('${r.id}','restaurant','${r.nom}')">⭐ Noter</button>
          <a href="tel:${r.telephone.replace(/\s/g, '')}" class="pay-btn" style="flex:1;text-align:center;text-decoration:none;padding:8px;font-size:13px;background:#16a34a;color:white">📞 Appeler</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

function resetFiltreResto() {
  ['fPays','fVille','fCuisine','fScore','fPrix'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  filtrerRestaurants();
}

function initMapResto() {
  const el = document.getElementById('mapResto'); if (!el) return;
  const map = L.map('mapResto').setView([-4.26, 15.28], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OpenStreetMap'}).addTo(map);
  
  RESTOS_DEMO.filter(r => r.lat && r.lng && r.statut === 'actif' && couleurScore(r.scoresMoyen) !== 'rouge').forEach(r => {
    const sc = r.scoresMoyen || 0;
    const c = sc >= 4 ? '#16a34a' : '#ca8a04';
    const icon = L.divIcon({
      className: '',
      html: `<div class="map-marker" style="background:${c};border-radius:50%;width:24px;height:24px;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">🍽️</div>`,
      iconAnchor: [12, 12]
    });
    L.marker([r.lat, r.lng], {icon}).addTo(map)
      .bindPopup(`<strong>${r.nom}</strong><br>Budget moyen : ${formatPrix(r.prixMoyen)}`);
  });
}

function ouvrirInscriptionResto() {
  document.getElementById('modalRestoInsc').style.display = 'flex';
  document.getElementById('rTarifLabel').textContent = "5 000 F CFA / mois";
}

function updateVillesResto() {
  const pays = document.getElementById('rPays').value;
  const sel = document.getElementById('rVille');
  sel.innerHTML = pays ? VILLES[pays].map(v => `<option value="${v}">${v}</option>`).join('') : "<option>Choisir d'abord le pays</option>";
}

function initOperateursInscriptionResto() {
  const grid = document.getElementById('rOperateurs');
  if (!grid) return;
  grid.innerHTML = ['mtn','airtel','orange','wave'].map(op => {
    const info = OPERATEURS_INFO[op];
    return `<div class="operateur-card" onclick="this.parentNode.querySelectorAll('.operateur-card').forEach(c=>c.classList.remove('selected'));this.classList.add('selected')">
      <span class="op-color ${op}">${info?.label || op.toUpperCase()}</span><span class="op-name">Money</span>
    </div>`;
  }).join('');
}

function inscrireResto() {
  const nom = document.getElementById('rNom').value;
  const tel = document.getElementById('rTel').value;
  const pays = document.getElementById('rPays').value;
  if (!nom || !tel || !pays) { alert('Remplissez tous les champs obligatoires (*).'); return; }
  
  alert('⏳ Traitement du paiement de l\'abonnement...\nConfirmez sur votre téléphone Mobile Money.');
  setTimeout(() => {
    document.getElementById('modalRestoInsc').style.display = 'none';
    const c = document.createElement('div'); c.className = 'modal-overlay';
    c.innerHTML = `<div class="modal-box" style="text-align:center;padding:2rem">
      <div style="font-size:3rem;margin-bottom:1rem">🍽️</div>
      <h2>Restaurant enregistré !</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:.75rem">
        Le restaurant <strong style="font-weight:500">${nom}</strong> est en ligne !<br>
        Votre visibilité restera active tant que votre note restera supérieure à 2.5★ [INDEX].
      </p>
      <button class="next-btn" style="margin-top:1.5rem" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
    </div>`;
    document.body.appendChild(c);
  }, 2000);
}

function setupBurger() {
  const btn = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}