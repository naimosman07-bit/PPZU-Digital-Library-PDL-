import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDocs,
  writeBatch
} from "firebase/firestore";
import config from "../../firebase-applet-config.json";
import { Book, LoanRequest, StaffUser } from "../types";
import { PPZU_BOOKS } from "../data";

// Initialize Firebase App
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, config.firestoreDatabaseId || undefined);

// Helper to sync master books with Firestore (adding missing ones progressive)
export async function syncMasterBooksList() {
  const booksCol = collection(db, "books");
  const snapshot = await getDocs(booksCol);
  
  if (snapshot.empty) {
    console.log("Seeding books to Firestore...");
    const batch = writeBatch(db);
    PPZU_BOOKS.forEach((book) => {
      const docRef = doc(booksCol, book.id);
      batch.set(docRef, book);
    });
    await batch.commit();
    console.log("Seeding complete!");
  } else {
    // Check which ones are missing and add them
    const existingIds = new Set(snapshot.docs.map(doc => doc.id));
    const missingBooks = PPZU_BOOKS.filter(book => !existingIds.has(book.id));
    if (missingBooks.length > 0) {
      console.log(`Syncing ${missingBooks.length} missing master books to Firestore...`);
      const batch = writeBatch(db);
      missingBooks.forEach((book) => {
        const docRef = doc(booksCol, book.id);
        batch.set(docRef, book);
      });
      await batch.commit();
      console.log("Sync complete!");
    }
  }
}

// Helper to seed default staff if empty
export async function seedStaffIfEmpty(defaultStaffList: StaffUser[]) {
  const staffCol = collection(db, "staff");
  const snapshot = await getDocs(staffCol);
  if (snapshot.empty) {
    console.log("Seeding staff list to Firestore...");
    const batch = writeBatch(db);
    defaultStaffList.forEach((staff) => {
      const docRef = doc(staffCol, staff.id);
      batch.set(docRef, staff);
    });
    await batch.commit();
    console.log("Seeding staff complete!");
  }
}

// Helper to seed default loans if empty
export async function seedLoansIfEmpty(defaultLoans: LoanRequest[]) {
  const loansCol = collection(db, "loans");
  const snapshot = await getDocs(loansCol);
  if (snapshot.empty) {
    console.log("Seeding default loans to Firestore...");
    const batch = writeBatch(db);
    defaultLoans.forEach((loan) => {
      const docRef = doc(loansCol, loan.id);
      batch.set(docRef, loan);
    });
    await batch.commit();
    console.log("Seeding loans complete!");
  }
}
