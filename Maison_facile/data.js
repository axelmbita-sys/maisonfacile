// =============================================
// DATA.JS — Données partagées MaisonFacile
// v2.0 — Congo, Gabon, Cameroun, Côte d'Ivoire
// =============================================

const VILLES = {
  Congo:          ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso'],
  Gabon:          ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda'],
  Cameroun:       ['Yaoundé', 'Douala', 'Bafoussam', 'Garoua', 'Bamenda'],
  "Côte d'Ivoire":['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro']
};

// Codes ISO pays pour CinetPay → sélection automatique opérateurs
const PAYS_ISO = {
  Congo:           'CG',   // MTN Congo, Airtel Congo
  Gabon:           'GA',   // Airtel Gabon, Moov Gabon
  Cameroun:        'CM',   // MTN Cameroun, Orange Cameroun
  "Côte d'Ivoire": 'CI'    // Orange CI, MTN CI, Moov CI, Wave
};

// Drapeaux par pays
const PAYS_DRAPEAUX = {
  Congo:           '🇨🇬',
  Gabon:           '🇬🇦',
  Cameroun:        '🇨🇲',
  "Côte d'Ivoire": '🇨🇮'
};

// Centres de carte par pays (lat, lng, zoom)
const PAYS_CENTRES = {
  Congo:           { lat: -4.26,  lng: 15.28, zoom: 13 },
  Gabon:           { lat:  0.39,  lng:  9.45, zoom: 13 },
  Cameroun:        { lat:  3.87,  lng: 11.52, zoom: 13 },
  "Côte d'Ivoire": { lat:  5.35,  lng: -4.00, zoom: 13 }
};

// Opérateurs disponibles par pays ISO
const OPERATEURS_PAR_PAYS = {
  CG: ['mtn', 'airtel'],
  GA: ['airtel', 'moov'],
  CM: ['mtn', 'orange'],
  CI: ['orange', 'mtn', 'moov', 'wave']
};

const OPERATEURS_INFO = {
  mtn:    { label: 'MTN',    couleur: '#FFCC00', textColor: '#333',   code: '*126#' },
  airtel: { label: 'Airtel', couleur: '#E3001B', textColor: '#fff',   code: '*500#' },
  orange: { label: 'Orange', couleur: '#FF7900', textColor: '#fff',   code: '#144#' },
  moov:   { label: 'Moov',   couleur: '#0077C8', textColor: '#fff',   code: '*155#' },
  wave:   { label: 'Wave',   couleur: '#0066FF', textColor: '#fff',   code: 'App'   }
};

const OPERATEURS_INSTRUCTIONS = {
  mtn:    'Composez <strong>*126#</strong> sur votre téléphone MTN, choisissez "Payer un marchand", entrez le code marchand <strong>MAISON01</strong> et le montant indiqué.',
  airtel: 'Composez <strong>*500#</strong> sur votre téléphone Airtel Money, choisissez "Paiement marchand", entrez le code <strong>MAISON01</strong> et confirmez.',
  orange: 'Composez <strong>#144#</strong> sur votre téléphone Orange Money, sélectionnez "Paiement marchand", entrez le numéro <strong>MAISON01</strong> et le montant.',
  moov:   'Composez <strong>*155#</strong> sur votre téléphone Moov Money, choisissez "Paiement", entrez le code marchand <strong>MAISON01</strong> et confirmez.',
  wave:   'Ouvrez l\'application <strong>Wave</strong>, appuyez sur "Envoyer", recherchez <strong>MaisonFacile</strong> et entrez le montant à payer.'
};

const TARIFS = {
  studio: 2500,
  '2p':   2500,
  villa:  5000
};

const TYPES_LABELS = {
  studio: 'Studio / Chambre',
  '2p':   '2 Chambres salon',
  villa:  'Villa / Appartement'
};

// ─── Annonces de démonstration ────────────────
let ANNONCES = [
  {
    id: 1, titre: 'Appartement 2 chambres salon — Moungali',
    type: '2p', pays: 'Congo', ville: 'Brazzaville', quartier: 'Moungali',
    loyer: 85000, description: 'Bel appartement de 2 chambres avec salon spacieux, douche moderne et cuisine équipée. Eau et électricité disponibles. Gardien sur place.',
    telephone: '+242 06 123 45 67', nomLogeur: 'Jean-Pierre M.',
    lat: -4.2634, lng: 15.2429, statut: 'actif',
    datePublication: '2025-01-10', dateExpiration: '2025-02-10', image: null
  },
  {
    id: 2, titre: 'Villa F4 avec jardin — Bacongo',
    type: 'villa', pays: 'Congo', ville: 'Brazzaville', quartier: 'Bacongo',
    loyer: 200000, description: 'Grande villa de 4 pièces avec jardin clôturé, parking, groupe électrogène. Quartier calme et sécurisé.',
    telephone: '+242 05 987 65 43', nomLogeur: 'Marie K.',
    lat: -4.2900, lng: 15.2700, statut: 'actif',
    datePublication: '2025-01-08', dateExpiration: '2025-02-08', image: null
  },
  {
    id: 3, titre: 'Studio meublé — Centre-ville Libreville',
    type: 'studio', pays: 'Gabon', ville: 'Libreville', quartier: 'Centre-ville',
    loyer: 120000, description: 'Studio entièrement meublé, climatisé, avec salle de bain privée. Eau chaude, internet inclus.',
    telephone: '+241 07 456 78 90', nomLogeur: 'Patrick O.',
    lat: 0.3901, lng: 9.4544, statut: 'actif',
    datePublication: '2025-01-09', dateExpiration: '2025-02-09', image: null
  },
  {
    id: 4, titre: '2 chambres salon — Akanda',
    type: '2p', pays: 'Gabon', ville: 'Libreville', quartier: 'Akanda',
    loyer: 150000, description: 'Appartement 2 chambres dans résidence sécurisée. Cuisine équipée, douche, toilettes séparés. Parking et gardiennage 24h/24.',
    telephone: '+241 06 321 00 11', nomLogeur: 'Sylvie N.',
    lat: 0.4500, lng: 9.4000, statut: 'actif',
    datePublication: '2025-01-07', dateExpiration: '2025-02-07', image: null
  },
  {
    id: 5, titre: 'Appartement 3 pièces — Bastos Yaoundé',
    type: 'villa', pays: 'Cameroun', ville: 'Yaoundé', quartier: 'Bastos',
    loyer: 180000, description: 'Bel appartement au quartier Bastos, 3 chambres, 2 salles de bain. Standing élevé, sécurité permanente.',
    telephone: '+237 655 123 456', nomLogeur: 'Rodrigue T.',
    lat: 3.8877, lng: 11.5166, statut: 'actif',
    datePublication: '2025-01-06', dateExpiration: '2025-02-06', image: null
  },
  {
    id: 6, titre: 'Chambre salon — Akwa Douala',
    type: 'studio', pays: 'Cameroun', ville: 'Douala', quartier: 'Akwa',
    loyer: 60000, description: 'Chambre salon propre et bien entretenue au quartier Akwa. Douche et cuisine partagées. Idéal pour étudiant ou jeune travailleur.',
    telephone: '+237 677 987 654', nomLogeur: 'Alice B.',
    lat: 4.0511, lng: 9.7085, statut: 'actif',
    datePublication: '2025-01-05', dateExpiration: '2025-02-05', image: null
  },
  {
    id: 7, titre: 'Appartement 2 chambres — Cocody Abidjan',
    type: '2p', pays: "Côte d'Ivoire", ville: 'Abidjan', quartier: 'Cocody',
    loyer: 150000, description: 'Bel appartement 2 chambres dans le quartier résidentiel de Cocody. Eau, électricité, gardien. Proche universités et commerces.',
    telephone: '+225 07 123 45 67', nomLogeur: 'Kouassi A.',
    lat: 5.3600, lng: -3.9900, statut: 'actif',
    datePublication: '2025-01-10', dateExpiration: '2025-02-10', image: null
  },
  {
    id: 8, titre: 'Villa 4 pièces — Riviera Abidjan',
    type: 'villa', pays: "Côte d'Ivoire", ville: 'Abidjan', quartier: 'Riviera',
    loyer: 350000, description: 'Villa moderne de standing à la Riviera. 4 chambres, 3 salles de bain, piscine, parking sécurisé. Idéal pour expatriés.',
    telephone: '+225 05 987 65 43', nomLogeur: 'Amara D.',
    lat: 5.3800, lng: -3.9600, statut: 'actif',
    datePublication: '2025-01-08', dateExpiration: '2025-02-08', image: null
  }
];

// ─── Helpers localStorage ─────────────────────
function chargerAnnonces() {
  const stored = localStorage.getItem('mf_annonces');
  if (stored) {
    const extra = JSON.parse(stored);
    ANNONCES = [...ANNONCES, ...extra];
  }
  // Vérifier et expirer les annonces dont la date est dépassée
  const maintenant = new Date();
  ANNONCES.forEach(a => {
    if (a.statut === 'actif' && a.dateExpiration) {
      const exp = new Date(a.dateExpiration);
      if (exp < maintenant) a.statut = 'expire';
    }
  });
  return ANNONCES.filter(a => a.statut === 'actif');
}

function sauvegarderNouvelleAnnonce(annonce) {
  const stored = localStorage.getItem('mf_annonces');
  const extra = stored ? JSON.parse(stored) : [];
  extra.push(annonce);
  localStorage.setItem('mf_annonces', JSON.stringify(extra));
}

function retirerAnnonce(id) {
  const stored = localStorage.getItem('mf_annonces');
  const extra = stored ? JSON.parse(stored) : [];
  const idx = extra.findIndex(a => a.id === id);
  if (idx !== -1) { extra[idx].statut = 'loue'; localStorage.setItem('mf_annonces', JSON.stringify(extra)); }
  const base = ANNONCES.find(a => a.id === id);
  if (base) base.statut = 'loue';
}

function prolongerAnnonce(id) {
  const stored = localStorage.getItem('mf_annonces');
  const extra = stored ? JSON.parse(stored) : [];
  const idx = extra.findIndex(a => a.id === id);
  const nouvelleExp = new Date(); nouvelleExp.setDate(nouvelleExp.getDate() + 30);
  if (idx !== -1) {
    extra[idx].dateExpiration = nouvelleExp.toISOString().split('T')[0];
    extra[idx].statut = 'actif';
    localStorage.setItem('mf_annonces', JSON.stringify(extra));
  }
  const base = ANNONCES.find(a => a.id === id);
  if (base) { base.dateExpiration = nouvelleExp.toISOString().split('T')[0]; base.statut = 'actif'; }
}

function joursRestants(dateExpiration) {
  if (!dateExpiration) return null;
  const diff = new Date(dateExpiration) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatPrix(n) { return n.toLocaleString('fr-FR') + ' F CFA'; }
function formatDate(str) {
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function genererIdAnnonce() { return Date.now(); }
function drapeauPays(pays) { return PAYS_DRAPEAUX[pays] || '🌍'; }
