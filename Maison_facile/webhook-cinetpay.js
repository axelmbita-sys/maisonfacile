// api/webhook-cinetpay.js — Vercel Serverless Function
// Gère : maisons, hôtels (abonnement + commission), restaurants, taxis
const admin = require("firebase-admin");

function initFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      })
    });
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { cpm_trans_id, cpm_result, cpm_amount, cpm_custom } = req.body;
  if (cpm_result !== "00") return res.status(200).json({ message: "ignored" });

  let meta = {};
  try { meta = JSON.parse(cpm_custom || "{}"); } catch {}

  const { type, id, pays } = meta; // type = publication|renouvellement|reservation|hotel_abonnement|hotel_reservation|restaurant_abonnement
  if (!type || !id) return res.status(400).json({ message: "metadata invalide" });

  try {
    const db  = initFirebase();
    const FV  = admin.firestore.FieldValue;
    const TS  = admin.firestore.Timestamp;
    const now = FV.serverTimestamp();
    const dans30j = TS.fromDate(new Date(Date.now() + 30 * 86400000));

    // ── MAISONS ──────────────────────────────────────────
    if (type === "publication") {
      await db.collection("annonces").doc(id).update({
        statut: "actif", dateActivation: now, dateExpiration: dans30j,
        paiementId: cpm_trans_id, smsFailed7j: false
      });
    }
    else if (type === "renouvellement") {
      const snap = await db.collection("annonces").doc(id).get();
      const ancExp = snap.data()?.dateExpiration?.toDate() || new Date();
      const nouv = new Date(ancExp); nouv.setDate(nouv.getDate() + 30);
      await db.collection("annonces").doc(id).update({
        statut: "actif", dateExpiration: TS.fromDate(nouv),
        dateProlongation: now, smsFailed7j: false
      });
    }
    else if (type === "reservation") {
      await db.collection("annonces").doc(id).update({
        statut: "loue", dateRetrait: now, paiementId: cpm_trans_id
      });
    }

    // ── HÔTELS — abonnement mensuel ──────────────────────
    else if (type === "hotel_abonnement") {
      await db.collection("hotels").doc(id).update({
        statut: "actif", dateExpiration: dans30j,
        dernierPaiement: now, smsFailed7j: false
      });
    }
    // HÔTELS — réservation chambre (commission 9.99%)
    else if (type === "hotel_reservation") {
      const { chambreId, annonceId } = meta;
      const montantTotal = parseInt(cpm_amount);
      const commission   = Math.round(montantTotal * 0.0999);
      const netHotel     = montantTotal - commission;
      await db.collection("hotels").doc(id)
        .collection("reservations").add({
          chambreId, montantTotal, commission, netHotel,
          statut: "confirmee", dateReservation: now, paiementId: cpm_trans_id
        });
      // Marquer la chambre indisponible
      await db.collection("hotels").doc(id)
        .collection("chambres").doc(chambreId).update({ disponible: false, reserveeJusqu: meta.dateFin || null });
    }

    // ── RESTAURANTS — abonnement ──────────────────────────
    else if (type === "restaurant_abonnement") {
      await db.collection("restaurants").doc(id).update({
        statut: "actif", dateExpiration: dans30j,
        dernierPaiement: now, smsFailed7j: false
      });
    }

    // Enregistrer le paiement dans tous les cas
    await db.collection("paiements").add({
      transactionId: cpm_trans_id, refId: id, type, montant: parseInt(cpm_amount),
      statut: "success", pays: pays || "", dateConfirmation: now
    });

    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(500).json({ message: "erreur serveur" });
  }
}
