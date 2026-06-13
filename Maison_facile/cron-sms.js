// api/cron-sms.js — Cron Vercel (tourne chaque jour à 8h)
// Envoie SMS d'alerte 7j avant expiration : maisons, hôtels, restaurants
// Expire les annonces périmées et suspend les prestataires mal notés
// Configurer dans vercel.json : { "crons": [{ "path": "/api/cron-sms", "schedule": "0 8 * * *" }] }

const admin = require("firebase-admin");
const https = require("https");

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

// Envoyer un SMS via Africa's Talking
async function envoyerSMS(telephone, message) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME || "sandbox",
      to:       telephone,
      message:  message,
      from:     process.env.SMS_SENDER_ID || "MaisonFacile"
    }).toString();
    const options = {
      hostname: "api.africastalking.com",
      path:     "/version1/messaging",
      method:   "POST",
      headers: {
        "apiKey":       process.env.SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  // Sécuriser le cron (Vercel envoie un header CRON_SECRET)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "non autorisé" });
  }

  const db  = initFirebase();
  const FV  = admin.firestore.FieldValue;
  const TS  = admin.firestore.Timestamp;
  const now = new Date();
  const dans7j  = new Date(now); dans7j.setDate(dans7j.getDate() + 7);
  const dans8j  = new Date(now); dans8j.setDate(dans8j.getDate() + 8);

  let smsSent = 0, expired = 0, suspended = 0;

  // ── 1. ALERTES SMS 7 JOURS AVANT EXPIRATION ──────────
  const collections = [
    { col: "annonces",    typeLabel: "annonce de location",     montantLabel: "2 500 ou 5 000 F CFA" },
    { col: "hotels",      typeLabel: "abonnement hôtel",        montantLabel: "10 000 F CFA" },
    { col: "restaurants", typeLabel: "abonnement restaurant",   montantLabel: "votre abonnement mensuel" }
  ];

  for (const { col, typeLabel, montantLabel } of collections) {
    const q = db.collection(col)
      .where("statut", "==", "actif")
      .where("dateExpiration", ">=", TS.fromDate(dans7j))
      .where("dateExpiration", "<=", TS.fromDate(dans8j))
      .where("smsFailed7j",    "==", false);
    const snap = await q.get();
    for (const d of snap.docs) {
      const data = d.data();
      const tel  = data.telephone || data.contact;
      if (!tel) continue;
      const msg = `MaisonFacile: Votre ${typeLabel} expire dans 7 jours. Renouvelez maintenant (${montantLabel}) pour rester visible. Connectez-vous sur maisonfacile.vercel.app`;
      try {
        await envoyerSMS(tel, msg);
        await d.ref.update({ smsFailed7j: true });
        smsSent++;
      } catch (e) {
        console.error("SMS error:", tel, e.message);
      }
    }
  }

  // ── 2. EXPIRER LES ANNONCES PÉRIMÉES ─────────────────
  for (const { col } of collections) {
    const q = db.collection(col)
      .where("statut", "==", "actif")
      .where("dateExpiration", "<=", TS.fromDate(now));
    const snap = await q.get();
    const batch = db.batch();
    snap.docs.forEach(d => {
      batch.update(d.ref, { statut: "expire", dateRetrait: FV.serverTimestamp() });
      expired++;
    });
    if (snap.docs.length) await batch.commit();
  }

  // ── 3. SUSPENDRE LES TAXIS MAL NOTÉS ─────────────────
  const taxisQ = db.collection("taxis")
    .where("statut", "==", "actif")
    .where("nbAvisNegatifsConsecutifs", ">=", 20);
  const taxisSnap = await taxisQ.get();
  for (const d of taxisSnap.docs) {
    await d.ref.update({ statut: "suspendu", dateSuspension: FV.serverTimestamp() });
    const tel = d.data().telephone;
    if (tel) {
      await envoyerSMS(tel, "MaisonFacile: Votre compte chauffeur a été suspendu suite à 20 avis négatifs consécutifs. Contactez-nous sur maisonfacile.vercel.app pour régulariser votre situation.");
    }
    suspended++;
  }

  // ── 4. SUSPENDRE LES PRESTATAIRES ROUGE (score < 2.5) ─
  for (const col of ["restaurants", "hotels"]) {
    const q = db.collection(col)
      .where("statut", "==", "actif")
      .where("scoreMoyen", "<", 2.5)
      .where("nbAvis",     ">=", 10); // min 10 avis avant suspension
    const snap = await q.get();
    for (const d of snap.docs) {
      await d.ref.update({ statut: "suspendu", dateSuspension: FV.serverTimestamp() });
      suspended++;
    }
  }

  console.log(`Cron terminé: ${smsSent} SMS, ${expired} expirés, ${suspended} suspendus`);
  return res.status(200).json({ smsSent, expired, suspended });
}
