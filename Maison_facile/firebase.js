// =============================================
// FIREBASE.JS — v2.0
// Firestore : annonces, paiements, logeurs
// Projet : maisonfacile-8366e
// =============================================

import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDoc, getDocs,
  doc, updateDoc, query, where, orderBy,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ↓↓ Remplacer avec vos vraies valeurs du projet maisonfacile-8366e ↓↓
const FIREBASE_CONFIG = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "maisonfacile-8366e.firebaseapp.com",
  projectId:         "maisonfacile-8366e",
  storageBucket:     "maisonfacile-8366e.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};

const app     = initializeApp(FIREBASE_CONFIG);
const db      = getFirestore(app);
const storage = getStorage(app);

// ─── LIRE LES ANNONCES ACTIVES ────────────────
export async function lireAnnoncesActives(filtres = {}) {
  try {
    const cond = [where("statut", "==", "actif")];
    if (filtres.pays) cond.push(where("pays", "==", filtres.pays));
    if (filtres.type) cond.push(where("type", "==", filtres.type));
    const q = query(collection(db, "annonces"), ...cond, orderBy("datePublication", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id, ...d.data(),
      datePublication: d.data().datePublication?.toDate().toISOString().split('T')[0] || '',
      dateExpiration:  d.data().dateExpiration?.toDate().toISOString().split('T')[0] || ''
    }));
  } catch (e) { console.error("lireAnnoncesActives:", e); return []; }
}

// ─── PUBLIER UNE ANNONCE (statut en_attente) ──
export async function publierAnnonce(donnees) {
  const exp = new Date(); exp.setDate(exp.getDate() + 30);
  const annonce = {
    ...donnees,
    statut:          "en_attente",
    datePublication: serverTimestamp(),
    dateExpiration:  Timestamp.fromDate(exp),
    imageUrls:       []
  };
  const ref = await addDoc(collection(db, "annonces"), annonce);
  return ref.id;
}

// ─── ACTIVER UNE ANNONCE (après paiement OK) ──
export async function activerAnnonce(annonceId) {
  await updateDoc(doc(db, "annonces", annonceId), {
    statut:         "actif",
    dateActivation: serverTimestamp()
  });
}

// ─── PROLONGER UNE ANNONCE (+30 jours) ────────
export async function prolongerAnnonce(annonceId) {
  const snap = await getDoc(doc(db, "annonces", annonceId));
  if (!snap.exists()) throw new Error("Annonce introuvable");
  const ancienneExp = snap.data().dateExpiration?.toDate() || new Date();
  const nouvelleExp = new Date(ancienneExp);
  nouvelleExp.setDate(nouvelleExp.getDate() + 30);
  await updateDoc(doc(db, "annonces", annonceId), {
    statut:         "actif",
    dateExpiration: Timestamp.fromDate(nouvelleExp),
    dateProlongation: serverTimestamp()
  });
  return nouvelleExp.toISOString().split('T')[0];
}

// ─── RETIRER UNE ANNONCE ──────────────────────
export async function retirerAnnonceFirebase(annonceId, raison = "loue") {
  await updateDoc(doc(db, "annonces", annonceId), {
    statut:      raison,  // "loue" | "expire"
    dateRetrait: serverTimestamp()
  });
}

// ─── EXPIRER LES ANNONCES PÉRIMÉES ────────────
// Appelé par le cron Vercel (voir api/cron-expiration.js)
export async function expirerAnnoncesPerimees() {
  const maintenant = Timestamp.now();
  const q = query(
    collection(db, "annonces"),
    where("statut", "==", "actif"),
    where("dateExpiration", "<=", maintenant)
  );
  const snap = await getDocs(q);
  const batch = [];
  snap.docs.forEach(d => {
    batch.push(updateDoc(doc(db, "annonces", d.id), {
      statut:          "expire",
      dateRetrait:     serverTimestamp()
    }));
  });
  await Promise.all(batch);
  return snap.docs.length;
}

// ─── ANNONCES À ALERTER (expiration dans 7j) ──
// Utilisé par le cron pour envoyer les SMS
export async function annoncesBientotExpirees() {
  const dans7j = new Date(); dans7j.setDate(dans7j.getDate() + 7);
  const dans8j = new Date(); dans8j.setDate(dans8j.getDate() + 8);
  const q = query(
    collection(db, "annonces"),
    where("statut",         "==", "actif"),
    where("dateExpiration", ">=", Timestamp.fromDate(dans7j)),
    where("dateExpiration", "<=", Timestamp.fromDate(dans8j)),
    where("smsFailed7j",    "==", false)  // ne pas renvoyer deux fois
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── ENREGISTRER UN PAIEMENT ──────────────────
export async function enregistrerPaiement(donnees) {
  const ref = await addDoc(collection(db, "paiements"), {
    ...donnees, statut: "pending", dateCreation: serverTimestamp()
  });
  return ref.id;
}

// ─── UPLOADER UNE PHOTO ───────────────────────
export async function uploaderPhoto(fichier, annonceId) {
  const nom = `annonces/${annonceId}/${Date.now()}_${fichier.name}`;
  const storageRef = ref(storage, nom);
  const snap = await uploadBytes(storageRef, fichier);
  return getDownloadURL(snap.ref);
}

export { db, storage };

// =============================================
// RÈGLES FIRESTORE — À coller dans la console
// =============================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /annonces/{id} {
      allow read: if true;
      allow create: if request.resource.data.statut == "en_attente"
                    && request.resource.data.telephone != null;
      allow update: if resource.data.statut in ["actif","en_attente"];
      allow delete: if false;
    }
    match /paiements/{id} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
*/
