// ─── Bloques 1 + 3 + 6: Firebase Auth + Firestore + degradación ─────────────
//
// Reglas de seguridad sugeridas para Cloud Firestore (Firebase Console → Firestore → Rules):
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /perfiles/{docId} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null
//                     && request.resource.data.creadoPor == request.auth.token.email;
//       allow delete: if request.auth != null
//                     && resource.data.creadoPor == request.auth.token.email;
//       allow update: if false;
//     }
//   }
// }

import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged,
  browserLocalPersistence, setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, collection, query, orderBy, limit,
  getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export let auth = null;
export let db   = null;

if (Object.values(cfg).every(Boolean)) {
  try {
    const app = initializeApp(cfg);
    auth = getAuth(app);
    // ignoreUndefinedProperties: campos e/img son mutuamente excluyentes en los pictogramas
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    // setPersistence va aquí, NO en el manejador del clic — cualquier await previo
    // al popup rompe el "user gesture" en navegadores móviles modernos.
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } catch(e) {
    console.warn('[Firebase] Error al inicializar:', e.message);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export { onAuthStateChanged };

// IMPORTANTE: esta función NO es async y NO tiene awaits.
// Debe llamarse de forma síncrona desde el manejador del clic del usuario.
// Cualquier await previo destruye el user gesture y los navegadores móviles
// bloquean el popup. signInWithRedirect tampoco funciona en GitHub Pages
// porque depende de almacenamiento de terceros que Chrome/Safari bloquean.
export function iniciarSesion() {
  if (!auth) throw new Error('Firebase no disponible');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'molokai.cl', prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function cerrarSesion() {
  if (!auth) return;
  await signOut(auth);
}

// ─── Sanitizador — elimina claves undefined recursivamente ───────────────────
function sanitize(val) {
  if (Array.isArray(val)) return val.map(sanitize);
  if (val !== null && typeof val === 'object' && !(val?.constructor?.name === 'Timestamp')) {
    return Object.fromEntries(
      Object.entries(val)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return val;
}

// ─── Firestore CRUD — Bloque 3 ───────────────────────────────────────────────
export async function listarPerfiles() {
  if (!db) throw new Error('Sin conexión a la biblioteca');
  const q = query(
    collection(db, 'perfiles'),
    orderBy('actualizadoEn', 'desc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function publicarPerfil(user, { nombre, descripcion = '', tipo, datos }) {
  if (!db) throw new Error('Sin conexión a la biblioteca');
  if (!user?.email) throw new Error('Debes iniciar sesión primero');
  const now = serverTimestamp();
  return addDoc(collection(db, 'perfiles'), sanitize({
    nombre,
    descripcion,
    tipo,
    datos,
    creadoPor:     user.email,
    creadoEn:      now,
    actualizadoEn: now,
  }));
}

export async function eliminarPerfil(id) {
  if (!db) throw new Error('Sin conexión a la biblioteca');
  await deleteDoc(doc(db, 'perfiles', id));
}
