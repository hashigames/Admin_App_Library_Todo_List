/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Book,
  EquipmentUser,
  Loan,
  Language,
  UserRole,
} from './types';
import { Header } from './components/Header';
import { NavigationTabs, TabKey } from './components/NavigationTabs';
import { LibraryView } from './components/LibraryView';
import { LoansDashboard } from './components/LoansDashboard';
import { BulkUploadView } from './components/BulkUploadView';
import { EquipmentView } from './components/EquipmentView';
import { TodoListView } from './components/TodoListView';
import { HamburgerDrawer } from './components/HamburgerDrawer';
import { ResumeExportModal } from './components/ResumeExportModal';
import { SettingsView } from './components/SettingsView';
import { LendModal } from './components/LendModal';
import { ReturnModal } from './components/ReturnModal';
import { BookDetailsModal } from './components/BookDetailsModal';
import { GeminiChatbotModal } from './components/GeminiChatbotModal';
import { MiyuVoiceChatbot } from './components/MiyuVoiceChatbot';
import { MiyuMouseToolkit } from './components/MiyuMouseToolkit';
import { Toast, ToastMessage } from './components/Toast';
import { DynamicDatabase } from './types';
import {
  fetchBooks,
  fetchEquipment,
  fetchLoans,
  fetchDynamicDatabases,
  saveBook,
  saveBooksBatch,
  removeBook,
  saveEquipment,
  seedGundamAccounts,
  lendBook,
  returnBook,
  renewLoan,
} from './firebase/dataService';
import {
  getStoredFirebaseConfig,
  auth as firebaseAuthInstance,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from './firebase/config';

const INITIAL_TOPICS = [
  'Machine Learning',
  'Computer Vision',
  'RAG',
  'CompTIA',
  'Cisco',
  'Active Directory',
  'Google Cloud',
  'Unity',
  'Unreal Engine',
  'Structural Design',
  'Python',
  'Generative AI',
  'Networking',
  'Cybersecurity',
  'DevOps',
  'Other',
];

export default function App() {
  // App state
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    return (localStorage.getItem('lighthouse_language') as Language) || 'en';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lighthouse_theme') === 'dark';
  });

  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<TabKey>('library');

  // Domain data
  const [books, setBooks] = useState<Book[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentUser[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [databases, setDatabases] = useState<DynamicDatabase[]>([]);
  const [topics, setTopics] = useState<string[]>(INITIAL_TOPICS);
  const [activeEquipmentId, setActiveEquipmentId] = useState<string>('eq-gundamfreedom');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Panel & Modals state
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeModalTarget, setResumeModalTarget] = useState<'todolist' | 'library' | 'equipment' | 'all'>('all');
  const [isGlobalPanelMaximized, setIsGlobalPanelMaximized] = useState(false);

  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [selectedBookForLend, setSelectedBookForLend] = useState<Book | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBookForReturn, setSelectedBookForReturn] = useState<Book | null>(null);
  const [activeLoanForReturn, setActiveLoanForReturn] = useState<Loan | undefined>(undefined);

  const [selectedBookDetails, setSelectedBookDetails] = useState<Book | null>(null);

  // Gemini Chatbot & Search Grounding modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatBookContext, setChatBookContext] = useState<string>('');
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');

  // MIYU Voice-Text Anime Chatbot & Mouse Toolkit state
  const [isMiyuChatOpen, setIsMiyuChatOpen] = useState(false);
  const [isMouseToolkitEnabled, setIsMouseToolkitEnabled] = useState(() => {
    try {
      return localStorage.getItem('lighthouse_miyu_guide') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleMouseToolkit = () => {
    setIsMouseToolkitEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('lighthouse_miyu_guide', String(next));
      } catch {}
      return next;
    });
  };

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    if (firebaseAuthInstance) {
      const unsubscribe = onAuthStateChanged(firebaseAuthInstance, user => {
        setFirebaseUser(user);
        if (user) {
          showToast(`Signed in as ${user.displayName || user.email || 'User'}`);
        }
      });
      return () => unsubscribe();
    }
  }, [showToast]);

  const handleGoogleSignIn = async () => {
    if (!firebaseAuthInstance) {
      showToast('Firebase Auth is initializing or credentials needed in Settings.', 'info');
      setActiveTab('settings');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(firebaseAuthInstance, provider);
      showToast(`Welcome, ${res.user.displayName || 'Engineer'}!`);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      showToast(err.message || 'Google sign-in error', 'error');
    }
  };

  const handleSignOut = async () => {
    if (firebaseAuthInstance) {
      try {
        await firebaseSignOut(firebaseAuthInstance);
        setFirebaseUser(null);
        showToast('Signed out successfully.');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  // Open Chatbot with context
  const handleOpenChatWithBook = (book: Book) => {
    setChatBookContext(`"${book.title}" by ${book.author} (Topic: ${book.topic})`);
    setChatSearchQuery(`What are the key technical concepts, prerequisites, and recent updates covered in "${book.title}"?`);
    setIsChatModalOpen(true);
  };

  const handleOpenSearchGroundingWithBook = (book: Book) => {
    setChatBookContext(`"${book.title}" by ${book.author}`);
    setChatSearchQuery(`Find the latest official documentation, code repositories, or newer editions for "${book.title}"`);
    setIsChatModalOpen(true);
  };

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lighthouse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lighthouse_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync language
  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('lighthouse_language', lang);
  };

  // Load database
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedBooks, fetchedEquipment, fetchedLoans, fetchedDatabases] = await Promise.all([
        fetchBooks(),
        fetchEquipment(),
        fetchLoans(),
        fetchDynamicDatabases(),
      ]);

      setBooks(fetchedBooks);
      setEquipmentList(fetchedEquipment);
      setLoans(fetchedLoans);
      setDatabases(fetchedDatabases);

      // Extract any extra custom topics
      const allExtractedTopics = Array.from(
        new Set([...INITIAL_TOPICS, ...fetchedBooks.map(b => b.topic)])
      );
      setTopics(allExtractedTopics);

      if (fetchedEquipment.length > 0 && !activeEquipmentId) {
        setActiveEquipmentId(fetchedEquipment[0].id);
      }
    } catch (err) {
      console.error('Failed to load library data:', err);
      showToast('Error loading library data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeEquipmentId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleOpenLend = (book?: Book) => {
    setSelectedBookForLend(book || null);
    setIsLendModalOpen(true);
  };

  const handleOpenReturn = (book: Book, loan?: Loan) => {
    setSelectedBookForReturn(book);
    const targetLoan = loan || loans.find(l => l.bookId === book.id && l.status !== 'returned');
    setActiveLoanForReturn(targetLoan);
    setIsReturnModalOpen(true);
  };

  const handleConfirmLend = async (
    bookId: string,
    equipmentId: string,
    days: number,
    notes?: string
  ) => {
    const res = await lendBook(bookId, equipmentId, days, notes);
    setLoans(prev => [res.loan, ...prev]);
    setBooks(prev => prev.map(b => (b.id === bookId ? res.book : b)));
    showToast(`Book lent to ${res.loan.userName}. Due in ${days} days.`);
  };

  const handleConfirmReturn = async (loanId: string) => {
    const res = await returnBook(loanId);
    setLoans(prev => prev.map(l => (l.id === loanId ? res.loan : l)));
    setBooks(prev => prev.map(b => (b.id === res.book.id ? res.book : b)));
    showToast(`Book "${res.book.title}" returned successfully.`);
  };

  const handleRenewLoan = async (loanId: string) => {
    const updated = await renewLoan(loanId, 14);
    setLoans(prev => prev.map(l => (l.id === loanId ? updated : l)));
    setBooks(prev =>
      prev.map(b => (b.id === updated.bookId ? { ...b, dueDate: updated.dueDate } : b))
    );
    showToast(`Loan renewed! New due date: ${new Date(updated.dueDate).toLocaleDateString()}`);
  };

  const handleAddEquipment = async (name: string, email?: string, notes?: string) => {
    const newEq: EquipmentUser = {
      id: `eq-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '')}`,
      name,
      email,
      role: 'user',
      joinedAt: new Date().toISOString(),
      borrowedCount: 0,
      notes,
    };
    await saveEquipment(newEq);
    setEquipmentList(prev => [...prev, newEq]);
    showToast(`Equipment "${name}" created.`);
  };

  const handleSeedGundams = async () => {
    const seeded = await seedGundamAccounts();
    setEquipmentList(seeded);
    showToast('The 11 Gundam equipment accounts have been pre-seeded!');
  };

  const handleSaveBatchBooks = async (newBooks: Book[]) => {
    await saveBooksBatch(newBooks);
    setBooks(prev => [...newBooks, ...prev]);
    showToast(`${newBooks.length} books successfully cataloged with Gemini AI!`);
  };

  const handleDeleteBook = async (bookId: string) => {
    await removeBook(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
    showToast('Book deleted from catalog.');
  };

  const handleUpdateBook = async (updated: Book) => {
    await saveBook(updated);
    setBooks(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    setSelectedBookDetails(updated);
    showToast('Book updated.');
  };

  const handleAddCustomTopic = (newTopic: string) => {
    if (!topics.includes(newTopic)) {
      setTopics(prev => [...prev, newTopic]);
      showToast(`Category "${newTopic}" added.`);
    }
  };

  // Badge calculations
  const nowMs = new Date().getTime();
  const activeLoansList = loans.filter(l => l.status !== 'returned');
  const overdueCount = activeLoansList.filter(l => new Date(l.dueDate).getTime() < nowMs).length;
  const needsReviewCount = books.filter(b => b.needsReview).length;

  const fbConfig = getStoredFirebaseConfig();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] transition-colors duration-300">
      {/* Top Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        currentRole={currentRole}
        equipmentList={equipmentList}
        activeEquipmentId={activeEquipmentId}
        onSelectEquipment={setActiveEquipmentId}
        isFirebaseLive={fbConfig.isConfigured}
        onOpenFirebaseModal={() => setActiveTab('settings')}
        onOpenUploadModal={() => setActiveTab('upload')}
        onOpenLendModal={() => handleOpenLend()}
        onOpenChatModal={() => {
          setIsMiyuChatOpen(true);
        }}
        onOpenHamburger={() => setIsHamburgerOpen(true)}
        firebaseUser={firebaseUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Navigation Bar */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentLang={currentLang}
        activeLoanCount={activeLoansList.length}
        overdueCount={overdueCount}
        needsReviewCount={needsReviewCount}
        onOpenHamburger={() => setIsHamburgerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-10 h-10 border-4 border-[#EAE2D2] border-t-[#BD3A2B] dark:border-[#38322B] dark:border-t-[#C88A35] rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#736859] dark:text-[#A89D8E] font-serif-jp">
              とうだいぶんこ（燈台文庫）読み込み中...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'library' && (
              <LibraryView
                books={books}
                topics={topics}
                currentLang={currentLang}
                currentRole={currentRole}
                onLendBook={handleOpenLend}
                onReturnBook={b => handleOpenReturn(b)}
                onViewBookDetails={setSelectedBookDetails}
                onOpenUpload={() => setActiveTab('upload')}
              />
            )}

            {activeTab === 'loans' && (
              <LoansDashboard
                loans={loans}
                books={books}
                equipmentList={equipmentList}
                currentLang={currentLang}
                currentRole={currentRole}
                activeEquipmentId={activeEquipmentId}
                onLendClick={handleOpenLend}
                onReturnClick={handleOpenReturn}
                onRenewLoan={handleRenewLoan}
                onViewBook={setSelectedBookDetails}
              />
            )}

            {activeTab === 'upload' && (
              <BulkUploadView
                currentLang={currentLang}
                existingTopics={topics}
                onAddCustomTopic={handleAddCustomTopic}
                onSaveBatchBooks={handleSaveBatchBooks}
                onNavigateToLibrary={() => setActiveTab('library')}
              />
            )}

            {activeTab === 'equipment' && (
              <EquipmentView
                equipmentList={equipmentList}
                books={books}
                loans={loans}
                currentLang={currentLang}
                currentRole={currentRole}
                activeEquipmentId={activeEquipmentId}
                onSelectEquipment={setActiveEquipmentId}
                onAddEquipment={handleAddEquipment}
                onSeedGundams={handleSeedGundams}
                onLendBook={handleOpenLend}
                onReturnBook={handleOpenReturn}
                onViewBook={setSelectedBookDetails}
              />
            )}

            {activeTab === 'todolist' && (
              <TodoListView
                currentLang={currentLang}
                onShowToast={showToast}
                currentUserEmail={firebaseUser?.email || undefined}
                onOpenHamburger={() => setIsHamburgerOpen(true)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                currentLang={currentLang}
                onRefreshData={loadData}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAE2D2] dark:border-[#2D2823] bg-[#FAF6EE] dark:bg-[#171513] py-6 px-4 text-center text-xs text-[#736859] dark:text-[#A89D8E]">
        <p className="font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
          LIGHTHOUSE 橋i • 燈台文庫（とうだいぶんこ）• Lighthouse Hashi Library
        </p>
        <p className="text-[11px] text-[#A89D8E] mt-1">
          Intelligent Technical Book Management Pipeline • Mobile, Tablet & Desktop Responsive
        </p>
      </footer>

      {/* Lend Modal ("Prestar") */}
      <LendModal
        isOpen={isLendModalOpen}
        onClose={() => setIsLendModalOpen(false)}
        book={selectedBookForLend}
        availableBooks={books.filter(b => b.status === 'available')}
        equipmentList={equipmentList}
        currentLang={currentLang}
        onConfirmLend={handleConfirmLend}
      />

      {/* Return Modal ("Entregar / Devolver") */}
      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        book={selectedBookForReturn}
        activeLoan={activeLoanForReturn}
        currentLang={currentLang}
        onConfirmReturn={handleConfirmReturn}
        onRenewLoan={handleRenewLoan}
      />

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={Boolean(selectedBookDetails)}
        onClose={() => setSelectedBookDetails(null)}
        book={selectedBookDetails}
        currentLang={currentLang}
        currentRole={currentRole}
        loansHistory={loans}
        onLend={handleOpenLend}
        onReturn={b => handleOpenReturn(b)}
        onDeleteBook={handleDeleteBook}
        onUpdateBook={handleUpdateBook}
        onAskAI={handleOpenChatWithBook}
        onSearchGrounding={handleOpenSearchGroundingWithBook}
      />

      {/* Multi-turn Gemini Chatbot & Google Search Grounding Modal */}
      <GeminiChatbotModal
        isOpen={isChatModalOpen || activeTab === 'chat'}
        onClose={() => {
          setIsChatModalOpen(false);
          if (activeTab === 'chat') {
            setActiveTab('library');
          }
        }}
        currentLang={currentLang}
        initialBookContext={chatBookContext}
        initialSearchQuery={chatSearchQuery}
      />

      {/* Main Menu Hamburger Drawer */}
      <HamburgerDrawer
        isOpen={isHamburgerOpen}
        onClose={() => setIsHamburgerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentLang={currentLang}
        booksCount={books.length}
        equipmentCount={equipmentList.length}
        loansCount={loans.length}
        todoListsCount={databases.length}
        isFirebaseLive={fbConfig.isConfigured}
        onOpenResumeModal={target => {
          setResumeModalTarget(target || 'all');
          setIsResumeModalOpen(true);
        }}
        isPanelMaximized={isGlobalPanelMaximized}
        onToggleMaximize={() => setIsGlobalPanelMaximized(!isGlobalPanelMaximized)}
      />

      {/* Global Resume Export & Dispatch Modal */}
      <ResumeExportModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        defaultTarget={resumeModalTarget}
        books={books}
        topics={topics}
        equipmentList={equipmentList}
        loans={loans}
        databases={databases}
        onShowToast={showToast}
        currentUserEmail={firebaseUser?.email || undefined}
      />

      {/* MIYU Interactive Mouse Toolkit (Explains Each Button on Hover) */}
      <MiyuMouseToolkit
        currentLang={currentLang}
        enabled={isMouseToolkitEnabled}
        onToggleEnabled={handleToggleMouseToolkit}
      />

      {/* MIYU Friendly Voice-Text Anime Chatbot (Right Button & Small Panel) */}
      <MiyuVoiceChatbot
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        mouseToolkitEnabled={isMouseToolkitEnabled}
        onToggleMouseToolkit={handleToggleMouseToolkit}
        isOpen={isMiyuChatOpen}
        onToggleOpen={() => setIsMiyuChatOpen(prev => !prev)}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
