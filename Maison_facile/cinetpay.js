// =============================================
// CINETPAY.JS — Intégration Mobile Money v2.0
// Congo (CG), Gabon (GA), Cameroun (CM), Côte d'Ivoire (CI)
// =============================================

// ↓↓ REMPLACER PAR VOS VRAIES CLÉS CINETPAY ↓↓
const CINETPAY_CONFIG = {
  apiKey:    "VOTRE_API_KEY_CINETPAY",   // CinetPay → Paramètres → Mes API
  siteId:    "VOTRE_SITE_ID_CINETPAY",   // CinetPay → Paramètres → Mes API
  mode:      "TEST",                     // "TEST" → "PRODUCTION" au lancement
  notifyUrl: "https://maisonfacile-8366e.vercel.app/api/webhook-cinetpay",
  returnUrl: "https://maisonfacile-8366e.vercel.app/paiement-success.html",
  cancelUrl: "https://maisonfacile-8366e.vercel.app/publier.html"
};

// Devises par pays ISO (XAF = FCFA zone CEMAC, XOF = FCFA zone UEMOA)
const DEVISES_PAR_PAYS = {
  CG: 'XAF',  // Congo
  GA: 'XAF',  // Gabon
  CM: 'XAF',  // Cameroun
  CI: 'XOF'   // Côte d'Ivoire — FCFA UEMOA, même taux mais code différent
};

// Canaux Mobile Money activés par pays ISO (envoyé à CinetPay)
const CANAUX_PAR_PAYS = {
  CG: 'MOBILE_MONEY',
  GA: 'MOBILE_MONEY',
  CM: 'MOBILE_MONEY',
  CI: 'MOBILE_MONEY'
};

// ─── LANCER UN PAIEMENT CINETPAY ─────────────
export async function lancerPaiementCinetPay(options) {
  const {
    montant, description, telephone, nomClient,
    annonceId, typePaiement, pays,
    onError
  } = options;

  const paysISO    = PAYS_ISO[pays] || 'CG';
  const devise     = DEVISES_PAR_PAYS[paysISO] || 'XAF';
  const transId    = `MF_${typePaiement.toUpperCase()}_${Date.now()}`;

  try {
    const reponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey:          CINETPAY_CONFIG.apiKey,
        site_id:         CINETPAY_CONFIG.siteId,
        transaction_id:  transId,
        amount:          montant,
        currency:        devise,
        description:     description,
        notify_url:      CINETPAY_CONFIG.notifyUrl,
        return_url:      CINETPAY_CONFIG.returnUrl,
        cancel_url:      CINETPAY_CONFIG.cancelUrl,
        channels:        CANAUX_PAR_PAYS[paysISO],
        // ↓ customer_country adapté automatiquement selon le pays choisi
        customer_country:        paysISO,
        customer_name:           nomClient,
        customer_phone_number:   telephone.replace(/\s/g, ''),
        metadata: JSON.stringify({ annonceId, typePaiement, pays, transId })
      })
    });

    const data = await reponse.json();
    if (data.code === '201') {
      // Rediriger vers la page de paiement CinetPay (affiche les opérateurs du pays)
      window.location.href = data.data.payment_url;
      return { success: true, transId, paymentUrl: data.data.payment_url };
    } else {
      if (onError) onError(data.message);
      return { success: false, erreur: data.message };
    }
  } catch (err) {
    if (onError) onError('Erreur réseau. Vérifiez votre connexion.');
    return { success: false, erreur: err.message };
  }
}

// ─── VÉRIFIER LE STATUT D'UNE TRANSACTION ────
export async function verifierPaiement(transactionId) {
  try {
    const reponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: CINETPAY_CONFIG.apiKey,
        site_id: CINETPAY_CONFIG.siteId,
        transaction_id: transactionId
      })
    });
    const data = await reponse.json();
    const map = { '00': 'success', '600': 'pending', '623': 'failed', '624': 'cancelled' };
    return {
      statut: map[data.data?.status] || 'unknown',
      montant: data.data?.amount,
      operateur: data.data?.payment_method,
      dateConfirmation: data.data?.payment_date
    };
  } catch (err) {
    return { statut: 'error', erreur: err.message };
  }
}
