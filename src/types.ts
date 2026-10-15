export type Language = 'en' | 'ja' | 'es';

export type UserRole = 'admin' | 'user';

export type BookStatus = 'available' | 'borrowed';

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface Book {
  id: string;
  title: string;
  author: string;
  topic: string;
  subTags: string[];
  coverUrl?: string;
  pdfUrl?: string;
  uploadedAt: string;
  status: BookStatus;
  borrowedBy?: string; // Equipment ID
  borrowedByName?: string; // Equipment Name
  dueDate?: string; // ISO date string
  pageCount?: number;
  summary?: string;
  fileSize?: number; // in bytes
  fileName?: string;
  folderPath?: string; // e.g. "DevOps/Kubernetes/DeepDive"
  fileType?: 'pdf' | 'docx' | 'doc' | 'other';
  needsReview?: boolean;
  confidence?: number;
  isbn?: string;
  loanCount?: number;
}

export interface EquipmentUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  borrowedCount: number;
  notes?: string;
}

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string; // Equipment ID
  userName: string; // Equipment Name
  borrowedAt: string;
  returnedAt?: string;
  dueDate: string;
  status: LoanStatus;
  renewalCount: number;
  notes?: string;
}

export interface UploadBatchItem {
  id: string;
  file: File;
  relativePath?: string; // Preserved folder hierarchy path e.g. "Engineering/Cloud/GCP.pdf"
  fileType: 'pdf' | 'docx' | 'doc' | 'other';
  progress: number;
  status: 'pending' | 'extracting' | 'classifying' | 'ready' | 'error';
  extractedText?: string;
  pageCount?: number;
  coverDataUrl?: string;
  classifiedData?: {
    title: string;
    author: string;
    topic: string;
    subTags: string[];
    confidence: number;
    needsReview: boolean;
    summary: string;
    suggestedFolder?: string;
  };
  errorMessage?: string;
}

export interface FirebaseConfigState {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  isConfigured: boolean;
  useLocalStorageFallback: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  groundingSources?: Array<{ title: string; url: string }>;
  modelUsed?: string;
}

export interface TodoListColumn {
  id: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'status' | 'email' | 'url';
  width?: number;
}

export interface TodoListRow {
  id: string;
  cells: Record<string, string>;
}

export interface DynamicDatabase {
  id: string;
  name: string; // e.g., "Employers_Colombia"
  author: string; // Person who created the database
  authorEmail?: string;
  authorPhone?: string; // Cellphone for SMS / reminder alerts
  deadline?: string; // Deadline timestamp for alerts
  reminderEmailSent?: boolean;
  reminderSmsSent?: boolean;
  columns: TodoListColumn[];
  rows: TodoListRow[];
  createdAt: string;
  updatedAt: string;
  isSavedInFirebase?: boolean;
  description?: string;
}

export type VoiceTargetCategory = 'todolist' | 'library' | 'equipment';

export interface VoiceCommandDraft {
  id: string;
  transcript: string;
  targetCategory: VoiceTargetCategory;
  confidence: number;
  name: string;
  // TodoList specific
  columns?: string[];
  rowCount?: number;
  sampleRows?: Array<Record<string, string>>;
  author?: string;
  deadline?: string;
  // Library Shelves specific
  topic?: string;
  books?: Array<{
    title: string;
    author: string;
    topic: string;
    format: 'pdf' | 'docx' | 'epub';
  }>;
  // Equipment List specific
  members?: Array<{
    name: string;
    role?: 'user' | 'admin';
    email?: string;
    notes?: string;
  }>;
  status: 'draft' | 'needs_clarification' | 'ready';
  clarificationQuestion?: string;
}


