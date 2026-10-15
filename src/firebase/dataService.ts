import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { Book, EquipmentUser, Loan, DynamicDatabase } from '../types';
import {
  INITIAL_BOOKS,
  INITIAL_EQUIPMENT,
  INITIAL_LOANS,
  GUNDAM_EQUIPMENT_NAMES,
} from './seedData';

const LOCAL_STORAGE_BOOKS = 'lighthouse_books_store_v1';
const LOCAL_STORAGE_USERS = 'lighthouse_users_store_v1';
const LOCAL_STORAGE_LOANS = 'lighthouse_loans_store_v1';

// In-memory / LocalStorage cache fallback
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(val) as T;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// ----------------------------------------------------
// BOOKS REPOSITORY
// ----------------------------------------------------

export async function fetchBooks(): Promise<Book[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'books'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Book));
      }
    } catch (e) {
      console.warn('Firestore fetchBooks failed, using local storage:', e);
    }
  }
  return getLocalItem<Book[]>(LOCAL_STORAGE_BOOKS, INITIAL_BOOKS);
}

export async function saveBook(book: Book): Promise<Book> {
  const books = getLocalItem<Book[]>(LOCAL_STORAGE_BOOKS, INITIAL_BOOKS);
  const existingIdx = books.findIndex(b => b.id === book.id);
  if (existingIdx >= 0) {
    books[existingIdx] = book;
  } else {
    books.unshift(book);
  }
  setLocalItem(LOCAL_STORAGE_BOOKS, books);

  if (db) {
    try {
      await setDoc(doc(db, 'books', book.id), book);
    } catch (e) {
      console.warn('Firestore saveBook failed, saved locally:', e);
    }
  }

  return book;
}

export async function saveBooksBatch(newBooks: Book[]): Promise<Book[]> {
  const current = getLocalItem<Book[]>(LOCAL_STORAGE_BOOKS, INITIAL_BOOKS);
  const updated = [...newBooks, ...current];
  setLocalItem(LOCAL_STORAGE_BOOKS, updated);

  if (db) {
    try {
      for (const b of newBooks) {
        await setDoc(doc(db, 'books', b.id), b);
      }
    } catch (e) {
      console.warn('Firestore saveBooksBatch partial error:', e);
    }
  }

  return updated;
}

export async function removeBook(bookId: string): Promise<void> {
  const books = getLocalItem<Book[]>(LOCAL_STORAGE_BOOKS, INITIAL_BOOKS).filter(
    b => b.id !== bookId
  );
  setLocalItem(LOCAL_STORAGE_BOOKS, books);

  if (db) {
    try {
      await deleteDoc(doc(db, 'books', bookId));
    } catch (e) {
      console.warn('Firestore removeBook failed:', e);
    }
  }
}

// ----------------------------------------------------
// EQUIPMENT (USERS) REPOSITORY
// ----------------------------------------------------

export async function fetchEquipment(): Promise<EquipmentUser[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as EquipmentUser));
      }
    } catch (e) {
      console.warn('Firestore fetchEquipment failed, using local fallback:', e);
    }
  }
  return getLocalItem<EquipmentUser[]>(LOCAL_STORAGE_USERS, INITIAL_EQUIPMENT);
}

export async function saveEquipment(user: EquipmentUser): Promise<EquipmentUser> {
  const list = getLocalItem<EquipmentUser[]>(LOCAL_STORAGE_USERS, INITIAL_EQUIPMENT);
  const idx = list.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    list[idx] = user;
  } else {
    list.push(user);
  }
  setLocalItem(LOCAL_STORAGE_USERS, list);

  if (db) {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (e) {
      console.warn('Firestore saveEquipment error:', e);
    }
  }

  return user;
}

export async function seedGundamAccounts(): Promise<EquipmentUser[]> {
  const current = getLocalItem<EquipmentUser[]>(LOCAL_STORAGE_USERS, []);
  const existingNames = new Set(current.map(u => u.name.toLowerCase()));

  const toAdd: EquipmentUser[] = [];
  for (const name of GUNDAM_EQUIPMENT_NAMES) {
    if (!existingNames.has(name.toLowerCase())) {
      toAdd.push({
        id: `eq-${name.toLowerCase()}`,
        name,
        email: `${name.toLowerCase()}@lighthouse-hashi.internal`,
        role: name === 'GundamFreedom' ? 'admin' : 'user',
        joinedAt: new Date().toISOString(),
        borrowedCount: 0,
        notes: `Mobile Worker Terminal: ${name}`,
      });
    }
  }

  const merged = [...current, ...toAdd];
  setLocalItem(LOCAL_STORAGE_USERS, merged);

  if (db) {
    try {
      for (const eq of toAdd) {
        await setDoc(doc(db, 'users', eq.id), eq);
      }
    } catch (e) {
      console.warn('Firestore seed error:', e);
    }
  }

  return merged;
}

// ----------------------------------------------------
// LOANS REPOSITORY & LENDING WORKFLOW
// ----------------------------------------------------

export async function fetchLoans(): Promise<Loan[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'loans'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan));
      }
    } catch (e) {
      console.warn('Firestore fetchLoans failed, using local storage:', e);
    }
  }
  return getLocalItem<Loan[]>(LOCAL_STORAGE_LOANS, INITIAL_LOANS);
}

// "Prestar" (Lend): select a book + select an equipment -> creates a loan record with due date
export async function lendBook(
  bookId: string,
  userId: string,
  days = 14,
  notes?: string
): Promise<{ loan: Loan; book: Book }> {
  const books = await fetchBooks();
  const equipmentList = await fetchEquipment();
  const loans = await fetchLoans();

  const book = books.find(b => b.id === bookId);
  if (!book) throw new Error('Book not found');

  const equipment = equipmentList.find(u => u.id === userId);
  if (!equipment) throw new Error('Equipment not found');

  const now = new Date();
  const due = new Date();
  due.setDate(now.getDate() + days);

  const newLoan: Loan = {
    id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    bookId,
    bookTitle: book.title,
    userId: equipment.id,
    userName: equipment.name,
    borrowedAt: now.toISOString(),
    dueDate: due.toISOString(),
    status: 'active',
    renewalCount: 0,
    notes: notes || '',
  };

  // Update book status
  const updatedBook: Book = {
    ...book,
    status: 'borrowed',
    borrowedBy: equipment.id,
    borrowedByName: equipment.name,
    dueDate: due.toISOString(),
    loanCount: (book.loanCount || 0) + 1,
  };

  // Update equipment borrowedCount
  const updatedEquipment: EquipmentUser = {
    ...equipment,
    borrowedCount: (equipment.borrowedCount || 0) + 1,
  };

  // Save to local storage
  setLocalItem(LOCAL_STORAGE_LOANS, [newLoan, ...loans]);
  await saveBook(updatedBook);
  await saveEquipment(updatedEquipment);

  if (db) {
    try {
      await setDoc(doc(db, 'loans', newLoan.id), newLoan);
      await updateDoc(doc(db, 'books', bookId), {
        status: 'borrowed',
        borrowedBy: equipment.id,
        borrowedByName: equipment.name,
        dueDate: due.toISOString(),
        loanCount: updatedBook.loanCount,
      });
      await updateDoc(doc(db, 'users', equipment.id), {
        borrowedCount: updatedEquipment.borrowedCount,
      });
    } catch (e) {
      console.warn('Firestore lendBook sync warning:', e);
    }
  }

  return { loan: newLoan, book: updatedBook };
}

// "Entregar" / "Devolver" (Return): mark loan as returned, book goes back to "available"
export async function returnBook(loanId: string): Promise<{ loan: Loan; book: Book }> {
  const loans = await fetchLoans();
  const books = await fetchBooks();

  const loanIdx = loans.findIndex(l => l.id === loanId);
  if (loanIdx < 0) throw new Error('Loan record not found');

  const currentLoan = loans[loanIdx];
  const now = new Date().toISOString();

  const updatedLoan: Loan = {
    ...currentLoan,
    status: 'returned',
    returnedAt: now,
  };
  loans[loanIdx] = updatedLoan;
  setLocalItem(LOCAL_STORAGE_LOANS, loans);

  // Update associated book
  const book = books.find(b => b.id === currentLoan.bookId);
  let updatedBook: Book;
  if (book) {
    updatedBook = {
      ...book,
      status: 'available',
      borrowedBy: undefined,
      borrowedByName: undefined,
      dueDate: undefined,
    };
    await saveBook(updatedBook);
  } else {
    updatedBook = {
      id: currentLoan.bookId,
      title: currentLoan.bookTitle,
      author: 'Unknown',
      topic: 'Other',
      subTags: [],
      status: 'available',
      uploadedAt: now,
    };
  }

  if (db) {
    try {
      await updateDoc(doc(db, 'loans', loanId), {
        status: 'returned',
        returnedAt: now,
      });
      if (book) {
        await updateDoc(doc(db, 'books', book.id), {
          status: 'available',
          borrowedBy: null,
          borrowedByName: null,
          dueDate: null,
        });
      }
    } catch (e) {
      console.warn('Firestore returnBook sync warning:', e);
    }
  }

  return { loan: updatedLoan, book: updatedBook };
}

// Renew loan: extend due date by extra days (e.g. 14 days)
export async function renewLoan(loanId: string, extraDays = 14): Promise<Loan> {
  const loans = await fetchLoans();
  const books = await fetchBooks();

  const loanIdx = loans.findIndex(l => l.id === loanId);
  if (loanIdx < 0) throw new Error('Loan record not found');

  const currentLoan = loans[loanIdx];
  const currentDue = new Date(currentLoan.dueDate);
  const baseDate = currentDue > new Date() ? currentDue : new Date();
  baseDate.setDate(baseDate.getDate() + extraDays);
  const newDueDate = baseDate.toISOString();

  const updatedLoan: Loan = {
    ...currentLoan,
    dueDate: newDueDate,
    status: 'active',
    renewalCount: (currentLoan.renewalCount || 0) + 1,
  };
  loans[loanIdx] = updatedLoan;
  setLocalItem(LOCAL_STORAGE_LOANS, loans);

  // Update book's due date
  const book = books.find(b => b.id === currentLoan.bookId);
  if (book) {
    book.dueDate = newDueDate;
    await saveBook(book);
  }

  if (db) {
    try {
      await updateDoc(doc(db, 'loans', loanId), {
        dueDate: newDueDate,
        status: 'active',
        renewalCount: updatedLoan.renewalCount,
      });
      if (book) {
        await updateDoc(doc(db, 'books', book.id), {
          dueDate: newDueDate,
        });
      }
    } catch (e) {
      console.warn('Firestore renewLoan sync warning:', e);
    }
  }

  return updatedLoan;
}

// Upload PDF file to Firebase Storage if available, else store as data URL / blob object
export async function uploadBookPdf(file: File, bookId: string): Promise<string> {
  if (storage) {
    try {
      const storageRef = ref(storage, `books/${bookId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (e) {
      console.warn('Firebase Storage upload failed, creating object URL:', e);
    }
  }
  // Local fallback: create object URL or base64 representation
  return URL.createObjectURL(file);
}

// Reset all demo data
export function resetDemoState() {
  localStorage.setItem(LOCAL_STORAGE_BOOKS, JSON.stringify(INITIAL_BOOKS));
  localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(INITIAL_EQUIPMENT));
  localStorage.setItem(LOCAL_STORAGE_LOANS, JSON.stringify(INITIAL_LOANS));
}

// Export library dataset as JSON
export function exportLibraryJson() {
  const books = getLocalItem<Book[]>(LOCAL_STORAGE_BOOKS, INITIAL_BOOKS);
  const users = getLocalItem<EquipmentUser[]>(LOCAL_STORAGE_USERS, INITIAL_EQUIPMENT);
  const loans = getLocalItem<Loan[]>(LOCAL_STORAGE_LOANS, INITIAL_LOANS);

  return JSON.stringify({
    appName: '燈台文庫 - Lighthouse Hashi Library',
    exportedAt: new Date().toISOString(),
    books,
    users,
    loans,
  }, null, 2);
}

// Import JSON
export function importLibraryJson(jsonString: string) {
  const parsed = JSON.parse(jsonString);
  if (Array.isArray(parsed.books)) {
    setLocalItem(LOCAL_STORAGE_BOOKS, parsed.books);
  }
  if (Array.isArray(parsed.users)) {
    setLocalItem(LOCAL_STORAGE_USERS, parsed.users);
  }
  if (Array.isArray(parsed.loans)) {
    setLocalItem(LOCAL_STORAGE_LOANS, parsed.loans);
  }
  return true;
}

// ----------------------------------------------------
// DYNAMIC DATABASES & TODOLIST MATRICES
// ----------------------------------------------------

const LOCAL_STORAGE_DATABASES = 'lighthouse_todolists_matrices_v1';

export const INITIAL_DATABASES: DynamicDatabase[] = [
  {
    id: 'db-employers-colombia',
    name: 'Employers_Colombia',
    author: 'Carolina Herrera (HR Lead)',
    authorEmail: 'andreramiers@gmail.com',
    authorPhone: '+57 310 456 7890',
    deadline: '2026-10-30T17:00',
    description: 'Directorio tabular de personal y sucursales en Colombia con compensación salarial',
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-14T11:00:00.000Z',
    isSavedInFirebase: true,
    columns: [
      { id: 'col_1', name: 'Employee Name / Nombre', type: 'text', width: 220 },
      { id: 'col_2', name: 'Department & City / Ciudad', type: 'text', width: 200 },
      { id: 'col_3', name: 'Monthly Salary (COP)', type: 'number', width: 180 },
    ],
    rows: [
      { id: 'row_1', cells: { col_1: 'Mateo Gómez Arango', col_2: 'Ingeniería Cloud • Medellín', col_3: '8,500,000' } },
      { id: 'row_2', cells: { col_1: 'Valentina Morales Cruz', col_2: 'Ciberseguridad • Bogotá D.C.', col_3: '9,200,000' } },
      { id: 'row_3', cells: { col_1: 'Santiago Rodríguez Peña', col_2: 'DevOps & CI/CD • Bogotá D.C.', col_3: '7,800,000' } },
      { id: 'row_4', cells: { col_1: 'Mariana Restrepo López', col_2: 'Inteligencia Artificial • Medellín', col_3: '10,500,000' } },
      { id: 'row_5', cells: { col_1: 'Juan Camilo Ospina', col_2: 'Infraestructura Redes • Cali', col_3: '6,400,000' } },
      { id: 'row_6', cells: { col_1: 'Camila Andrea Torres', col_2: 'Arquitectura Software • Barranquilla', col_3: '8,900,000' } },
      { id: 'row_7', cells: { col_1: 'Felipe Santamaría', col_2: 'Auditoría IT • Bucaramanga', col_3: '6,200,000' } },
      { id: 'row_8', cells: { col_1: 'Daniela Cardona Gil', col_2: 'Diseño UX/UI • Manizales', col_3: '5,800,000' } },
      { id: 'row_9', cells: { col_1: 'Andrés Felipe Rueda', col_2: 'Soporte Nivel 3 • Cartagena', col_3: '5,500,000' } },
      { id: 'row_10', cells: { col_1: 'Laura Vanessa Castro', col_2: 'Base de Datos Cloud • Bogotá D.C.', col_3: '8,200,000' } },
      { id: 'row_11', cells: { col_1: 'Nicolás Pardo Méndez', col_2: 'QA Automation • Medellín', col_3: '6,700,000' } },
      { id: 'row_12', cells: { col_1: 'Gabriela Silva Rios', col_2: 'Product Owner • Bogotá D.C.', col_3: '9,000,000' } },
      { id: 'row_13', cells: { col_1: 'Julián David Beltrán', col_2: 'Redes Cisco • Pereira', col_3: '5,900,000' } },
      { id: 'row_14', cells: { col_1: 'Manuela Echeverri', col_2: 'Machine Learning • Envigado', col_3: '9,800,000' } },
      { id: 'row_15', cells: { col_1: 'Carlos Eduardo Meza', col_2: 'Fullstack Dev • Santa Marta', col_3: '6,600,000' } },
      { id: 'row_16', cells: { col_1: 'Sofía Castaño Duque', col_2: 'Gestión Documental • Armenia', col_3: '4,800,000' } },
      { id: 'row_17', cells: { col_1: 'Esteban Cuartas', col_2: 'Sistemas Linux • Ibagué', col_3: '5,400,000' } },
      { id: 'row_18', cells: { col_1: 'Tatiana Benítez Ruiz', col_2: 'Compliance TI • Pasto', col_3: '5,200,000' } },
      { id: 'row_19', cells: { col_1: 'Alejandro Giraldo', col_2: 'Seguridad Perimetral • Cúcuta', col_3: '6,100,000' } },
      { id: 'row_20', cells: { col_1: 'Paula Andrea Villegas', col_2: 'Recursos Humanos • Bogotá D.C.', col_3: '7,000,000' } },
    ],
  },
  {
    id: 'db-games-production',
    name: 'Game_Production_Engines',
    author: 'Lead Producer (Studio Hashi)',
    authorEmail: 'andreramiers@gmail.com',
    authorPhone: '+57 310 456 7890',
    deadline: '2026-11-20T18:00',
    description: 'Game engines matrix with official hyperlinked documentation URLs (Roblox, Unity, Unreal, Phaser, WebGL)',
    createdAt: '2026-10-12T10:00:00.000Z',
    updatedAt: '2026-10-15T07:00:00.000Z',
    isSavedInFirebase: true,
    columns: [
      { id: 'col_1', name: 'Game Engine / Platform', type: 'text', width: 200 },
      { id: 'col_2', name: 'Documentation URL (Hyperlink)', type: 'url', width: 280 },
      { id: 'col_3', name: 'Target Graphics API', type: 'text', width: 180 },
      { id: 'col_4', name: 'Community Portal URL', type: 'url', width: 260 },
    ],
    rows: [
      {
        id: 'row_1',
        cells: {
          col_1: 'Roblox Studio (Luau Engine)',
          col_2: 'https://create.roblox.com/docs',
          col_3: 'Vulkan / Metal / DirectX',
          col_4: 'https://devforum.roblox.com',
        },
      },
      {
        id: 'row_2',
        cells: {
          col_1: 'Unity 6 Engine',
          col_2: 'https://docs.unity.com',
          col_3: 'DirectX 12 / Vulkan / Metal',
          col_4: 'https://discussions.unity.com',
        },
      },
      {
        id: 'row_3',
        cells: {
          col_1: 'Unreal Engine 5.5',
          col_2: 'https://dev.epicgames.com/documentation',
          col_3: 'Nanite / Lumen DirectX 12',
          col_4: 'https://forums.unrealengine.com',
        },
      },
      {
        id: 'row_4',
        cells: {
          col_1: 'Phaser 3 HTML5 Game Engine',
          col_2: 'https://phaser.io/examples',
          col_3: 'WebGL 2.0 / Canvas 2D',
          col_4: 'https://phaser.discourse.group',
        },
      },
      {
        id: 'row_5',
        cells: {
          col_1: 'Three.js & WebGL 3D Pipeline',
          col_2: 'https://threejs.org/docs',
          col_3: 'WebGL / WebGPU',
          col_4: 'https://threejs.org/examples',
        },
      },
    ],
  },
];

export async function fetchDynamicDatabases(): Promise<DynamicDatabase[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'todolists'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id, isSavedInFirebase: true } as DynamicDatabase));
      }
    } catch (e) {
      console.warn('Firestore fetchDynamicDatabases error, using local fallback:', e);
    }
  }
  return getLocalItem<DynamicDatabase[]>(LOCAL_STORAGE_DATABASES, INITIAL_DATABASES);
}

export async function saveDynamicDatabase(
  item: DynamicDatabase,
  saveToFirestore = true
): Promise<DynamicDatabase> {
  const current = getLocalItem<DynamicDatabase[]>(LOCAL_STORAGE_DATABASES, INITIAL_DATABASES);
  const now = new Date().toISOString();
  const updatedItem: DynamicDatabase = {
    ...item,
    updatedAt: now,
    isSavedInFirebase: saveToFirestore,
  };

  const idx = current.findIndex(d => d.id === updatedItem.id);
  if (idx >= 0) {
    current[idx] = updatedItem;
  } else {
    current.unshift(updatedItem);
  }
  setLocalItem(LOCAL_STORAGE_DATABASES, current);

  if (saveToFirestore && db) {
    try {
      await setDoc(doc(db, 'todolists', updatedItem.id), {
        ...updatedItem,
        isSavedInFirebase: true,
      });
    } catch (e) {
      console.warn('Firestore saveDynamicDatabase warning:', e);
    }
  }

  return updatedItem;
}

export async function deleteDynamicDatabase(id: string): Promise<void> {
  const current = getLocalItem<DynamicDatabase[]>(LOCAL_STORAGE_DATABASES, INITIAL_DATABASES);
  const filtered = current.filter(d => d.id !== id);
  setLocalItem(LOCAL_STORAGE_DATABASES, filtered);

  if (db) {
    try {
      await deleteDoc(doc(db, 'todolists', id));
    } catch (e) {
      console.warn('Firestore deleteDynamicDatabase warning:', e);
    }
  }
}

export const saveDatabase = saveDynamicDatabase;


