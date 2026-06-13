// =============================================
// HOTELS.JS — Logique page hôtels v2.0
// Congo (CG), Gabon (GA), Cameroun (CM), Côte d'Ivoire (CI)
// =============================================

// Importations requises depuis vos autres fichiers pour éviter les plantages
import { VILLES, PAYS_ISO, OPERATEURS_PAR_PAYS, OPERATEURS_INFO, formatPrix, drapeauPays } from './data.js';
import { ouvrirNotation } from './scoring.js';

const HOTELS_DEMO = [
  { id:'h1', nom:'Hôtel Cosmos', pays:'Congo', ville:'Brazzaville', quartier:'Centre-ville',
    etoiles:3, prixMin:25000, description:'Hôtel confortable au cœur de Brazzaville. Climatisation, restaurant, wifi.',
    telephone:'+242 06 111 22 33', lat:-4.266, lng:15.283, statut:'actif', scoresMoyen:4.2, nbAvis:38,
    chambres:[{type:'Simple',prix:25000},{type:'Double',prix:40000},{type:'Suite',prix:75000}]},
  { id:'h2', nom:'Grand Hôtel de Libreville', pays:'Gabon', ville:'Libreville', quartier:'Bord de mer',
    etoiles:4, prixMin:55000, description:'Vue mer, piscine, salle de conférence, parking sécurisé.',
    telephone:'+241 07 222 33 44', lat:0.392, lng:9.457, statut:'actif', scoresMoyen:4.5, nbAvis:72,
    chambres:[{type:'Standard',prix:55000},{type:'Supérieure',prix:80000},{type:'Suite Mer',prix:150000}]},
  { id:'h3', nom:'Résidence Mont Fébé', pays:'Cameroun', ville:'Yaoundé', quartier:'Mont Fébé',
    etoiles:4, prixMin:45000, description:'Hôtel panoramique sur les collines de Yaoundé. Piscine, spa, golf.',
    telephone:'+237 655 444 555', lat:3.895, lng:11.522, statut:'actif', scoresMoyen:3.8, nbAvis:29,
    chambres:[{type:'Classique',prix:45000},{type:'Supérieure',prix:65000},{type:'Suite',prix:120000}]},
  { id:'h4', nom:'Hôtel Ivoire', pays:"Côte d'Ivoire", ville:'Abidjan', quartier:'Cocody',
    etoiles:5, prixMin:80000, description:'Palace historique d\'Abidjan. Luxe, restaurant gastronomique, centre d\'affaires.',
    telephone:'+225 07 555 666 77', lat:5.362, lng:-3.993, statut:'actif', scoresMoyen:4.7, nbAvis:115,
    chambres:[{type:'Deluxe',prix:80000},{type:'Junior Suite',prix:130000},{type:'Suite Présidentielle',prix:300000}]},
  { id:'h5', nom:'Hôtel du Centre', pays:'Congo', ville:'Pointe-Noire', quartier:'Centre',
    etoiles:2, prixMin:15000, description:'Hôtel économique propre et bien situé. Idéal voyageurs d\'affaires.',
    telephone:'+242 05 777 88 99', lat:-4.777, lng:11.863, statut:'actif', scoresMoyen:3.1, nbAvis:17,
    chambres:[{type:'Simple',prix:15000},{type:'Double',prix:22000}]}
];

let hotelSelectionne = null;
let opHotelSelectionne = '';

document.addEventListener('DOMContentLoaded', () => {
  setupBurger();
  filtrerHotels();
  initMapHotels();
  initOperateursInscription();
  
  // Attacher les fonctions à la fenêtre globale pour les boutons HTML
  window.filtrerHotels = filtrerHotels;
  window.resetFiltres = resetFiltres;
  window.ouvrirReservation = ouvrirReservation;
  window.ouvrirNotation = ouvrirNotation;
  window.updateVillesHotel = updateVillesHotel;
  window.inscrireHotel = inscrireHotel;
  window.calculerTotal = calculerTotal;
  window.selOpHotel = selOpHotel;
  window.confirmerReservationHotel = confirmerReservationHotel;
});

function filtrerHotels() {
  let liste = [...HOTELS_DEMO].filter(h => h.statut === 'actif');
  const pays = document.getElementById('fPays')?.value;
  const ville = document.getElementById('fVille')?.value.toLowerCase();
  const etoiles = document.getElementById('fEtoiles')?.value;
  const prixMax = parseInt(document.getElementById('fPrixMax')?.value) || Infinity;
  const scoreMin = parseFloat(document.getElementById('fScore')?.value) || 0;
  const sort = document.getElementById('sortHotels')?.value || 'score';

  if (pays) liste = liste.filter(h => h.pays === pays);
  if (ville) liste = liste.filter(h => h.ville.toLowerCase().includes(ville) || h.quartier.toLowerCase().includes(ville));
  if (etoiles) liste = liste.filter(h => h.etoiles >= parseInt(etoiles));
  liste = liste.filter(h => h.prixMin <= prixMax);
  if (scoreMin) liste = liste.filter(h => (h.scoresMoyen || 0) >= scoreMin);

  if (sort === 'score') liste.sort((a,b) => (b.scoresMoyen||0)-(a.scoresMoyen||0));
  else if (sort === 'prix_asc') liste.sort((a,b) => a.prixMin - b.prixMin);
  else liste.sort((a,b) => b.prixMin - a.prixMin);

  const ct = document.getElementById('countHotels');
  if (ct) ct.textContent = `${liste.length} hôtel${liste.length>1?'s':''} trouvé${liste.length>1?'s':''}`;
  renderHotels(liste);
}

function resetFiltres() {
  ['fPays','fVille','fEtoiles','fPrixMax','fScore'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  filtrerHotels();
}

function renderHotels(liste) {
  const grid = document.getElementById('hotelsGrid');
  if (!grid) return;
  if (!liste.length) { grid.innerHTML = '<p style="color:var(--color-text-secondary);padding:2rem">Aucun hôtel trouvé.</p>'; return; }
  grid.innerHTML = liste.map(h => {
    const sc = h.scoresMoyen || 0;
    const couleur = sc >= 4 ? '#16a34a' : sc >= 2.5 ? '#ca8a04' : '#dc2626';
    const etoilesStr = '★'.repeat(h.etoiles) + '☆'.repeat(5-h.etoiles);
    return `<div class="annonce-card">
      <div class="card-img ${h.etoiles >= 4 ? 'villa' : h.etoiles >= 3 ? '2p' : 'studio'}">
        <span class="card-pays-badge">${drapeauPays(h.pays)} ${h.pays}</span>
        <span class="card-type-badge">${etoilesStr}</span>
        <span style="position:absolute;bottom:8px;right:8px;background:${couleur};color:#fff;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:500">
          ★ ${sc ? sc.toFixed(1) : 'Nouveau'} ${h.nbAvis ? `(${h.nbAvis})` : ''}
        </span>
      </div>
      <div class="card-body">
        <div class="card-price">À partir de ${formatPrix(h.prixMin)}<span>/nuit</span></div>
        <h3 class="card-title">${h.nom}</h3>
        <p class="card-loc">📍 ${h.quartier}, ${h.ville}</p>
        <p class="card-desc">${h.description.substring(0,85)}...</p>
        <div class="card-footer">
          <button class="card-contact" onclick="ouvrirNotation('${h.id}','hotel','${h.nom}')">⭐ Noter</button>
          <button class="card-contact" onclick="ouvrirReservation('${h.id}')">🛏️ Réserver</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function ouvrirReservation(hotelId) {
  hotelSelectionne = HOTELS_DEMO.find(h => h.id === hotelId);
  if (!hotelSelectionne) return;
  document.getElementById('resaHotelNom').textContent = hotelSelectionne.nom;
  const sel = document.getElementById('resaChambre');
  sel.innerHTML = hotelSelectionne.chambres.map(c => `<option value="${c.prix}">${c.type} — ${formatPrix(c.prix)}/nuit</option>`).join('');
  
  const ops = OPERATEURS_PAR_PAYS[PAYS_ISO[hotelSelectionne.pays] || 'CG'] || ['mtn','airtel'];
  document.getElementById('resaOperateurs').innerHTML = ops.map(op => {
    const info = OPERATEURS_INFO[op];
    return `<div class="operateur-card" onclick="selOpHotel('${op}',this)">
      <span class="op-color ${op}">${info.label}</span>
      <span class="op-name">Money</span>
    </div>`;
  }).join('');
  document.getElementById('resaTotal').style.display = 'none';
  document.getElementById('modalReservation').style.display = 'flex';
  
  const auj = new Date(); auj.setDate(auj.getDate()+1);
  const dem = new Date(); dem.setDate(dem.getDate()+2);
  document.getElementById('resaArrivee').value = auj.toISOString().split('T')[0];
  document.getElementById('resaDepart').value = dem.toISOString().split('T')[0];
  calculerTotal();
}

function selOpHotel(op, el) {
  opHotelSelectionne = op;
  document.querySelectorAll('#resaOperateurs .operateur-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function calculerTotal() {
  const arrivee = new Date(document.getElementById('resaArrivee').value);
  const depart = new Date(document.getElementById('resaDepart').value);
  const prixNuit = parseInt(document.getElementById('resaChambre').value) || 0;
  if (!arrivee || !depart || depart <= arrivee) return;
  const nuits = Math.ceil((depart - arrivee) / (1000*60*60*24));
  const total = nuits * prixNuit;
  const commission = Math.round(total * 0.0999);
  const box = document.getElementById('resaTotal');
  box.style.display = 'block';
  box.innerHTML = `<div class="tarif-label">${nuits} nuit${nuits>1?'s':''}</div>
    <div class="tarif-amount">${formatPrix(total)}</div>
    <div class="tarif-note">Commission plateforme (9,99%) : ${formatPrix(commission)}</div>`;
}

function confirmerReservationHotel() {
  const nom = document.getElementById('resaNom').value;
  const tel = document.getElementById('resaTel').value;
  if (!nom || !tel) { alert('Remplissez votre nom et téléphone.'); return; }
  if (!opHotelSelectionne) { alert('Choisissez un opérateur Mobile Money.'); return; }

  document.getElementById('modalReservation').style.display = 'none';
  setTimeout(() => {
    const conf = document.createElement('div');
    conf.className = 'modal-overlay';
    conf.innerHTML = `<div class="modal-box" style="text-align:center;padding:2rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
      <h2>Réservation confirmée !</h2>
      <p style="font-size:14px;color:var(--color-text-secondary);margin-top:.75rem">
        Votre chambre à <strong style="font-weight:500">${hotelSelectionne?.nom}</strong> est réservée.<br>
        Un SMS de confirmation vous sera envoyé.
      </p>
      <button class="next-btn" style="margin-top:1.5rem" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
    </div>`;
    document.body.appendChild(conf);
  }, 1500);
  alert('⏳ Traitement du paiement...\nConfirmez sur votre téléphone Mobile Money.');
}
function initMapHotels() {
  const el = document.getElementById('mapHotels'); if (!el) return;
  const map = L.map('mapHotels').setView([0, 10], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OpenStreetMap'}).addTo(map);
  HOTELS_DEMO.filter(h=>h.lat&&h.lng&&h.statut==='actif').forEach(h => {
    const sc = h.scoresMoyen || 0;
    const c = sc>=4?'#16a34a':sc>=2.5?'#ca8a04':'#dc2626';
    const icon = L.divIcon({className:'',html:`<div class="map-marker" style="background:${c}">${h.etoiles}★</div>`,iconAnchor:[15,15]});
    L.marker([h.lat,h.lng],{icon}).addTo(map).bindPopup(`<strong>${h.nom}</strong><br>${h.ville}<br>À partir de ${formatPrix(h.prixMin)}/nuit`);
  });
}

function updateVillesHotel() {
  const pays = document.getElementById('inscPays').value;
  const sel = document.getElementById('inscVille');
  sel.innerHTML = pays ? VILLES[pays].map(v=>`<option value="${v}">${v}</option>`).join('') : "<option>Choisir d'abord le pays</option>";
}

function initOperateursInscription() {
  const grid = document.getElementById('inscOperateurs');
  if (!grid) return;
  grid.innerHTML = ['mtn','airtel','orange','wave'].map(op => {
    const info = OPERATEURS_INFO[op];
    return `<div class="operateur-card" onclick="this.parentNode.querySelectorAll('.operateur-card').forEach(c=>c.classList.remove('selected'));this.classList.add('selected')"> <span class="op-color ${op}">${info.label}</span><span class="op-name">Money</span> </div>`;
  }).join('');
}

function inscrireHotel() {
  const nom = document.getElementById('inscNom').value;
  const pays = document.getElementById('inscPays').value;
  const tel = document.getElementById('inscTel').value;
  if (!nom||!pays||!tel) { alert('Remplissez tous les champs obligatoires.'); return; }
  alert('⏳ Traitement du paiement de 10 000 F...\nConfirmez sur votre téléphone Mobile Money.');
  setTimeout(() => {
    document.getElementById('modalInscription').style.display = 'none';
    const c = document.createElement('div'); c.className='modal-overlay';
    c.innerHTML=`<div class="modal-box" style="text-align:center;padding:2rem"> <div style="font-size:3rem;margin-bottom:1rem">🏨</div> <h2>Hôtel inscrit !</h2> <p style="font-size:13px;color:var(--color-text-secondary);margin-top:.75rem"> <strong style="font-weight:500">${nom}</strong> est maintenant visible sur la plateforme.<br> Votre abonnement court sur 30 jours. </p> <button class="next-btn" style="margin-top:1.5rem" onclick="this.closest('.modal-overlay').remove()">Fermer</button> </div>`;
    document.body.appendChild(c);
  }, 2000);
}

function setupBurger() {
  const btn = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}