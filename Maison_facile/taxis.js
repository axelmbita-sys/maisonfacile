// =============================================
// TAXIS.JS — Logique page Taxis v2.0
// Inscription gratuite. Retrait à 20 avis négatifs.
// =============================================

// CORRECTION : Importations requises depuis data.js et scoring.js pour éviter les bugs
import { VILLES, formatPrix, drapeauPays } from './data.js';
import { ouvrirNotation, ouvrirSignalement } from './scoring.js';

const TAXIS_DEMO = [
  { id:'t1', nom:'Parfait Mabiala', pays:'Congo', ville:'Brazzaville', type:'sedan',
    vehicule:'Toyota Corolla', zone:'Brazzaville centre, Aéroport Maya-Maya',
    telephone:'+242 06 100 200 3', lat:-4.264, lng:15.281, statut:'actif', scoresMoyen:4.6, nbAvis:52, dispo:true },
  { id:'t2', nom:'Alexis Nguema', pays:'Gabon', ville:'Libreville', type:'4x4',
    vehicule:'Toyota Land Cruiser', zone:'Grand Libreville, Owendo',
    telephone:'+241 07 200 300 4', lat:0.393, lng:9.452, statut:'actif', scoresMoyen:4.1, nbAvis:31, dispo:true },
  { id:'t3', nom:'Charles Mbida', pays:'Cameroun', ville:'Douala', type:'minibus',
    vehicule:'Mercedes Sprinter 9 places', zone:'Douala toutes zones, Bafoussam',
    telephone:'+237 677 300 400', lat:4.053, lng:9.711, statut:'actif', scoresMoyen:3.6, nbAvis:24, dispo:false },
  { id:'t4', nom:'Kofi Asante', pays:"Côte d'Ivoire", ville:'Abidjan', type:'sedan',
    vehicule:'Hyundai Accent', zone:'Cocody, Plateau, Marcory',
    telephone:'+225 07 400 500 6', lat:5.359, lng:-4.002, statut:'actif', scoresMoyen:4.3, nbAvis:67, dispo:true },
  { id:'t5', nom:'Justin Loemba', pays:'Congo', ville:'Pointe-Noire', type:'sedan',
    vehicule:'Renault Logan', zone:'Pointe-Noire toutes zones',
    telephone:'+242 05 500 600 7', lat:-4.776, lng:11.864, statut:'actif', scoresMoyen:2.1, nbAvis:22, dispo:true }
];

document.addEventListener('DOMContentLoaded', () => {
  setupBurger();
  filtrerTaxis();
  initMapTaxis();
  
  // Attacher les fonctions à la fenêtre globale pour les boutons HTML
  window.filtrerTaxis = filtrerTaxis;
  window.resetFiltreTaxi = resetFiltreTaxi;
  window.ouvrirNotation = ouvrirNotation;
  window.ouvrirSignalement = ouvrirSignalement;
  window.contacterTaxi = contacterTaxi;
  window.ouvrirInscriptionTaxi = ouvrirInscriptionTaxi;
  window.updateVillesTaxi = updateVillesTaxi;
  window.inscrireTaxi = inscrireTaxi;
});

function filtrerTaxis() {
  let liste = TAXIS_DEMO.filter(t => t.statut === 'actif');
  const pays = document.getElementById('fPays')?.value;
  const ville = document.getElementById('fVille')?.value.toLowerCase();
  const type = document.getElementById('fType')?.value;
  const scoreMin = parseFloat(document.getElementById('fScore')?.value) || 0;
  const dispo = document.getElementById('fDispo')?.value;

  if (pays) liste = liste.filter(t => t.pays === pays);
  if (ville) liste = liste.filter(t => t.ville.toLowerCase().includes(ville));
  if (type) liste = liste.filter(t => t.type === type);
  if (scoreMin) liste = liste.filter(t => (t.scoresMoyen||0) >= scoreMin);
  if (dispo === '1') liste = liste.filter(t => t.dispo);

  liste.sort((a,b) => (b.scoresMoyen||0)-(a.scoresMoyen||0));

  const ct = document.getElementById('countTaxis');
  if (ct) ct.textContent = `${liste.length} chauffeur${liste.length>1?'s':''} trouvé${liste.length>1?'s':''}`;
  renderTaxis(liste);
}

function resetFiltreTaxi() {
  ['fPays','fVille','fType','fScore','fDispo'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  filtrerTaxis();
}

function renderTaxis(liste) {
  const grid = document.getElementById('taxisGrid');
  if (!grid) return;
  const typeIcons = { sedan:'🚗', '4x4':'🚙', minibus:'🚐' };
  grid.innerHTML = liste.map(t => {
    const sc = t.scoresMoyen || 0;
    const couleur = sc>=4?'#16a34a':sc>=2.5?'#ca8a04':'#dc2626';
    const etiquette = sc>=4?'Excellent':sc>=2.5?'Correct':'Mauvais';
    return `<div class="annonce-card">
      <div class="card-img ${sc>=4?'2p':sc>=2.5?'studio':'villa'}" style="align-items:center;justify-content:center">
        <span class="card-pays-badge" style="position:absolute;top:10px;left:10px">${drapeauPays(t.pays)} ${t.pays}</span>
        <span style="font-size:3.5rem">${typeIcons[t.type]||'🚗'}</span>
        <span style="position:absolute;bottom:8px;right:8px;background:${couleur};color:#fff;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:500">
          ★ ${sc?sc.toFixed(1):'Nouveau'} — ${etiquette}
        </span>
        ${t.dispo?'<span style="position:absolute;top:10px;right:10px;background:#16a34a;color:#fff;border-radius:6px;padding:2px 7px;font-size:11px">Disponible</span>':''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${t.nom}</h3>
        <p class="card-loc">📍 ${t.ville} · ${t.vehicule}</p>
        <p class="card-desc" style="font-size:12px">🗺️ ${t.zone}</p>
        <div class="card-footer" style="margin-top:8px">
          <button class="card-contact" onclick="ouvrirNotation('${t.id}','taxi','${t.nom}')">⭐ Noter</button>
          <button class="card-contact" onclick="contacterTaxi('${t.telephone}','${t.nom}')">📞 Contacter</button>
          <button class="card-contact" style="font-size:11px" onclick="ouvrirSignalement('${t.id}','taxi')">🚩</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function contacterTaxi(tel, nom) {
  alert(`📞 Contacter ${nom}\nTéléphone : ${tel}`);
}

function initMapTaxis() {
  const el = document.getElementById('mapTaxis'); if (!el) return;
  const map = L.map('mapTaxis').setView([0,10],3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  TAXIS_DEMO.filter(t=>t.lat&&t.lng&&t.statut==='actif').forEach(t => {
    const sc = t.scoresMoyen||0;
    const c = sc>=4?'#16a34a':sc>=2.5?'#ca8a04':'#dc2626';
    const icon = L.divIcon({className:'',html:`<div class="map-marker" style="background:${c}">🚗</div>`,iconAnchor:[24,12]});
    L.marker([t.lat,t.lng],{icon}).addTo(map).bindPopup(`<strong>${t.nom}</strong><br>${t.vehicule}`);
  });
}

function ouvrirInscriptionTaxi() { document.getElementById('modalTaxiInsc').style.display='flex'; }

function updateVillesTaxi() {
  const pays = document.getElementById('txPays').value;
  const sel = document.getElementById('txVille');
  sel.innerHTML = pays ? VILLES[pays].map(v=>`<option value="${v}">${v}</option>`).join('') : "<option>Choisir d'abord le pays</option>";
}

function inscrireTaxi() {
  const nom = document.getElementById('txNom').value;
  const tel = document.getElementById('txTel').value;
  const pays = document.getElementById('txPays').value;
  if (!nom||!tel||!pays) { alert('Remplissez tous les champs obligatoires.'); return; }
  document.getElementById('modalTaxiInsc').style.display='none';
  const c=document.createElement('div'); c.className='modal-overlay';
  c.innerHTML=`<div class="modal-box" style="text-align:center;padding:2rem">
    <div style="font-size:3rem;margin-bottom:1rem">🚖</div>
    <h2>Inscription enregistrée !</h2>
    <p style="font-size:13px;color:var(--color-text-secondary);margin-top:.75rem">
      Bienvenue <strong style="font-weight:500">${nom}</strong> !<br>
      Votre profil sera visible après vérification (24h max).<br><br>
      ⚠️ Rappel : 20 avis négatifs consécutifs = suspension automatique.
    </p>
    <button class="next-btn" style="margin-top:1.5rem" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
  </div>`;
  document.body.appendChild(c);
}

function setupBurger() {
  const btn=document.getElementById('burger'),menu=document.getElementById('mobileMenu');
  if(btn&&menu) btn.addEventListener('click',()=>menu.classList.toggle('open'));
}