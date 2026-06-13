// =============================================
// APP.JS — Logique principale de l'application
// MaisonFacile — Congo, Gabon, Cameroun, Côte d'Ivoire
// =============================================

import { lireAnnoncesActives, publierAnnonce } from './firebase.js';
import { lancerPaiementCinetPay } from './cinetpay.js';

// Sélectionner le pays par défaut (Ex: Congo)
let PAYS_ACTUEL = "Congo";

// ── CHARGER ET AFFICHER LES LOGEMENTS ──────────
export async function initialiserApplication() {
  console.log("Démarrage de MaisonFacile pour le pays :", PAYS_ACTUEL);
  try {
    // 1. Lire les annonces réelles dans Firebase
    const annonces = await lireAnnoncesActives({ pays: PAYS_ACTUEL });
    
    // 2. Vérifier les alertes d'expiration (J-7)
    analyserExpirations(annonces);
    
    // 3. Afficher les marqueurs sur la carte et dans la liste
    afficherLogementsSurInterface(annonces);
  } catch (error) {
    console.error("Erreur au démarrage de l'application :", error);
  }
}

// ── VÉRIFICATION DES ALERTES EXSPIRATION (J-7) ──
function analyserExpirations(annonces) {
  const maintenant = new Date();
  
  annonces.forEach(annonce => {
    if (annonce.dateExpiration) {
      const dateExp = new Date(annonce.dateExpiration);
      const differenceEnTemps = dateExp.getTime() - maintenant.getTime();
      const joursRestants = Math.ceil(differenceEnTemps / (1000 * 60 * 60 * 24));
      
      // ALERTE J-7 : Si l'annonce expire dans 7 jours ou moins
      if (joursRestants <= 7 && joursRestants > 0) {
        console.log(`⚠️ ALERTE : L'annonce ${annonce.id} expire dans ${joursRestants} jours.`);
        
        // Déclencher l'affichage visuel orange sur l'interface
        marquerAnnonceBientotExpireeVisuellement(annonce.id, joursRestants);
        
        // Note : Le serveur s'occupe d'envoyer le SMS en arrière-plan au numéro : ${annonce.telephone}
      }
    }
  });
}

// ── ACTION DU LOGEUR : PAYER ET PUBLIER ─────────
export async function gererSoumissionAnnonce(donneesFormulaire) {
  try {
    // 1. Déterminer le tarif selon le type de logement
    const tarifs = { studio: 2500, '2p': 2500, villa: 5000 };
    const montantAPayer = tarifs[donneesFormulaire.type] || 2500;
    
    // 2. Enregistrer l'annonce en attente dans Firebase
    const annonceId = await publierAnnonce({
      ...donneesFormulaire,
      statut: "en_attente_paiement" // Bloquée tant que le Mobile Money n'est pas validé
    });
    
    // 3. Lancer la passerelle de paiement CinetPay Mobile Money
    await lancerPaiementCinetPay({
      montant: montantAPayer,
      description: `Publication annonce MaisonFacile - ID: ${annonceId}`,
      telephone: donneesFormulaire.telephone,
      nomClient: donneesFormulaire.nomLogeur,
      annonceId: annonceId,
      typePaiement: "publication",
      onSuccess: () => {
        alert("Paiement réussi ! Votre annonce est maintenant visible.");
        window.location.reload();
      },
      onError: (messageErreur) => {
        alert("Échec du paiement Mobile Money : " + messageErreur);
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la publication :", error);
    alert("Une erreur technique est survenue.");
  }
}

// ── FONCTIONS VISUELLES REQUISES POUR L'INTERFACE ──
function afficherLogementsSurInterface(annonces) {
  console.log(`Affichage de ${annonces.length} logements économiques à l'écran.`);
}

function marquerAnnonceBientotExpireeVisuellement(annonceId, jours) {
  const elementAnnonce = document.getElementById(`annonce-${annonceId}`);
  if (elementAnnonce) {
    elementAnnonce.classList.add("bientot-expire");
    elementAnnonce.innerHTML += `<div class="badge-alerte">⚠️ Expire dans ${jours} jours ! Réabonnez-vous</div>`;
  }
}