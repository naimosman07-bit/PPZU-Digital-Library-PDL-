import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  Bot,
  Calendar,
  Bookmark,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  User,
  Library,
  Compass,
  HelpCircle,
  Briefcase,
  Grid,
  ChevronRight,
  Plus,
  Maximize2,
  FileDown,
  X,
  AlertCircle,
  Sparkles,
  Play,
  RotateCcw,
  Languages,
  TrendingUp,
  Activity,
  Layers,
  FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PPZU_BOOKS, CATEGORIES } from "./data";
import { Book, LoanRequest, ChatMessage, StaffUser } from "./types";
import planmalaysiaLogo from "./assets/images/planmalaysia_transparent_logo_1780884442923.png";
import pdlLogo from "./assets/images/pdl_app_logo_1780885185018.png";
import { db, syncMasterBooksList, seedStaffIfEmpty, seedLoansIfEmpty } from "./lib/firebase";
import { doc, setDoc, deleteDoc, updateDoc, collection, onSnapshot, getDocs, writeBatch } from "firebase/firestore";

export default function App() {
  // Navigation and Tab States
  const [activeTab, setActiveTab] = useState<"catalog" | "my-loans" | "admin">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"Semua" | "Digital" | "Fizikal">("Semua");
  const [isInfographicsOpen, setIsInfographicsOpen] = useState<boolean>(true);

  // Quote / Motivasi State
  const [quote, setQuote] = useState<{ text: string; author: string; category: string } | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(true);
  const [quoteError, setQuoteError] = useState<string>("");

  // Portal Authentication and Multi-Admin Simulation States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [newStaffId, setNewStaffId] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffDept, setNewStaffDept] = useState("Bahagian Perancangan Fizikal");
  const [requestAdminOnSignUp, setRequestAdminOnSignUp] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem("ppzu_staff_list");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Gagal membaca ppzu_staff_list:", e);
      }
    }
    return [
      {
        id: "PPZU-001",
        name: "Naim Osman",
        department: "Pentadbir Utama PPZU",
        isAdmin: true,
        status: "Disahkan_Admin"
      },
      {
        id: "PPZU-145",
        name: "Ir. Ahmad Shahrir",
        department: "Unit Geoinformasi & GIS",
        isAdmin: false,
        status: "Aktif_Staf"
      },
      {
        id: "PPZU-098",
        name: "Noraini Binti Yusuf",
        department: "Sektor Rancangan Pemajuan",
        isAdmin: false,
        status: "Aktif_Staf"
      }
    ];
  });

  const [currentUser, setCurrentUser] = useState<StaffUser>(() => {
    const saved = localStorage.getItem("ppzu_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Gagal membaca ppzu_current_user:", e);
      }
    }
    return {
      id: "PPZU-145",
      name: "Ir. Ahmad Shahrir",
      department: "Unit Geoinformasi & GIS",
      isAdmin: false,
      status: "Aktif_Staf"
    };
  });

  // Fetch Quote of the Day on Mount
  useEffect(() => {
    let active = true;
    const fetchQuote = async () => {
      try {
        setIsQuoteLoading(true);
        const res = await fetch("/api/quote");
        if (!res.ok) {
          throw new Error("Respon tidak berjaya");
        }
        const data = await res.json();
        if (active) {
          setQuote(data);
          setQuoteError("");
        }
      } catch (err: any) {
        console.error("Gagal mendapatkan kata-kata hikmah:", err);
        if (active) {
          setQuoteError(err.message || "Gagal berhubung");
        }
      } finally {
        if (active) {
          setIsQuoteLoading(false);
        }
      }
    };
    fetchQuote();
    return () => {
      active = false;
    };
  }, []);

  // Real-time Firestore synchronization & automatic seeding
  useEffect(() => {
    let active = true;
    let unsubscribeBooks: (() => void) | null = null;
    let unsubscribeStaff: (() => void) | null = null;
    let unsubscribeLoans: (() => void) | null = null;

    const setupRealtimeSync = async () => {
      try {
        // 1. Seed/Sync any collection that is currently empty or has missing books
        await syncMasterBooksList();
        
        const defaultStaff = [
          {
            id: "PPZU-001",
            name: "Naim Osman",
            department: "Pentadbir Utama PPZU",
            isAdmin: true,
            status: "Disahkan_Admin" as const
          },
          {
            id: "PPZU-145",
            name: "Ir. Ahmad Shahrir",
            department: "Unit Geoinformasi & GIS",
            isAdmin: false,
            status: "Aktif_Staf" as const
          },
          {
            id: "PPZU-098",
            name: "Noraini Binti Yusuf",
            department: "Sektor Rancangan Pemajuan",
            isAdmin: false,
            status: "Aktif_Staf" as const
          }
        ];
        await seedStaffIfEmpty(defaultStaff);

        const defaultLoans = [
          {
            id: "LOAN-2026-001",
            bookId: "PPZU-G02",
            bookTitle: "GPP Jilid 2: Garis Panduan Perancangan Kawasan Lapang dan Rekreasi",
            staffName: "Ir. Ahmad Shahrir",
            staffId: "PPZU-145",
            department: "Unit Geoinformasi & GIS",
            loanDate: "2026-06-01",
            returnDate: "2026-06-15",
            status: "Diluluskan" as const
          },
          {
            id: "LOAN-2026-002",
            bookId: "PPZU-L02",
            bookTitle: "Rancangan Struktur Negeri Perak 2040 (Warta)",
            staffName: "Noraini Binti Yusuf",
            staffId: "PPZU-098",
            department: "Sektor Rancangan Pemajuan",
            loanDate: "2026-06-07",
            returnDate: "2026-06-21",
            status: "Diproses" as const
          }
        ];
        await seedLoansIfEmpty(defaultLoans);

        if (!active) return;

        // 2. Setup snapshot listeners
        unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
          const list: Book[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as Book);
          });
          if (active) {
            setBooksState(list);
          }
        });

        unsubscribeStaff = onSnapshot(collection(db, "staff"), (snapshot) => {
          const list: StaffUser[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as StaffUser);
          });
          if (active) {
            setStaffList(list);
          }
        });

        unsubscribeLoans = onSnapshot(collection(db, "loans"), (snapshot) => {
          const list: LoanRequest[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as LoanRequest);
          });
          if (active) {
            setLoans(list);
          }
        });

      } catch (err) {
        console.error("Gagal menetapkan penyelarasan real-time Firebase:", err);
      }
    };

    setupRealtimeSync();

    return () => {
      active = false;
      if (unsubscribeBooks) unsubscribeBooks();
      if (unsubscribeStaff) unsubscribeStaff();
      if (unsubscribeLoans) unsubscribeLoans();
    };
  }, []);

  // Sync staffList to localStorage and pro-actively maintain bindings
  useEffect(() => {
    localStorage.setItem("ppzu_staff_list", JSON.stringify(staffList));
    const match = staffList.find(s => s.id === currentUser.id);
    if (match) {
      if (match.isAdmin !== currentUser.isAdmin || match.status !== currentUser.status || match.name !== currentUser.name || match.department !== currentUser.department) {
        setCurrentUser(match);
      }
    }
  }, [staffList, currentUser.id]);

  // Sync currentUser to localStorage
  useEffect(() => {
    localStorage.setItem("ppzu_current_user", JSON.stringify(currentUser));
    if (!currentUser.isAdmin && activeTab === "admin") {
      setActiveTab("catalog");
    }
  }, [currentUser, activeTab]);

  // Dynamic books catalog state (fallback to empty, populated by Firestore feed)
  const [booksState, setBooksState] = useState<Book[]>(PPZU_BOOKS);

  // Admin Panel Form States
  const [adminTitle, setAdminTitle] = useState("");
  const [adminAuthor, setAdminAuthor] = useState("");
  const [adminCategory, setAdminCategory] = useState("Garis Panduan Perancangan (GPP)");
  const [adminType, setAdminType] = useState<"Digital" | "Fizikal" | "Kedua-duanya">("Digital");
  const [adminLocation, setAdminLocation] = useState("Awan Digital PPZU");
  const [adminCoverColor, setAdminCoverColor] = useState("from-emerald-700 to-teal-900");
  const [adminDescription, setAdminDescription] = useState("");
  const [adminPublishYear, setAdminPublishYear] = useState(2026);
  const [adminPages, setAdminPages] = useState(120);
  const [adminChapters, setAdminChapters] = useState<{ title: string; content: string }[]>([
    {
      title: "Bab 1: Mukadimah Kajian Am",
      content: "Kandungan rujukan bab pertama menerangkan latar belakang isu, hasil analisis perancangan strategik, rujukan silang pelan landskap mampan Zon Utara koridor mampan, serta cadangan pelan bertindak bersepadu agensi."
    }
  ]);

  // Handle admin chapter addition
  const addAdminChapter = () => {
    setAdminChapters([
      ...adminChapters,
      {
        title: `Bab ${adminChapters.length + 1}: Tajuk Sub Bahasan`,
        content: "Masukkan kandungan huraian bab atau analisis perancangan di bawah kawalan urusan pentadbir sistem di sini..."
      }
    ]);
  };

  // Handle admin chapter removal
  const removeAdminChapter = (idx: number) => {
    if (adminChapters.length <= 1) return;
    setAdminChapters(adminChapters.filter((_, i) => i !== idx));
  };

  // Update specific chapter content
  const updateAdminChapter = (idx: number, field: "title" | "content", value: string) => {
    const updated = [...adminChapters];
    updated[idx] = { ...updated[idx], [field]: value };
    setAdminChapters(updated);
  };

  // Delete/Unregister a book from database
  const handleDeleteBook = async (bookId: string) => {
    if (confirm(`Adakah anda pasti mahu memadamkan rujukan "${booksState.find(b => b.id === bookId)?.title}" daripada arkib pangkalan data PPZU? Tindakan ini tidak boleh diundurkan.`)) {
      try {
        await deleteDoc(doc(db, "books", bookId));
      } catch (e) {
        console.error(e);
        alert("Gagal memadam dari Firestore.");
      }
    }
  };

  // Restore Default Library Seed
  const handleRestoreDefaults = async () => {
    if (confirm("Adakah anda pasti mahu set semula seluruh pangkalan buku ke tetapan asal PPZU? Semua buku yang anda daftarkan secara tersuai akan dipadamkan.")) {
      try {
        const snapshot = await getDocs(collection(db, "books"));
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        PPZU_BOOKS.forEach((book) => {
          const docRef = doc(db, "books", book.id);
          batch.set(docRef, book);
        });
        await batch.commit();
        alert("Pangkalan data telah berjaya ditetapkan semula di Firebase!");
      } catch (e) {
        console.error(e);
        alert("Gagal set semula.");
      }
    }
  };

  // Admin New Book register submit
  const handleRegisterNewBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim() || !adminAuthor.trim() || !adminDescription.trim()) {
      alert("Sila lengkapkan semua maklumat wajib (Tajuk, Pengarang dan Deskripsi)!");
      return;
    }

    let prefix = "PPZU-G";
    if (adminCategory.includes("Buletin")) {
      prefix = "PPZU-B";
    } else if (adminCategory.includes("Laporan")) {
      prefix = "PPZU-L";
    }

    const randomId = `${prefix}${Math.floor(10 + Math.random() * 90)}`;

    const newBook: Book = {
      id: randomId,
      title: adminTitle,
      author: adminAuthor,
      category: adminCategory,
      type: adminType,
      status: "Tersedia",
      location: adminType === "Digital" ? "Awan Digital PPZU" : adminLocation,
      coverColor: adminCoverColor,
      description: adminDescription,
      publishYear: Number(adminPublishYear) || 2026,
      pages: Number(adminPages) || 120,
      chapters: adminType !== "Fizikal" ? adminChapters.map((ch, idx) => ({
        id: `ch-${idx + 1}-${Date.now()}`,
        title: ch.title,
        content: ch.content
      })) : undefined
    };

    try {
      await setDoc(doc(db, "books", newBook.id), newBook);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan ke pangkalan data.");
    }

    // Reset Form
    setAdminTitle("");
    setAdminAuthor("");
    setAdminCategory("Garis Panduan Perancangan (GPP)");
    setAdminType("Digital");
    setAdminLocation("Awan Digital PPZU");
    setAdminCoverColor("from-emerald-700 to-teal-900");
    setAdminDescription("");
    setAdminPublishYear(2026);
    setAdminPages(120);
    setAdminChapters([
      {
        title: "Bab 1: Mukadimah Kajian Am",
        content: "Kandungan rujukan bab pertama menerangkan latar belakang isu, hasil analisis perancangan strategik, rujukan silang pelan landskap mampan Zon Utara koridor mampan, serta cadangan pelan bertindak bersepadu agensi."
      }
    ]);

    // Go to catalog tab and select this new book
    setActiveTab("catalog");
    setSelectedBook(newBook);
  };

  // Admin sub-tab selection state
  const [adminSubTab, setAdminSubTab] = useState<"books" | "admins">("books");

  // Handle staff registration and/or login switch
  const handleSwitchUser = (userId: string) => {
    const match = staffList.find(s => s.id === userId);
    if (match) {
      setCurrentUser(match);
      setIsAuthModalOpen(false);
      setLoginError("");
    } else {
      setLoginError("ID Kakitangan tidak ditemui dalam rekod PPZU.");
    }
  };

  // Handle registering/creating a brand new staff with potential admin application
  const handleRegisterStaffAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffId.trim() || !newStaffName.trim()) {
      setLoginError("ID Kakitangan dan Nama penuh wajib diisi.");
      return;
    }

    const trimmedId = newStaffId.trim().toUpperCase();
    
    // Check if duplicate ID exists
    const duplicate = staffList.find(s => s.id.toUpperCase() === trimmedId);
    if (duplicate) {
      // If they already exist, just log in as that person
      setLoginError("");
      setCurrentUser(duplicate);
      setIsAuthModalOpen(false);
      return;
    }

    const newStaff: StaffUser = {
      id: trimmedId,
      name: newStaffName.trim(),
      department: newStaffDept,
      isAdmin: false, // Must be approved by existing admin unless approved directly
      status: requestAdminOnSignUp ? "Mohon_Admin" : "Aktif_Staf"
    };

    try {
      await setDoc(doc(db, "staff", trimmedId), newStaff);
      setCurrentUser(newStaff);
      setIsAuthModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan pendaftaran kakitangan ke Firestore.");
    }
    
    // Reset fields
    setNewStaffId("");
    setNewStaffName("");
    setNewStaffDept("Bahagian Perancangan Fizikal");
    setRequestAdminOnSignUp(false);
    setLoginError("");

    if (requestAdminOnSignUp) {
      alert("Pendaftaran berjaya! Akaun anda berada dalam status aktif sebagai kakitangan biasa, dan permohonan pelantikan pentadbir (admin) telah dihantar ke Senarai Pentadbir PPZU.");
    } else {
      alert(`Selamat datang ${newStaff.name}! Anda kini log masuk sebagai Kakitangan PPZU.`);
    }
  };

  // Clear specific staff record
  const handleUnregisterStaff = async (userId: string) => {
    if (userId === "PPZU-001") {
      alert("Anda dilarang mengeluarkan Naim Osman (Pentadbir Utama)!");
      return;
    }
    if (userId === currentUser.id) {
      alert("Anda tidak boleh memadam profil anda sendiri semasa sedang aktif digunakan!");
      return;
    }
    if (confirm("Adakah anda pasti mahu memadamkan pendaftaran kakitangan ini daripada arkib?")) {
      try {
        await deleteDoc(doc(db, "staff", userId));
      } catch (e) {
        console.error(e);
        alert("Gagal mengeluarkan kakitangan ini.");
      }
    }
  };

  // Handle Admin promotion
  const handleApproveAdmin = async (userId: string) => {
    // Check current admin count
    const adminCount = staffList.filter(s => s.isAdmin).length;
    if (adminCount >= 3) {
      alert("Pelantikan Ditolak! Had Lantikan Maksimum 3 Pentadbir (Admin) telah dicapai untuk kelestarian sistem. Sila lucutkan atau edit pentadbir sedia ada di bawah terlebih dahulu.");
      return;
    }

    try {
      await updateDoc(doc(db, "staff", userId), { isAdmin: true, status: "Disahkan_Admin" });
      alert("Kakitangan berjaya dilantik menjadi Pentadbir Rasmi (Admin) Pusat Sumber PPZU!");
    } catch (e) {
      console.error(e);
      alert("Gagal melantik pentadbir.");
    }
  };

  // Handle Admin demotion
  const handleDemoteAdmin = async (userId: string) => {
    if (userId === "PPZU-001") {
      alert("Anda dilarang melucutkan jawatan Pemula Sistem (Naim Osman)!");
      return;
    }
    if (userId === currentUser.id) {
      alert("Anda tidak boleh melucutkan jawatan pentadbir anda sendiri semasa sedang aktif! Sila tukar ke akaun pentadbir lain dahulu.");
      return;
    }
    try {
      await updateDoc(doc(db, "staff", userId), { isAdmin: false, status: "Aktif_Staf" });
      alert("Kakitangan telah diturunkan semula kepada status Kakitangan Biasa.");
    } catch (e) {
      console.error(e);
      alert("Gagal melucutkan status pentadbir.");
    }
  };
  
  // Detail Modal & E-Reader states
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeReaderBook, setActiveReaderBook] = useState<Book | null>(null);
  const [activeReaderChapterIdx, setActiveReaderChapterIdx] = useState<number>(0);
  const [readerTheme, setReaderTheme] = useState<"light" | "sepia" | "dark">("sepia");
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [personalNote, setPersonalNote] = useState<string>("");
  const [savedNotes, setSavedNotes] = useState<{ [bookId: string]: string }>({});

  // Reservation States
  const [isReservingBook, setIsReservingBook] = useState<Book | null>(null);
  const [reservationName, setReservationName] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [reservationDept, setReservationDept] = useState("Bahagian Perancangan Fizikal");
  const [reservationDays, setReservationDays] = useState(14);
  const [recentSlip, setRecentSlip] = useState<LoanRequest | null>(null);

  // Active Loans List (Starts with mock records)
  const [loans, setLoans] = useState<LoanRequest[]>([
    {
      id: "LOAN-2026-001",
      bookId: "PPZU-G02",
      bookTitle: "GPP Jilid 2: Garis Panduan Perancangan Kawasan Lapang dan Rekreasi",
      staffName: "Ir. Ahmad Shahrir",
      staffId: "PPZU-145",
      department: "Unit Geoinformasi & GIS",
      loanDate: "2026-06-01",
      returnDate: "2026-06-15",
      status: "Diluluskan"
    },
    {
      id: "LOAN-2026-002",
      bookId: "PPZU-L02",
      bookTitle: "Rancangan Struktur Negeri Perak 2040 (Warta)",
      staffName: "Noraini Binti Yusuf",
      staffId: "PPZU-098",
      department: "Sektor Rancangan Pemajuan",
      loanDate: "2026-06-07",
      returnDate: "2026-06-21",
      status: "Diproses"
    }
  ]);

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "ai-initial",
      sender: "ai",
      text: "Assalamualaikum & Selamat Sejahtera! Saya Akmal, Pembantu AI Perpustakaan Digital PPZU. Bagaimana saya boleh bantu anda mencari Garis Panduan Perancangan (GPP), Rancangan Tempatan Daerah (RTD), atau laporan perancangan fizikal hari ini?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userChatInput, setUserChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load notes on startup
  useEffect(() => {
    const local = localStorage.getItem("ppzu_notes");
    if (local) {
      try {
        setSavedNotes(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Scroll chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Save specific reading note
  const saveNoteForBook = (bookId: string) => {
    const updated = { ...savedNotes, [bookId]: personalNote };
    setSavedNotes(updated);
    localStorage.setItem("ppzu_notes", JSON.stringify(updated));
  };

  // Filter books based on search, category and format type
  const filteredBooks = booksState.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "Semua" || book.category === selectedCategory;

    const matchesType =
      filterType === "Semua" ||
      (filterType === "Digital" && (book.type === "Digital" || book.type === "Kedua-duanya")) ||
      (filterType === "Fizikal" && (book.type === "Fizikal" || book.type === "Kedua-duanya"));

    return matchesSearch && matchesCategory && matchesType;
  });

  // Handle reserve submission
  const executeReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReservingBook || !reservationName || !reservationId) return;


    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(reservationDays));

    const newLoan: LoanRequest = {
      id: `LOAN-2026-${Math.floor(100 + Math.random() * 900)}`,
      bookId: isReservingBook.id,
      bookTitle: isReservingBook.title,
      staffName: reservationName,
      staffId: reservationId,
      department: reservationDept,
      loanDate: startDate.toISOString().split("T")[0],
      returnDate: endDate.toISOString().split("T")[0],
      status: "Diproses"
    };

    try {
      await setDoc(doc(db, "loans", newLoan.id), newLoan);
      
      // Also optionally update book availability if desired (e.g. status: "Diproses" or similar)
      const bookRef = doc(db, "books", isReservingBook.id);
      await updateDoc(bookRef, { status: "Diproses" });
      
      setRecentSlip(newLoan);
      setIsReservingBook(null);
      setReservationName("");
      setReservationId("");
    } catch (e) {
      console.error(e);
      alert("Gagal membuat tempahan di Firestore.");
    }
  };

  // Preset triggers for prompt recommendations
  const triggerPresetAiQuestion = (question: string) => {
    setUserChatInput(question);
    handleSendChatMessage(question);
  };

  // Handle Chat with Akmal AI
  const handleSendChatMessage = async (overrideText?: string) => {
    const messageText = overrideText || userChatInput;
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setUserChatInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            sender: m.sender,
            text: m.text
          })),
          selectedBook: selectedBook || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menyambung ke khidmat kecerdasan kecerdasan buatan.");
      }

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: "ai",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai-error`,
        sender: "ai",
        text: "Maaf, pelayan AI sedang mengalami kelewatan talian. Sebagai alternatif, sila cari atau filter buku secara terus menggunakan modul catalog kami yang responsif di kiri!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Open e-reader & prep notes
  const openReader = (book: Book) => {
    setActiveReaderBook(book);
    setActiveReaderChapterIdx(0);
    setPersonalNote(savedNotes[book.id] || "");
    setSelectedBook(null); // Close main detail card
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white font-sans antialiased selection:bg-emerald-500 selection:text-white p-4 md:p-6 flex flex-col">
      
      {/* GLOBAL HUD CAPABILITIES / APP HEADER */}
      <header className="sticky top-4 z-40 bg-white/10 backdrop-blur-xl border border-white/25 rounded-3xl mb-6 shadow-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-center py-4 gap-4">
            
            {/* Logo KPKT, PLANMalaysia & PDL Premium Brand Group */}
            <div className="flex items-center space-x-4">
              {/* Brand logo image group */}
              <div className="bg-slate-950/45 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner flex items-center space-x-2">
                <img
                  src={planmalaysiaLogo}
                  alt="PLANMalaysia"
                  className="h-10 md:h-11 w-auto object-contain transition-all hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="h-6 w-px bg-white/20 self-center" />
                <img
                  src={pdlLogo}
                  alt="PPZU Digital Library (PDL) App Logo"
                  className="h-10 md:h-11 w-auto object-contain rounded-xl transition-all hover:scale-110 shadow-lg border border-white/5"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-display font-black text-lg tracking-tight text-white leading-none">PPZU DIGITAL LIBRARY (PDL)</span>
                  <span className="self-start sm:self-auto px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold tracking-wider text-emerald-300 bg-emerald-500/15 rounded border border-emerald-500/25">Portal Perpustakaan Digital</span>
                </div>
                <p className="text-xs text-emerald-400 font-semibold tracking-wide mt-1">
                  Pejabat Projek Zon Utara • Jabatan Perancangan Bandar & Desa
                </p>
                <p className="text-[10px] text-slate-300 font-normal leading-none mt-0.5">Kementerian Perumahan dan Kerajaan Tempatan (KPKT)</p>
              </div>
            </div>

            {/* Main top tabs */}
            <div className="flex flex-wrap items-center bg-white/5 backdrop-blur-lg border border-white/10 p-1 rounded-xl gap-1">
              <button
                id="tab-catalog-btn"
                onClick={() => { setActiveTab("catalog"); setActiveReaderBook(null); }}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "catalog" && !activeReaderBook
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Navigasi Katalog</span>
              </button>
              
              <button
                id="tab-loans-btn"
                onClick={() => { setActiveTab("my-loans"); setActiveReaderBook(null); }}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "my-loans" && !activeReaderBook
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Log Tempahan ({loans.length})</span>
              </button>

              {currentUser.isAdmin && (
                <button
                  id="tab-admin-btn"
                  onClick={() => { setActiveTab("admin"); setActiveReaderBook(null); }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === "admin" && !activeReaderBook
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                  title="Sistem Kemasukan Buku & Pentadbiran Rujukan"
                >
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span className="flex items-center space-x-1.5">
                    <span>Portal Pentadbir (Admin)</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  </span>
                </button>
              )}
            </div>

            {/* Profile & Admin Gate switch triggers */}
            <div className="flex items-center space-x-2">
              <button
                id="toggle-auth-btn"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md text-xs font-semibold focus:outline-none"
              >
                <div className="relative">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-[7px] h-[7px] rounded-full ${currentUser.isAdmin ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                </div>
                <div className="text-left leading-none">
                  <span className="block truncate max-w-[120px] font-sans text-white text-xs">{currentUser.name}</span>
                  <span className="text-[9.5px] text-white/50 block font-normal mt-0.5">{currentUser.id} • {currentUser.isAdmin ? "Pentadbir" : "Kakitangan"}</span>
                </div>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* QUICK BENTO STATISTICS PANELS */}
      <div className="mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <button
              onClick={() => {
                setActiveTab("catalog");
                setSelectedCategory("Semua");
                setFilterType("Semua");
                setSearchQuery("");
                setTimeout(() => {
                  document.getElementById("catalog-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 105);
              }}
              className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl shadow-xl flex items-center space-x-4 hover:bg-white/10 hover:border-emerald-500/45 hover:shadow-emerald-950/25 active:scale-[0.98] transition-all cursor-pointer text-left w-full group focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white group-hover:text-emerald-300 transition-colors">{booksState.length}</div>
                <div className="text-xs text-white/60 font-medium group-hover:text-white/90 transition-colors flex items-center gap-1.5">
                  <span>Lihat Semua Buku</span>
                  <span className="text-emerald-400 text-[10px] transform group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </div>
            </button>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl shadow-xl flex items-center space-x-4">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">
                  {booksState.filter(b => b.type === "Digital" || b.type === "Kedua-duanya").length}
                </div>
                <div className="text-xs text-white/60 font-medium">E-Rujukan Digital Terus</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl shadow-xl flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">
                  {loans.filter(l => l.status === "Diproses").length}
                </div>
                <div className="text-xs text-white/60 font-medium">Tempahan Menanti Kelulusan</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl shadow-xl flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">
                  {loans.filter(l => l.status === "Diluluskan").length}
                </div>
                <div className="text-xs text-white/60 font-medium">Buku Sedang Dipinjam</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DETAILED INTERACTIVE INFOGRAPHICS & ANALYTICS DASHBOARD */}
      <div className="max-w-7xl mx-auto mb-8 px-4 sm:px-0">
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
          
          {/* Header Bar */}
          <div className="p-5 px-6 bg-gradient-to-r from-slate-950/60 to-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10">
            <div className="flex items-center space-x-3.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                  <TrendingUp className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  <span>HUB INFOGRAFIK PERANCANGAN SPATIAL PDL</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20 uppercase tracking-widest leading-none">Live Metrics</span>
                </h3>
                <p className="text-xs text-white/55 mt-0.5">Analisis visual koleksi, status e-rujukan, permohonan masa-nyata, dan statistik guna tanah perancang awam.</p>
              </div>
            </div>

            {/* Collapse/Expand action and reset filters toggle */}
            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  setSelectedCategory("Semua");
                  setFilterType("Semua");
                  setSearchQuery("");
                }}
                className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer inline-flex items-center space-x-1.5"
                title="Sifarkan semua tapis carian"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Tapis</span>
              </button>
              
              <button
                onClick={() => setIsInfographicsOpen(!isInfographicsOpen)}
                className="px-4 py-1.5 text-[11px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-950/20 transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>{isInfographicsOpen ? "Sembunyikan Infografik" : "Lihat Infografik"}</span>
                <span className="text-[10px] opacity-75">{isInfographicsOpen ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Infographic Dashboard Panel */}
          <AnimatePresence>
            {isInfographicsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden"
              >
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-gradient-to-br from-slate-950/40 via-transparent to-emerald-950/10">
                  
                  {/* COLUMN 1 (4-SPAN): HORIZONTAL CATEGORICAL RATIO DISTRIBUTION */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-teal-300 flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Agihan Bidang Rujukan Spatial</span>
                      </h4>
                      <span className="text-[9px] font-mono text-white/40">KLIK UNTUK TAPIS SEGERA</span>
                    </div>

                    <div className="space-y-4 py-1">
                      {/* Metric calculation */}
                      {(() => {
                        const gppCount = booksState.filter(b => b.category === "Garis Panduan Perancangan (GPP)").length;
                        const bulletinCount = booksState.filter(b => b.category === "Buletin").length;
                        const lprCount = booksState.filter(b => b.category === "Laporan Perancangan (Rancangan Fizikal Negara, Rancangan Struktur Negeri, Rancangan Tempatan, Rancangan Kawasan Khas, Pelan Tindakan Khas)").length;
                        const grandTotal = gppCount + bulletinCount + lprCount || 1;

                        const gppPercent = Math.round((gppCount / grandTotal) * 100);
                        const bulletinPercent = Math.round((bulletinCount / grandTotal) * 100);
                        const lprPercent = Math.round((lprCount / grandTotal) * 100);

                        return (
                          <div className="space-y-4">
                            {/* Bar 1: GPP */}
                            <div 
                              onClick={() => {
                                setSelectedCategory("Garis Panduan Perancangan (GPP)");
                                document.getElementById("catalog-search")?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="group p-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/25 transition-all duration-250 cursor-pointer"
                            >
                              <div className="flex justify-between text-xs font-sans font-medium mb-1.5">
                                <span className="text-white/80 group-hover:text-emerald-300 flex items-center space-x-1.5">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                                  <span>Garis Panduan Perancangan (GPP)</span>
                                </span>
                                <span className="font-bold font-mono text-emerald-400">{gppCount} Naskah ({gppPercent}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${gppPercent}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                                />
                              </div>
                            </div>

                            {/* Bar 2: Laporan Perancangan */}
                            <div 
                              onClick={() => {
                                setSelectedCategory("Laporan Perancangan (Rancangan Fizikal Negara, Rancangan Struktur Negeri, Rancangan Tempatan, Rancangan Kawasan Khas, Pelan Tindakan Khas)");
                                document.getElementById("catalog-search")?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="group p-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/25 transition-all duration-250 cursor-pointer"
                            >
                              <div className="flex justify-between text-xs font-sans font-medium mb-1.5">
                                <span className="text-white/80 group-hover:text-indigo-300 flex items-center space-x-1.5">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                                  <span className="truncate max-w-[200px] sm:max-w-none">Laporan Perancangan & Pelan Tempatan</span>
                                </span>
                                <span className="font-bold font-mono text-indigo-400">{lprCount} Naskah ({lprPercent}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${lprPercent}%` }}
                                  transition={{ duration: 0.8, delay: 0.3 }}
                                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full" 
                                />
                              </div>
                            </div>

                            {/* Bar 3: Buletin */}
                            <div 
                              onClick={() => {
                                setSelectedCategory("Buletin");
                                document.getElementById("catalog-search")?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="group p-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-amber-500/10 hover:border-amber-500/25 transition-all duration-250 cursor-pointer"
                            >
                              <div className="flex justify-between text-xs font-sans font-medium mb-1.5">
                                <span className="text-white/80 group-hover:text-amber-300 flex items-center space-x-1.5">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                                  <span>Buletin & Artikel GIS PPZU</span>
                                </span>
                                <span className="font-bold font-mono text-amber-400">{bulletinCount} Naskah ({bulletinPercent}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${bulletinPercent}%` }}
                                  transition={{ duration: 0.8, delay: 0.4 }}
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* COLUMN 2 (3-SPAN): DIGITALIZATION RATIO RADIAL GAUGE */}
                  <div className="lg:col-span-3 flex flex-col items-center justify-between space-y-4">
                    <div className="w-full border-b border-white/5 pb-2 text-center lg:text-left">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-teal-300 flex items-center justify-center lg:justify-start space-x-2">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Kadar Pendigitalan Rujukan</span>
                      </h4>
                    </div>

                    {(() => {
                      const totalCount = booksState.length || 1;
                      const digitalAndBoth = booksState.filter(b => b.type === "Digital" || b.type === "Kedua-duanya").length;
                      const digitalPercent = Math.round((digitalAndBoth / totalCount) * 100);
                      const radius = 45;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (digitalPercent / 100) * circumference;

                      return (
                        <div 
                          onClick={() => setFilterType("Digital")}
                          className="w-full flex-1 flex flex-col items-center justify-center space-y-3 cursor-pointer group bg-white/3 border border-white/5 rounded-2xl p-4 hover:border-emerald-500/25 transition-all duration-200"
                          title="Klik untuk lihat rujukan terus dalam talian"
                        >
                          {/* Radial Progress Ring SVG */}
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              {/* Background outer track */}
                              <circle
                                cx="56"
                                cy="56"
                                r={radius}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth="8"
                                fill="transparent"
                              />
                              {/* Dynamic progress fill */}
                              <motion.circle
                                cx="56"
                                cy="56"
                                r={radius}
                                stroke="#10b981"
                                strokeWidth="8.5"
                                fill="transparent"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: strokeDashoffset }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                              />
                            </svg>
                            
                            {/* Inner circle text overlay */}
                            <div className="absolute flex flex-col items-center text-center">
                              <span className="text-2xl font-black font-mono text-emerald-400 group-hover:scale-110 transition-transform">{digitalPercent}%</span>
                              <span className="text-[9px] uppercase font-mono tracking-widest text-white/40 group-hover:text-emerald-300">Digital</span>
                            </div>
                          </div>

                          <div className="text-center">
                            <span className="text-[10px] font-bold text-white/60 block">{digitalAndBoth} daripada {totalCount} Bahan Tersedia</span>
                            <span className="text-[9px] text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15 mt-1 inline-block">
                              E-Rujukan Terus Aktif
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* COLUMN 3 (5-SPAN): LIVE TRACKING / PLANNING PEAK TRAFFIC SPARKLINES */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-teal-300 flex items-center space-x-2">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Trafik Pengaksesan Mingguan Pegawai</span>
                      </h4>
                      <span className="inline-flex items-center text-[10px] text-emerald-400 font-mono font-bold space-x-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span>LIVE UPDATED</span>
                      </span>
                    </div>

                    <div className="bg-white/3 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-44">
                      
                      {/* Simulated Sparkline SVG representing daily requests load for the week */}
                      <div className="w-full h-20 relative flex items-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Shaded Area under path */}
                          <motion.path
                            d="M 0 50 Q 30 35 60 45 Q 90 20 120 40 Q 150 10 180 35 T 200 25 L 200 60 L 0 60 Z"
                            fill="url(#sparklineGrad)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1 }}
                          />

                          {/* Line Path */}
                          <motion.path
                            d="M 0 50 Q 30 35 60 45 Q 90 20 120 40 Q 150 10 180 35 T 200 25"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                          />

                          {/* Interactive pulsing dots */}
                          <circle cx="120" cy="40" r="3.5" fill="#34d399" className="animate-pulse" />
                          <circle cx="150" cy="10" r="4.5" fill="#f59e0b" className="animate-bounce" />
                        </svg>

                        {/* Top Indicator Tooltip */}
                        <div className="absolute top-0 right-10 bg-slate-950/90 border border-amber-500/30 text-amber-300 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg flex items-center space-x-1">
                          <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                          <span>PEAK RESCH (KHAMIS)</span>
                        </div>
                      </div>

                      {/* Sparkline Labels Row */}
                      <div className="flex justify-between text-[10px] font-mono text-white/50 border-t border-white/5 pt-2">
                        <span>Isnin</span>
                        <span>Selasa</span>
                        <span>Rabu</span>
                        <span>Khamis</span>
                        <span>Jumaat</span>
                        <span className="text-amber-400 font-bold">Sabtu</span>
                        <span className="text-amber-400 font-bold">Ahad</span>
                      </div>

                      {/* Small Info line */}
                      <p className="text-[9px] text-white/40 italic text-center mt-1">
                        Sistem sedia memuat turun unjuran guna tanah & permohonan GPP (99.8% ketersediaan talian server).
                      </p>

                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          
          {/* IMMERSIVE COMPACT DIGITAL E-READER VIEW */}
          {activeReaderBook ? (
            <motion.div
              key="ereader-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[680px]"
            >
              
              {/* Reader Navigation Sidebar */}
              <div className="lg:col-span-3 bg-slate-50 border-r border-slate-200 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setActiveReaderBook(null)}
                      className="text-xs text-slate-600 hover:text-emerald-700 flex items-center space-x-1.5 font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-all shadow-xs"
                    >
                      <span>← Tutup E-Reader</span>
                    </button>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-sm">
                      Bahasan Digital
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="text-[10px] text-emerald-800 uppercase tracking-wider font-extrabold mb-1">
                      {activeReaderBook.category}
                    </div>
                    <h3 className="font-display font-semibold text-slate-900 leading-snug text-base">
                      {activeReaderBook.title}
                    </h3>
                    <p className="text-xs text-slate-550 mt-1">oleh {activeReaderBook.author}</p>
                  </div>

                  <hr className="border-slate-200 mb-5" />

                  {/* Chapter List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Senarai Bab</h4>
                    <div className="space-y-1.5">
                      {activeReaderBook.chapters?.map((chapter, i) => (
                        <button
                          key={chapter.id}
                          onClick={() => setActiveReaderChapterIdx(i)}
                          className={`w-full text-left p-3 rounded-xl flex items-start space-x-2.5 transition-all text-xs font-medium cursor-pointer ${
                            activeReaderChapterIdx === i
                              ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/15"
                              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-100"
                          }`}
                        >
                          <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{chapter.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Staff Personal Notes Section for the currently loaded eBook */}
                <div className="mt-8 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Nota Peribadi Fail</span>
                    </span>
                    <button
                      onClick={() => saveNoteForBook(activeReaderBook.id)}
                      className="text-[10px] text-emerald-700 hover:underline font-bold"
                    >
                      Simpan Nota
                    </button>
                  </div>
                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="Tulis ringkasan, tajuk penting, atau rujukan peribadi tugasan anda di sini..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg h-24 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Nota disimpan secara selamat dalam pelayar ini untuk rujukan semula.
                  </p>
                </div>

              </div>

              {/* Reader Primary Content screen */}
              <div className={`lg:col-span-9 p-8 sm:p-12 flex flex-col justify-between transition-all ${
                readerTheme === "sepia" ? "bg-[#FAF6EC] text-[#433422]" :
                readerTheme === "dark" ? "bg-slate-900 text-slate-200" :
                "bg-white text-slate-850"
              }`}>
                
                {/* Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200/50">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-bold opacity-60">Kemasan Paparan:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setReaderTheme("light")}
                        className={`text-xs px-2.5 py-1 rounded border transition-all ${
                          readerTheme === "light"
                            ? "bg-white text-slate-900 font-bold border-slate-400"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-650 border-transparent"
                        }`}
                      >
                        Terang
                      </button>
                      <button
                        onClick={() => setReaderTheme("sepia")}
                        className={`text-xs px-2.5 py-1 rounded border transition-all ${
                          readerTheme === "sepia"
                            ? "bg-[#EFE8D4] text-[#433422] font-bold border-[#C0B79E]"
                            : "bg-[#EFE8D4]/60 hover:bg-[#EFE8D4] text-[#433422]/80 border-transparent"
                        }`}
                      >
                        Sepia
                      </button>
                      <button
                        onClick={() => setReaderTheme("dark")}
                        className={`text-xs px-2.5 py-1 rounded border transition-all ${
                          readerTheme === "dark"
                            ? "bg-slate-800 text-white font-bold border-slate-600"
                            : "bg-slate-800/40 hover:bg-slate-800 text-slate-300 border-transparent"
                        }`}
                      >
                        Malap
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-bold opacity-60">Saiz Tulisan:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setReaderFontSize("sm")}
                        className={`px-2 py-0.5 rounded text-xs leading-none transition-all ${
                          readerFontSize === "sm" ? "bg-emerald-700 text-white" : "bg-slate-200/60 dark:bg-slate-800 text-xs text-slate-500"
                        }`}
                      >
                        A-
                      </button>
                      <button
                        onClick={() => setReaderFontSize("base")}
                        className={`px-2 py-0.5 rounded text-xs leading-none transition-all ${
                          readerFontSize === "base" ? "bg-emerald-700 text-white" : "bg-slate-200/60 dark:bg-slate-800 text-xs text-slate-500"
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => setReaderFontSize("lg")}
                        className={`px-2 py-0.5 rounded text-xs leading-none transition-all ${
                          readerFontSize === "lg" ? "bg-emerald-700 text-white" : "bg-slate-200/60 dark:bg-slate-800 text-xs text-slate-500"
                        }`}
                      >
                        A+
                      </button>
                      <button
                        onClick={() => setReaderFontSize("xl")}
                        className={`px-2 py-0.5 rounded text-xs leading-none transition-all ${
                          readerFontSize === "xl" ? "bg-emerald-700 text-white" : "bg-slate-200/60 dark:bg-slate-800 text-xs text-slate-500"
                        }`}
                      >
                        A++
                      </button>
                    </div>
                  </div>
                </div>

                {/* Printable digital text segment */}
                <div className="my-8 max-w-3xl mx-auto flex-1 w-full">
                  <h2 className="font-display font-bold text-2xl tracking-normal border-b pb-3 mb-6" style={{
                    color: readerTheme === "sepia" ? "#2C1E0F" : readerTheme === "dark" ? "#FFF" : "#0f172a"
                  }}>
                    {activeReaderBook.chapters?.[activeReaderChapterIdx]?.title || "Bab Kandungan E-Buku"}
                  </h2>
                  
                  <p className="leading-relaxed whitespace-pre-wrap tracking-wide text-justify select-text" style={{
                    fontSize: readerFontSize === "sm" ? "0.875rem" :
                              readerFontSize === "base" ? "1rem" :
                              readerFontSize === "lg" ? "1.125rem" : "1.25rem"
                  }}>
                    {activeReaderBook.chapters?.[activeReaderChapterIdx]?.content || "Tiada kandungan tersedia."}
                  </p>
                </div>

                {/* Progress Indicators & Quick Tips for Staff Reference inside E-Reader */}
                <div className="border-t pt-4 border-slate-200/50 flex flex-wrap justify-between items-center text-xs opacity-75">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rujukan Digital PPZU • Pembacaan Selesa Hakmilik Terpelihara</span>
                  </span>
                  
                  <div className="flex items-center space-x-3">
                    <span>
                      Mukasurat {activeReaderChapterIdx + 1} daripada {activeReaderBook.chapters?.length || 1} Bab
                    </span>
                    <button
                      onClick={() => triggerPresetAiQuestion(`Tolong bentangkan idea utama bab ini untuk buku: ${activeReaderBook.title}`)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded transition-all flex items-center space-x-1"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Tanya AI Akmal Tentang Bab Ini</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            <div className="space-y-12 w-full">

              {/* SECTION: KATA-KATA HIKMAH & MOTIVASI HARIAN AI */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-indigo-950/60 border border-emerald-500/20 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-2xl hover:border-emerald-500/30 transition-all duration-300"
              >
                {/* Background decorative blob */}
                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center justify-center p-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-md text-emerald-300">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </span>
                    <span className="text-[10px] uppercase font-mono font-black tracking-wider text-emerald-350 bg-emerald-500/10 rounded-sm px-2 py-0.5 border border-emerald-500/25">
                      KATA-KATA HIKMAH HARIAN
                    </span>
                    {quote?.category && (
                      <span className="text-[9px] uppercase font-sans font-bold tracking-tight text-teal-200 bg-teal-500/15 rounded-full px-2.5 py-0.5 border border-teal-500/20">
                        {quote.category}
                      </span>
                    )}
                    <span className="text-[9px] font-mono font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-sm border border-white/5 inline-flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>AI AUTO-UPDATED DAILY</span>
                    </span>
                  </div>

                  {isQuoteLoading ? (
                    <div className="space-y-3.5 py-2">
                      <div className="h-4 bg-white/10 rounded-md w-full animate-pulse" />
                      <div className="h-4 bg-white/10 rounded-md w-4/5 animate-pulse" />
                      <div className="h-3.5 bg-white/5 rounded-md w-32 animate-pulse mt-4" />
                    </div>
                  ) : quote ? (
                    <div className="space-y-3">
                      <p className="text-sm md:text-base text-emerald-55 tracking-wide font-medium italic leading-relaxed text-justify md:text-left select-all">
                        "{quote.text}"
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-white/60">
                        <span className="font-semibold text-emerald-350">{quote.author}</span>
                        <span className="text-white/30">•</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Inspirasi Perancang Awam</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-300">Gagal memuatkan motivasi harian. Sila cuba seketika lagi.</p>
                  )}
                </div>

                {/* AI Brand Badge Action Container */}
                <div className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2.5 w-full md:w-44 shadow-inner relative">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                      <Bot className="w-5 h-5 text-emerald-400 animate-bounce" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-emerald-200">Sinergi AI Akmal</h4>
                    <p className="text-[9px] text-white/50 leading-tight mt-0.5">Penjana Minda & Dasar Kemampanan Fizikal PPZU</p>
                  </div>
                  
                  {/* Quick button to request a fresh quote or discuss with Akmal */}
                  <button
                    onClick={() => {
                      if (quote) {
                        triggerPresetAiQuestion(`Tolong kupas dan bahaskan kata-kata hikmah hari ini: "${quote.text}" - ${quote.author}. Bagaimana kita boleh laksanakan amanat ini dalam jawatan kita di PLANMalaysia?`);
                      }
                    }}
                    disabled={isQuoteLoading || !quote}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1 shadow-sm shadow-emerald-950/40"
                  >
                    <span>Bahaskan Bersama</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
              
              {/* SECTION: SUGGESTIONS OF MOVING COVERS (Rekomendasi Rujukan Bergerak) */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg text-white tracking-tight flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                      <span>Rekomendasi & Cadangan Rujukan Pintar</span>
                    </h3>
                    <p className="text-xs text-white/60">
                      Zon cadangan automatik bagi Garis Panduan Perancangan (GPP), Buletin & Laporan Perancangan terkini. Layangkan tetikus untuk memberhentikan gerakan.
                    </p>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wide self-start sm:self-auto font-mono">
                    Cadangan Buku Terbaru
                  </span>
                </div>

                {/* Clean Edge Infinite Marquee Ticker */}
                <div className="relative overflow-hidden w-full rounded-2xl py-4 bg-slate-950/40 border border-white/5 p-4">
                  <div className="animate-marquee flex space-x-6">
                    {/* Double seed values to make looping gapless */}
                    {[...booksState, ...booksState].map((book, idx) => (
                      <div
                        key={`${book.id}-marquee-${idx}`}
                        onClick={() => setSelectedBook(book)}
                        className="w-48 shrink-0 bg-white/5 border border-white/10 hover:border-emerald-400/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 transform hover:scale-103 cursor-pointer flex flex-col justify-between"
                      >
                        {/* Radiant Graphic cover section */}
                        <div className={`h-32 bg-gradient-to-br ${book.coverColor} p-3.5 flex flex-col justify-between relative`}>
                          <span className="text-[8px] bg-black/45 text-white font-bold py-0.5 px-2 rounded-full self-start border border-white/10">
                            {book.id}
                          </span>
                          <span className="text-[11px] text-white font-display font-bold line-clamp-2 leading-tight drop-shadow-md">
                            {book.title}
                          </span>
                        </div>
                        {/* Metadata Details column */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                          <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed">
                            {book.description}
                          </p>
                          <div className="flex items-center justify-between text-[9px] font-mono border-t border-white/10 pt-1.5 text-white/50">
                            <span className="truncate max-w-24 text-emerald-400 font-sans font-bold">{book.category.split(" ")[0]}</span>
                            <span>M/S {book.pages}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Gradient shadow edges to smooth visual transitions */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* RENDER VIEW CONDITION: PORTAL PENTADBIR PANEL VS DISCOVERY CARDS */}
              {activeTab === "admin" ? (
                /* Dynamic Management Dashboard */
                <motion.div
                  key="admin-desktop"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl space-y-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-white/10">
                    <div>
                      <h3 className="font-display font-bold text-xl text-amber-300 flex items-center space-x-2">
                        <Briefcase className="w-5.5 h-5.5 text-amber-400 animate-pulse" />
                        <span>Meja Urusan Pentadbir Fail Rujukan PPZU</span>
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        Daftarkan naskah bahan rujukan baharu (GPP, Laporan Perancangan, Buletin) di sini untuk diletakkan terus ke katalog.
                      </p>
                    </div>

                    <button
                      onClick={handleRestoreDefaults}
                      className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/30 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 text-xs font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kosongkan & Set Semula Asal</span>
                    </button>
                  </div>

                  {/* INTERNAL ADMIN SUB-NAVIGATION CONTROLS */}
                  <div className="flex flex-wrap items-center bg-white/5 border border-white/10 p-1.5 rounded-2xl gap-1 w-full max-w-2xl">
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("books")}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        adminSubTab === "books"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Library className="w-4 h-4 text-amber-400" />
                      <span>Daftar Dokumen Rujukan ({booksState.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("admins")}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
                        adminSubTab === "admins"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <User className="w-4 h-4 text-amber-400" />
                      <span>Pelantikan Pentadbir / Kakitangan ({staffList.filter(s => s.isAdmin).length}/3 Slot)</span>
                      {staffList.some(s => s.status === "Mohon_Admin" && !s.isAdmin) && (
                        <span className="absolute top-2.5 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </button>
                  </div>

                  {adminSubTab === "books" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* PRIMARY COLUMN: REGISTRY FORM */}
                    <form onSubmit={handleRegisterNewBook} className="lg:col-span-7 space-y-5">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Title of Book */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Tajuk Buku / Dokumen Rujukan *</label>
                          <input
                            type="text"
                            required
                            value={adminTitle}
                            onChange={(e) => setAdminTitle(e.target.value)}
                            placeholder="Contoh: GPP Jilid 4: Garis Panduan Perumahan..."
                            className="w-full text-xs p-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/35 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Author */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Pengarang / Agensi Pengeluar *</label>
                          <input
                            type="text"
                            required
                            value={adminAuthor}
                            onChange={(e) => setAdminAuthor(e.target.value)}
                            placeholder="Contoh: PLANMalaysia, DBKL..."
                            className="w-full text-xs p-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/35 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Category Dropdown (Malay Categories as specified) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Kategori Rujukan Rasmi *</label>
                          <select
                            value={adminCategory}
                            onChange={(e) => setAdminCategory(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-900 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="Garis Panduan Perancangan (GPP)">Garis Panduan Perancangan (GPP)</option>
                            <option value="Buletin">Buletin</option>
                            <option value="Laporan Perancangan (Rancangan Fizikal Negara, Rancangan Struktur Negeri, Rancangan Tempatan, Rancangan Kawasan Khas, Pelan Tindakan Khas)">Laporan Perancangan (RFN, RSN, RT, RKK, PTK)</option>
                          </select>
                        </div>

                        {/* Layout format mode selector */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Format Akses Pengunaan *</label>
                          <select
                            value={adminType}
                            onChange={(e) => setAdminType(e.target.value as any)}
                            className="w-full text-xs p-2.5 bg-slate-900 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="Digital">Digital Sahaja (Baca Atas Talian)</option>
                            <option value="Fizikal">Fizikal Sahaja (Rak Utama)</option>
                            <option value="Kedua-duanya">Kedua-duanya (Online & Rak)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Shelf Location info */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Zon Simpan / Pautan Fail *</label>
                          <input
                            type="text"
                            value={adminType === "Digital" ? "Awan Digital PPZU" : adminLocation}
                            disabled={adminType === "Digital"}
                            onChange={(e) => setAdminLocation(e.target.value)}
                            placeholder="Contoh: Rak G5 - Buku Hijau..."
                            className="w-full text-xs p-2.5 bg-white/10 disabled:opacity-50 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Publish Year */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Tahun Terbitan *</label>
                          <input
                            type="number"
                            required
                            min="2010"
                            max="2030"
                            value={adminPublishYear}
                            onChange={(e) => setAdminPublishYear(Number(e.target.value))}
                            className="w-full text-xs p-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Pages size count */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/80 block">Jumlah Halaman (M/S) *</label>
                          <input
                            type="number"
                            required
                            min="5"
                            max="600"
                            value={adminPages}
                            onChange={(e) => setAdminPages(Number(e.target.value))}
                            className="w-full text-xs p-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Aesthetic cover chooser */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/80 block">Pilihan Reka Bentuk Sampul (Cover Gradient)</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Emerald", rgb: "from-emerald-700 to-teal-900" },
                            { name: "Cyan Marine", rgb: "from-teal-800 to-cyan-900" },
                            { name: "Oceanic", rgb: "from-sky-700 to-blue-900" },
                            { name: "Grape Purple", rgb: "from-indigo-805 to-purple-900" },
                            { name: "Sunset", rgb: "from-orange-650 to-rose-950" },
                            { name: "Warm Red", rgb: "from-rose-700 to-red-900" }
                          ].map((gradient) => (
                            <button
                              key={gradient.rgb}
                              type="button"
                              onClick={() => setAdminCoverColor(gradient.rgb)}
                              className={`flex-1 min-w-[75px] text-center p-2 rounded-xl border text-[10px] transition-all cursor-pointer ${
                                adminCoverColor === gradient.rgb
                                  ? "bg-white/15 border-amber-300 font-bold scale-102 ring-1 ring-amber-400"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/8"
                              }`}
                            >
                              <div className={`h-4.5 rounded bg-gradient-to-br ${gradient.rgb} mb-1`} />
                              <span className="block truncate text-center">{gradient.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sinopsis Description area */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/80 block">Ringkasan Fail / Sinopsis Rujukan *</label>
                        <textarea
                          required
                          value={adminDescription}
                          onChange={(e) => setAdminDescription(e.target.value)}
                          placeholder="Terangkan skop kandungan rujukan perancangan, matlamat buletin, atau liputan kawasan yang ditekankan untuk dipaparkan secara rasmi..."
                          className="w-full text-xs p-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/35 focus:ring-1 focus:ring-amber-500 focus:outline-none h-20"
                        />
                      </div>

                      {/* E-Reader Chapters (Only if dynamic eBook format is chosen!) */}
                      {adminType !== "Fizikal" && (
                        <div className="bg-slate-950/30 border border-white/10 rounded-2xl p-4.5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                              <BookOpen className="w-4 h-4 text-emerald-400" />
                              <span>Senarai Bab E-Reader ({adminChapters.length} Bab)</span>
                            </span>
                            <button
                              type="button"
                              onClick={addAdminChapter}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-555 text-amber-300 font-bold text-[10px] rounded border border-amber-500/10 cursor-pointer flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Bab Baru</span>
                            </button>
                          </div>

                          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                            {adminChapters.map((chapter, index) => (
                              <div key={index} className="bg-slate-900/85 p-3 rounded-xl border border-white/5 space-y-2.5 relative">
                                <div className="flex items-center justify-between gap-1.5">
                                  <input
                                    type="text"
                                    required
                                    value={chapter.title}
                                    onChange={(e) => updateAdminChapter(index, "title", e.target.value)}
                                    placeholder="Nama Bab (contoh: Bab 1: Dasar...)"
                                    className="bg-transparent border-b border-white/15 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none w-2/3 py-0.5 placeholder:text-white/30"
                                  />
                                  <button
                                    type="button"
                                    disabled={adminChapters.length <= 1}
                                    onClick={() => removeAdminChapter(index)}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 disabled:opacity-45 cursor-pointer"
                                  >
                                    Padam
                                  </button>
                                </div>
                                <textarea
                                  required
                                  value={chapter.content}
                                  onChange={(e) => updateAdminChapter(index, "content", e.target.value)}
                                  placeholder="Tulis penerangan lengkap atau kandungan bab digital di sini..."
                                  className="w-full text-[10px] p-2 bg-black/40 border border-white/5 rounded-lg text-white/80 h-14 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Register Submit button */}
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Daftar Buku Ke Sistem PPZU</span>
                      </button>

                    </form>

                    {/* SECONDARY ROW: LIVE PREVIEW COVER & DELETE INTERNALS */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Reactive Live Mock Cover */}
                      <div className="bg-slate-950/45 border border-white/10 rounded-2xl p-4.5 text-center space-y-4">
                        <span className="text-[10px] font-bold text-white/50 block tracking-widest uppercase border-b border-white/5 pb-2">
                          Pratonton Kemasukan (Pratonton Live)
                        </span>

                        <div className="w-52 h-72 mx-auto rounded-xl border border-white/15 shadow-2xl overflow-hidden flex flex-col justify-between text-left">
                          <div className={`h-40 bg-gradient-to-br ${adminCoverColor} p-4 flex flex-col justify-between relative`}>
                            <div className="flex justify-between items-start">
                              <span className="text-[8px] bg-black/40 text-emerald-100 px-2 py-0.5 rounded-full uppercase border border-white/5">
                                PPZU-PREVIEW
                              </span>
                              <span className="text-[8px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-bold">
                                {adminType}
                              </span>
                            </div>

                            <div className="text-white drop-shadow">
                              <span className="text-[7.5px] uppercase font-bold text-white/70 block truncate">
                                {adminCategory.split(" ")[0]}
                              </span>
                              <h4 className="font-display font-semibold text-[11px] line-clamp-3 leading-tight mt-0.5">
                                {adminTitle || "[Tajuk Rujukan Baru]"}
                              </h4>
                              <p className="text-[8px] italic opacity-85 mt-1">
                                oleh {adminAuthor || "[Pengarang / Agensi]"}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900 flex-1 flex flex-col justify-between space-y-2">
                            <p className="text-[9.5px] text-white/60 line-clamp-3">
                              {adminDescription || "Sila masukkan deskripsi di borang sebelah untuk mengisi pratonton."}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-mono text-white/40 border-t border-white/5 pt-1">
                              <span>M/S: {adminPages}</span>
                              <span className="text-emerald-400 text-[9px]">Tahun {adminPublishYear}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live unregister list (Delete panel) */}
                      <div className="bg-slate-950/45 border border-white/10 rounded-2xl p-4 space-y-3.5">
                        <div className="border-b pb-2 border-white/5">
                          <h4 className="text-xs font-bold text-white">Senarai Pengurusan Dokumen</h4>
                          <p className="text-[9.5px] text-white/50">Urgen: membenarkan padaman rujukan silang terpilih</p>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {booksState.map((book) => (
                            <div key={book.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs hover:bg-white/8 transition-colors">
                              <div className="truncate pr-2 max-w-[80%]">
                                <span className="text-[9px] font-mono text-amber-300 block">{book.id} • {book.category.split(" ")[0]}</span>
                                <strong className="text-white font-medium block truncate leading-tight">{book.title}</strong>
                                <span className="text-[10px] text-white/50 block">disiarkan oleh {book.author}</span>
                              </div>

                              <button
                                onClick={() => handleDeleteBook(book.id)}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-white/5 hover:border-transparent text-[10px] font-bold rounded transition-all cursor-pointer shrink-0"
                              >
                                Padam
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                    /* APPOINTMENT AND STAFF DIRECTORY AREA */
                    <div className="space-y-8 animate-fadeIn text-white">
                      
                      {/* APPOINTMENT SLOTS GRID (MAX 3 ADMINS POLICY) */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                          <div>
                            <h4 className="font-display font-bold text-base text-amber-300 flex items-center space-x-2">
                              <Sparkles className="w-5 h-5 text-amber-400" />
                              <span>Zon Perjawatan Pentadbir PPZU (Maksimum 3 Slot Pentadbir)</span>
                            </h4>
                            <p className="text-xs text-white/50 mt-1">
                              Sistem pengurusan Pusat Sumber PPZU dijalankan secara bersinergi dengan mengehadkan maksimum 3 slot pentadbir sistem bagi mengekalkan integriti kawalan katalog dan rekod tempahan.
                            </p>
                          </div>
                          <span className="text-xs bg-amber-500/10 text-amber-300 font-mono font-bold px-3 py-1 rounded-lg border border-amber-500/20 shrink-0">
                            Slot Aktif: {staffList.filter(s => s.isAdmin).length} / 3 Lantikan
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[0, 1, 2].map((slotIdx) => {
                            const activeAdmins = staffList.filter(s => s.isAdmin);
                            const adminInSlot = activeAdmins[slotIdx];

                            if (adminInSlot) {
                              return (
                                <div
                                  key={`slot-${slotIdx}-${adminInSlot.id}`}
                                  className="bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden shadow-lg h-36"
                                >
                                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                                  
                                  <div className="flex justify-between items-center">
                                    <div className="bg-amber-400/10 text-amber-300 text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-amber-500/10">
                                      Slot Pentadbir {slotIdx + 1}
                                    </div>
                                    <span className="text-[10px] text-white/40 font-mono">{adminInSlot.id}</span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <span className="text-[9.5px] text-white/40 block font-normal truncate mt-1">{adminInSlot.department}</span>
                                    <strong className="text-white font-display text-sm block truncate">{adminInSlot.name}</strong>
                                  </div>

                                  {adminInSlot.id === "PPZU-001" ? (
                                    <div className="text-[9px] text-white/30 italic font-mono uppercase tracking-wider">
                                      Master Admin PPZU (Kekal)
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDemoteAdmin(adminInSlot.id)}
                                      className="w-full py-1 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-300 text-[10px] font-bold rounded transition-all cursor-pointer border border-rose-500/20 hover:border-transparent text-center"
                                    >
                                      Gugurkan Pentadbir
                                    </button>
                                  )}
                                </div>
                              );
                            } else {
                              return (
                                <div
                                  key={`slot-empty-${slotIdx}`}
                                  className="border border-dashed border-white/10 bg-slate-950/25 p-5 rounded-2xl flex flex-col justify-center items-center text-center space-y-2.5 h-36"
                                >
                                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs font-mono font-bold">
                                    {slotIdx + 1}
                                  </div>
                                  <div>
                                    <strong className="text-white/40 text-xs block font-bold uppercase tracking-wider">Slot Kosong</strong>
                                    <span className="text-[9.5px] text-white/30 max-w-[140px] block mx-auto leading-xs mt-0.5">Sedia menerima lantikan baru</span>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>

                      {/* SEC 2: PENDING APPLICANTS */}
                      <div className="bg-slate-950/25 border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
                        <div className="border-b pb-2 px-1 border-white/5">
                          <h4 className="text-xs font-bold text-white flex items-center space-x-1.5 uppercase font-mono tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Kakitangan Memohon Tugas Pentadbiran ({staffList.filter(s => s.status === "Mohon_Admin" && !s.isAdmin).length})</span>
                          </h4>
                        </div>

                        {staffList.filter(s => s.status === "Mohon_Admin" && !s.isAdmin).length === 0 ? (
                          <p className="text-xs text-white/40 italic p-3 text-center">Tiada permohonan pelantikan baharu diterima buat masa ini.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                            {staffList.filter(s => s.status === "Mohon_Admin" && !s.isAdmin).map((staf) => (
                              <div key={staf.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs hover:bg-white/8 transition-all">
                                <div className="truncate pr-2">
                                  <span className="text-[9px] font-mono text-amber-300 block">{staf.id} • {staf.department}</span>
                                  <strong className="text-white block font-medium truncate mt-1">{staf.name}</strong>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <button
                                    onClick={() => handleUnregisterStaff(staf.id)}
                                    className="px-2 py-1 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded text-[10px] font-semibold transition-all cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                  <button
                                    onClick={() => handleApproveAdmin(staf.id)}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
                                  >
                                    <CheckCircle className="w-3 h-3 text-slate-950" />
                                    <span>Sahkan & Lantik</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SEC 3: SYSTEM STAFF MEMBERS REGISTRY */}
                      <div className="bg-slate-950/25 border border-white/10 p-5 rounded-2xl space-y-4 shadow-lg">
                        <div className="border-b pb-2.5 border-white/5">
                          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Direktori Pegawai & Kakitangan Berdaftar ({staffList.length})</span>
                          </h4>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/15 text-white/40 text-[9.5px] uppercase font-mono">
                                <th className="pb-2">Kakitangan</th>
                                <th className="pb-2">Jabatan / Sektor</th>
                                <th className="pb-2">Kelayakan Akses</th>
                                <th className="pb-2 text-right">Tindakan Lantikan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {staffList.map((staf) => (
                                <tr key={staf.id} className="hover:bg-white/3 transition-colors">
                                  <td className="py-2.5 pr-3">
                                    <strong className="text-white block hover:text-emerald-400 transition-colors cursor-pointer">{staf.name}</strong>
                                    <span className="text-[9.5px] text-white/40 block font-mono mt-0.5">{staf.id}</span>
                                  </td>
                                  <td className="py-2.5 text-white/80">{staf.department}</td>
                                  <td className="py-2.5">
                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                                      staf.isAdmin
                                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                                        : staf.status === "Mohon_Admin"
                                        ? "bg-rose-500/15 text-rose-300 animate-pulse border border-rose-500/10"
                                        : "bg-white/5 text-white/50 border border-white/5"
                                    }`}>
                                      {staf.isAdmin ? "PENTADBIR" : staf.status === "Mohon_Admin" ? "MENANTI KELULUSAN" : "PEGAWAI PERANCANG"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <div className="inline-flex items-center space-x-1.5">
                                      {!staf.isAdmin && staf.status !== "Mohon_Admin" && (
                                        <button
                                          onClick={() => handleApproveAdmin(staf.id)}
                                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-900 text-amber-300 border border-amber-500/20 rounded text-[9.5px] font-bold transition-all cursor-pointer"
                                        >
                                          Lantik Pentadbir
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleUnregisterStaff(staf.id)}
                                        disabled={staf.id === "PPZU-001" || staf.id === currentUser.id}
                                        className="px-2 py-1 disabled:opacity-20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-300 rounded text-[9.5px] font-bold border border-rose-500/15 disabled:pointer-events-none transition-all cursor-pointer"
                                      >
                                        Padam
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </motion.div>
              ) : (
                /* ORIGINAL DUAL COMPONENT SEARCH AND CATALOG WRAPPERS */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT CONTAINER: BOOK CATALOG, SEARCH AND FILTERS */}
              <div className="lg:col-span-7 space-y-6">
                             {/* Search, Categorization, Filter controls container */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display font-bold text-xl text-white tracking-tight flex items-center space-x-2">
                        <Grid className="w-5 h-5 text-emerald-400" />
                        <span>Katalog Utama PPZU Digital Library (PDL)</span>
                      </h2>
                      <p className="text-xs text-white/60">Cari rujukan komprehensif, naskah fizikal, atau rujukan digital PDL serta-merta</p>
                    </div>
                    
                    {/* Format filter: Digital/Physical */}
                    <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl self-start md:self-auto">
                      <button
                        onClick={() => setFilterType("Semua")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          filterType === "Semua" ? "bg-emerald-600 text-white shadow-xs" : "text-white/60 hover:text-white"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setFilterType("Digital")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          filterType === "Digital" ? "bg-emerald-600 text-white shadow-xs" : "text-white/60 hover:text-white"
                        }`}
                      >
                        Dalam Talian
                      </button>
                      <button
                        onClick={() => setFilterType("Fizikal")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          filterType === "Fizikal" ? "bg-emerald-600 text-white shadow-xs" : "text-white/60 hover:text-white"
                        }`}
                      >
                        Fizikal (Rak)
                      </button>
                    </div>
                  </div>

                  {/* High Quality Styled search input */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-4.5 h-4.5" />
                      <input
                        id="catalog-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Masukkan tajuk buku, nama pengarang, atau kata kunci..."
                        className="w-full pl-11 pr-11 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white text-sm focus:bg-white/15 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder:text-white/40"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("Semua");
                        setFilterType("Semua");
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all duration-250 cursor-pointer flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-emerald-950/20 active:scale-[0.97]"
                    >
                      <Library className="w-4 h-4" />
                      <span>Papar Semua Buku</span>
                    </button>
                  </div>

                  {/* Horizontal Scrollable Categories */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all whitespace-nowrap grow-0 shrink-0 ${
                          selectedCategory === cat
                            ? "bg-emerald-600 text-white shadow-lg"
                            : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid layout containing actual catalog and stylized covers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book) => (
                      <div
                        key={book.id}
                        id={`book-${book.id}`}
                        onClick={() => setSelectedBook(book)}
                        className="group bg-white/5 backdrop-blur-md border border-white/15 hover:shadow-2xl hover:bg-white/10 hover:border-emerald-500/40 transition-all cursor-pointer overflow-hidden flex flex-col justify-between rounded-2xl shadow-xl"
                      >
                        {/* Elegant custom digital cover generation placeholder using Tailwind gradients */}
                        <div className={`h-44 bg-gradient-to-br ${book.coverColor} p-4 flex flex-col justify-between relative`}>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-emerald-100 tracking-wider bg-black/40 px-2 py-0.5 rounded-full uppercase border border-white/10">
                              {book.id}
                            </span>
                            
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                              book.type === "Digital"
                                ? "bg-amber-400 text-amber-950"
                                : book.type === "Fizikal"
                                ? "bg-indigo-650 text-white"
                                : "bg-emerald-100 text-emerald-950"
                            }`}>
                              {book.type}
                            </span>
                          </div>

                          <div className="text-white drop-shadow-md">
                            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">{book.category}</span>
                            <h4 className="font-display font-bold text-sm tracking-wide line-clamp-2 mt-0.5 leading-snug">{book.title}</h4>
                            <p className="text-[10px] opacity-90 italic mt-1 font-mono">oleh {book.author}</p>
                          </div>

                          {/* Subtle digital paper glow decoration */}
                          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-shimmer pointer-events-none opacity-20" />
                        </div>

                        {/* Summary & actions info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                            {book.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                            
                            {/* Availability status indicator */}
                            <span className="flex items-center space-x-1 font-semibold">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                book.status === "Tersedia"
                                  ? "bg-emerald-400"
                                  : book.status === "Dipinjam"
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              }`} />
                              <span className="text-white/60">{book.status}</span>
                            </span>

                            {/* Location identifier */}
                            <span className="text-emerald-300 font-mono">
                              {book.location}
                            </span>

                          </div>
                        </div>

                        <div className="bg-white/5 hover:bg-emerald-500/10 px-4 py-2 text-right border-t border-white/10 transition-colors">
                          <span className="text-xs text-white/80 group-hover:text-emerald-300 font-semibold inline-flex items-center space-x-1">
                            <span>Sila semak buku</span>
                            <ChevronRight className="w-3 h-3 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 bg-white/5 backdrop-blur-md rounded-2xl border border-dashed border-white/20 p-12 text-center text-white/60 max-w-lg mx-auto shadow-xl">
                      <div className="p-4 bg-white/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <Search className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h4 className="font-display font-medium text-white mb-1">Tiada Buku Ditemui</h4>
                      <p className="text-xs text-white/55">
                        Maaf, kami tidak menemui sebarang buku atau bahan ilmiah digital bagi rujukan kata kunci "{searchQuery}". Sila periksa semula ejaan atau cuba kategori alternatif.
                      </p>
                    </div>
                  )}
                </div>

              </div>
              
              {/* RIGHT CONTAINER: INTERACTIVE WORK DESK (AI DESK OR SUBMITTED SLIPS BOARD) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Secondary Header Tab selecting UI within desk */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between p-1 bg-white/5 border border-white/10 rounded-xl">
                    
                    <button
                      onClick={() => setActiveTab("catalog")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeTab === "catalog"
                          ? "bg-emerald-650 text-white shadow-xs border border-white/10"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      Meja AI Akmal
                    </button>

                    <button
                      onClick={() => setActiveTab("my-loans")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeTab === "my-loans"
                          ? "bg-emerald-650 text-white shadow-xs border border-white/10"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      Tempahan & Pinjaman ({loans.length})
                    </button>

                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "catalog" ? (
                    
                    /* TAB 1: MEJA AI AKMAL */
                    <motion.div
                      key="ai-desk-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl flex flex-col h-[580px] overflow-hidden justify-between"
                    >
                      {/* AI Status header */}
                      <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white/10 rounded-lg relative">
                            <Bot className="w-5 h-5 text-emerald-300" />
                            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-450 border border-emerald-900" />
                          </div>
                          <div>
                            <span className="font-display font-semibold text-xs tracking-wide block">Rakan AI Akmal</span>
                            <span className="text-[10px] text-emerald-250 font-mono tracking-wider font-bold">PUSAT SUMBER PPZU DESK</span>
                          </div>
                        </div>

                        {/* Reset button inside desk */}
                        <button
                          onClick={() => setChatMessages([
                            {
                              id: "ai-reset",
                              sender: "ai",
                              text: "Sesi perbualan telah dimulakan semula. Sila tanyakan sebarang Garis Panduan Perancangan (GPP), Rancangan Tempatan (RTD) atau cadangan dokumen perancangan PPZU!",
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                          ])}
                          className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-[10px] font-bold rounded-md flex items-center space-x-1"
                          title="Mulakan Semula Chat"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Padam Rekod</span>
                        </button>
                      </div>

                      {/* Info warning regarding connected books if selected */}
                      {selectedBook && (
                        <div className="bg-emerald-950/40 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-emerald-300">
                          <span className="font-semibold truncate">
                            Konteks dipaut: "{selectedBook.title}"
                          </span>
                          <button
                            onClick={() => setSelectedBook(null)}
                            className="p-1 text-emerald-400 hover:text-emerald-250"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Live message scroll list */}
                      <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-slate-955 bg-black/20">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div className="max-w-[85%] flex items-start space-x-2">
                              {msg.sender === "ai" && (
                                <div className="w-6.5 h-6.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0 text-xs font-bold border border-emerald-500/30">
                                  Ak
                                </div>
                              )}
                              <div>
                                <div className={`p-3 rounded-2xl text-xs space-y-1.5 ${
                                  msg.sender === "user"
                                    ? "bg-emerald-600 text-white rounded-tr-none border border-emerald-555/20"
                                    : "bg-white/10 backdrop-blur-md text-white rounded-tl-none border border-white/15 shadow-xl"
                                }`}>
                                  <p className="leading-relaxed select-text whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                <span className="text-[9px] text-white/40 px-1 mt-0.5 block font-mono">
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {isAiLoading && (
                          <div className="flex justify-start">
                            <div className="flex items-start space-x-2">
                              <div className="w-6.5 h-6.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0 text-xs font-bold animate-pulse border border-emerald-500/20">
                                ...
                              </div>
                              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl rounded-tl-none border border-white/10 text-xs text-white/50 italic flex items-center space-x-1.5 animate-pulse">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                                <span>Akmal sedang melacak pangkalan ilmu...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Quick click triggers for convenience - No tech larp keys, pure functional assistance */}
                      <div className="p-3 bg-white/5 border-t border-white/10">
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 mb-1.5 px-1">
                          Cadangan Rujukan Pantas:
                        </div>
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                          <button
                            onClick={() => triggerPresetAiQuestion("Bagaimanakah piawaian anjakan bangunan untuk perumahan dalam GPP Jilid 1?")}
                            className="bg-white/5 hover:bg-white/10 text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 transition-all whitespace-nowrap cursor-pointer"
                          >
                            Piawaian GPP Perumahan
                          </button>
                          <button
                            onClick={() => triggerPresetAiQuestion("Bagaimanakah unjuran strategi spatial utama dalam Rancangan Struktur Negeri Perak 2040?")}
                            className="bg-white/5 hover:bg-white/10 text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 transition-all whitespace-nowrap cursor-pointer"
                          >
                            RSN Perak 2040
                          </button>
                          <button
                            onClick={() => triggerPresetAiQuestion("Apakah perincian zon sempadan Bukit Kayu Hitam dalam RTD Kubang Pasu?")}
                            className="bg-white/5 hover:bg-white/10 text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 transition-all whitespace-nowrap cursor-pointer"
                          >
                            Zon Bukit Kayu Hitam
                          </button>
                        </div>
                      </div>

                      {/* Chat text panel form */}
                      <div className="p-4 bg-white/5 border-t border-white/10">
                        <div className="flex items-center space-x-2">
                          <input
                            id="ai-user-query"
                            type="text"
                            value={userChatInput}
                            onChange={(e) => setUserChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendChatMessage();
                            }}
                            placeholder="Tanya Akmal (Cth: Piawaian anjakan bangunan)..."
                            className="flex-1 px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/50 focus:outline-none text-white placeholder:text-white/40"
                          />
                          <button
                            onClick={() => handleSendChatMessage()}
                            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center justify-center border border-white/10"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  ) : (
                    
                    /* TAB 2: ACTIVE RESERVATION & DEPOSIT LOANS */
                    <motion.div
                      key="loans-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      
                      {/* Active submitted slips preview list */}
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3 border-white/10">
                          <div>
                            <h3 className="font-display font-bold text-sm text-white">Log Tempahan Tempatan</h3>
                            <p className="text-[11px] text-white/60">Buku pengesahan sementara oleh kakitangan PPZU</p>
                          </div>
                          
                          <span className="text-xs bg-white/10 text-emerald-300 font-bold px-2 py-0.5 rounded border border-white/10">
                            {loans.length} Fail
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                          {loans.map((request) => (
                            <div
                              key={request.id}
                              className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex flex-col justify-between space-y-2.5 relative overflow-hidden"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{request.id}</div>
                                  <h4 className="font-display font-bold text-xs text-white line-clamp-1 mt-0.5">
                                    {request.bookTitle}
                                  </h4>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  request.status === "Diluluskan"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    : request.status === "Diproses"
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-white/10 text-white/70 border-white/10"
                                }`}>
                                  {request.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 border-t border-white/10 pt-2">
                                <div>
                                  <span className="block text-[8px] uppercase tracking-wider text-white/40">Peminjam</span>
                                  <span className="font-semibold text-white/80">{request.staffName} ({request.staffId})</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] uppercase tracking-wider text-white/40">Tempoh Matang</span>
                                  <span className="font-semibold text-white/80">{request.loanDate} hingga {request.returnDate}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </div>
            )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER BANNER / INFO SECTION */}
      <footer className="bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 py-12 rounded-3xl mt-16 shadow-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            <div className="flex items-center space-x-3 text-white">
              <div className="p-2 bg-emerald-600 border border-white/15 text-white rounded-lg">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-lg">PPZU Digital Library (PDL)</span>
                <p className="text-xs text-white/60">Sistem Pintar Analitis & Sumber Rujukan Pemajuan PPZU, PLANMalaysia</p>
              </div>
            </div>

            <div className="text-xs text-center md:text-right text-white/50 space-y-1">
              <p>© 2026 Pejabat Projek Zon Utara (PPZU), PLANMalaysia. Hak Cipta Terpelihara.</p>
              <p>Portal Rujukan Pintar Dokumen Spatial & Perancangan Zon Utara.</p>
            </div>

          </div>
        </div>
      </footer>

      {/* BOOK DETAIL BOTTOM DRAWER OR MODAL WINDOW */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBook(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full border border-white/15 shadow-2xl relative"
            >
              
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-all cursor-pointer z-10 border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12">
                
                {/* Book stylized visual cover column */}
                <div className={`md:col-span-5 bg-gradient-to-br ${selectedBook.coverColor} p-6 text-white flex flex-col justify-between min-h-[300px] md:min-h-full`}>
                  <div className="bg-white/10 self-start text-[10px] font-mono tracking-widest font-bold px-2 py-0.5 rounded-md">
                    {selectedBook.id}
                  </div>
                  
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200">{selectedBook.category}</span>
                    <h3 className="font-display font-bold text-lg mt-1 tracking-wide leading-tight">{selectedBook.title}</h3>
                    <p className="text-xs text-slate-300 mt-2 font-mono">oleh {selectedBook.author}</p>
                  </div>

                  <div className="border-t border-white/20 pt-3 text-[11px] text-emerald-100 flex items-center justify-between">
                    <span>Tahun {selectedBook.publishYear}</span>
                    <span>{selectedBook.pages} M/S</span>
                  </div>
                </div>

                {/* Right side data & checkout panel */}
                <div className="md:col-span-7 p-6 sm:p-8 space-y-5 bg-slate-900 text-white">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white leading-snug">Ringkasan Info Rujukan</h3>
                    <p className="text-[10px] text-white/55 mt-0.5">Kategori: {selectedBook.category}</p>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed text-justify">
                    {selectedBook.description}
                  </p>

                  <div className="py-2.5 px-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/40">Format Akses:</span>
                      <span className="font-bold text-white/80">{selectedBook.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Lokasi Fizikal:</span>
                      <span className="font-semibold text-white/80">{selectedBook.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Status Semasa:</span>
                      <span className="font-bold text-emerald-400">{selectedBook.status}</span>
                    </div>
                  </div>

                  {/* Dynamic buttons depending on book access format */}
                  <div className="flex flex-col space-y-2 pt-2">
                    {selectedBook.chapters && selectedBook.chapters.length > 0 ? (
                      <button
                        onClick={() => openReader(selectedBook)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md border border-white/10 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Baca Versi Digital Serta-Merta</span>
                      </button>
                    ) : (
                      <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 flex items-start space-x-2 text-xs text-amber-300 mb-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          <strong>Catatan Perpustakaan:</strong> Dokumen rujukan ini adalah edisi fizikal sahaja. Sila minta bantuan pembantu pintar Akmal di "Meja Sembang AI Akmal" untuk mendapatkan sinopsis AI mampan atau analisis ringkas.
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setIsReservingBook(selectedBook);
                          setSelectedBook(null);
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-white/10 text-center cursor-pointer"
                      >
                        Tempah Fizikal (Loan)
                      </button>

                      <button
                        onClick={() => {
                          triggerPresetAiQuestion(`Adakah anda mempunyai sebarang ringkasan atau ulasan terperinci untuk buku "${selectedBook.title}"?`);
                          setSelectedBook(null);
                        }}
                        className="px-4.5 bg-white/5 hover:bg-emerald-500/10 text-emerald-300 border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Tanya AI Akmal"
                      >
                        <Bot className="w-4 h-4" />
                        <span>Tanya AI Akmal</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESERVATION SYSTEM WINDOW */}
      <AnimatePresence>
        {isReservingBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsReservingBook(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/10 shadow-2xl relative space-y-5 text-white"
            >
              
              <div className="flex justify-between items-center border-b pb-3 border-white/10">
                <div className="flex items-center space-x-2 text-emerald-300">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <span className="font-display font-bold text-base text-white">Borang Tempahan Buku PPZU</span>
                </div>
                <button
                  onClick={() => setIsReservingBook(null)}
                  className="p-1 text-white/40 hover:text-white/70 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <p className="text-xs text-white/50">
                  Anda sedang menempah buku fizikal:
                </p>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white font-bold mt-1.5 flex items-center space-x-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${isReservingBook.coverColor}`} />
                  <span>{isReservingBook.title}</span>
                </div>
              </div>

              <form onSubmit={executeReservation} className="space-y-4 text-xs">
                
                <div className="space-y-1">
                  <label className="block font-semibold text-white/70">Nama Penuh Kakitangan:</label>
                  <input
                    type="text"
                    required
                    value={reservationName}
                    onChange={(e) => setReservationName(e.target.value)}
                    placeholder="Contoh: Muhammad Naim bin Osman"
                    className="w-full p-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:bg-white/15 focus:outline-emerald-500 focus:outline bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-white/70">ID Kakitangan (PPZU-XXX):</label>
                    <input
                      type="text"
                      required
                      value={reservationId}
                      onChange={(e) => setReservationId(e.target.value)}
                      placeholder="PPZU-001"
                      className="w-full p-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:bg-white/15 focus:outline-emerald-500 focus:outline bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-white/70">Bahagian / Unit Pekerja:</label>
                    <select
                      value={reservationDept}
                      onChange={(e) => setReservationDept(e.target.value)}
                      className="w-full p-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:bg-white/15 focus:outline-emerald-500 focus:outline bg-white"
                    >
                      <option value="Bahagian Perancangan Fizikal">Bahagian Perancangan Fizikal</option>
                      <option value="Unit Geoinformasi & GIS">Unit Geoinformasi & GIS</option>
                      <option value="Sektor Rancangan Pemajuan">Sektor Rancangan Pemajuan</option>
                      <option value="Unit Pentadbiran & Kewangan">Unit Pentadbiran & Kewangan</option>
                      <option value="Bahagian Penyelidikan & Dasar">Bahagian Penyelidikan & Dasar</option>
                      <option value="Unit Sempadan & Geoportals">Unit Sempadan & Geoportals</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-white/70">Tempoh Pinjaman Diluluskan:</label>
                  <select
                    value={reservationDays}
                    onChange={(e) => setReservationDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:bg-white/15 focus:outline-emerald-500 focus:outline bg-white"
                  >
                    <option value={7}>7 Hari (Siri Rujukan Pantas)</option>
                    <option value={14}>14 Hari (Standard Kakitangan)</option>
                    <option value={21}>21 Hari (Kajian Khas/Eksklusif)</option>
                  </select>
                </div>

                <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                  *Dengan menempah, anda bersetuju mematuhi Peraturan Keselamatan Dokumen Pusat Sumber PPZU serta memulangkannya sebelum tempoh matang bagi memelihara hak kakitangan perancang mampan sivil yang lain.
                </p>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReservingBook(null)}
                    className="flex-1 py-3 text-xs bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-white font-bold transition-all cursor-pointer text-center"
                  >
                    Batal Tempahan
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-3 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all cursor-pointer text-center shadow-lg border border-white/10"
                  >
                    Serah & Jana Slip
                  </button>
                </div>

              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE GENERATED BOOKING SLIP DRAWER (SO Kakitangan gets real tangible output!) */}
      <AnimatePresence>
        {recentSlip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRecentSlip(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/15 shadow-2xl relative space-y-6 text-white"
            >
              
              <div className="absolute top-4 right-4 text-white/40 hover:text-white/70">
                <button onClick={() => setRecentSlip(null)} className="p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Header representing PPZU library slip card */}
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-300 rounded-full mb-1 border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-display font-medium text-white text-lg">Tempahan Berjaya Didisun!</h3>
                <p className="text-xs text-white/50">Sila bawa slip ini ke Kaunter Pusat Sumber PPZU</p>
              </div>

              {/* Real high precision checkout design with barcodes representation */}
              <div className="p-5 bg-white/5 border border-dashed border-white/20 rounded-xl space-y-4 font-mono text-xs text-white/85 relative">
                
                <div className="flex justify-between items-center border-b pb-2 border-white/10 border-dashed animate-pulse">
                  <span className="font-bold text-[10px] tracking-wider text-emerald-400">SLIP TEMPAHAN SEMENTARA</span>
                  <span className="font-mono text-[9px] text-white/50">{recentSlip.id}</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="block text-[8px] text-emerald-400 font-sans font-bold">TAJUK BUKU</span>
                    <span className="font-bold block text-white leading-tight">{recentSlip.bookTitle}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-emerald-400 font-sans font-bold">ID BUKU</span>
                    <span className="font-semibold block text-white/90">{recentSlip.bookId}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-emerald-400 font-sans font-bold">PEMINJAM KAKITANGAN</span>
                    <span className="font-semibold text-white/90 block">{recentSlip.staffName} ({recentSlip.staffId})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[8px] text-emerald-400 font-sans font-bold">TARIKH TEMPAH</span>
                      <span className="font-semibold text-white/90">{recentSlip.loanDate}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-emerald-400 font-sans font-bold">TARIKH PULANG</span>
                      <span className="font-semibold text-white/90">{recentSlip.returnDate}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated barcode for administrative aesthetic completeness */}
                <div className="pt-3 flex flex-col items-center justify-center space-y-1">
                  <div className="h-9 w-full bg-white text-slate-900 border border-white/20 flex items-center justify-center px-1 font-sans text-xs rounded-lg shadow-inner">
                    <span className="font-mono text-[10px] tracking-widest font-black uppercase text-center text-slate-900">{recentSlip.id}</span>
                  </div>
                  <span className="text-[8px] text-white/30 font-sans tracking-tight">KOD BAR IDENTITI PERKHIDMATAN</span>
                </div>

              </div>

              <div className="text-center space-y-2">
                <button
                  onClick={() => {
                    setRecentSlip(null);
                    setActiveTab("my-loans");
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition-all border border-white/10 cursor-pointer shadow-md"
                >
                  OK, Masukkan ke Log Saya
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE ACCESS WORKSPACE & IDENTITY PROFILE SWITCHER */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsAuthModalOpen(false); setLoginError(""); }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-left"
            >
              
              {/* Left sidebar: Quick Switch User panel */}
              <div className="w-full md:w-5/12 bg-slate-950/70 p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Direktori Sesi</h4>
                    <p className="text-[10px] text-white/50">Klik profil sedia ada di bawah untuk bertukar peranan secara simulasi terus.</p>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {staffList.map((staf) => (
                      <button
                        key={staf.id}
                        onClick={() => handleSwitchUser(staf.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          currentUser.id === staf.id
                            ? "bg-emerald-500/10 border-emerald-500 text-white"
                            : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="text-[11px] font-bold block truncate leading-none">{staf.name}</span>
                          <span className="text-[9px] text-white/40 font-mono block mt-1">{staf.id} • {staf.department}</span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          staf.isAdmin ? "bg-amber-500/20 text-amber-300 border border-amber-500/20" : staf.status === "Mohon_Admin" ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white/60"
                        }`}>
                          {staf.isAdmin ? "Admin" : staf.status === "Mohon_Admin" ? "Pending" : "Staf"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-1 text-[10px] text-white/40">
                  <p>💡 <strong>Tekan nama profil di atas</strong> untuk menguji kedua-dua mod applet (Standard Staf & Pentadbir Utama Naim Osman).</p>
                </div>
              </div>

              {/* Right Form: Register Staf Baru / Sign In */}
              <div className="w-full md:w-7/12 p-6 flex flex-col justify-between space-y-6">
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-white text-base">Daftar Sesi Kakitangan PPZU</h3>
                    <p className="text-xs text-white/50">Daftarkan ID Kakitangan baharu atau mohon tugasan Admin.</p>
                  </div>
                  <button
                    onClick={() => { setIsAuthModalOpen(false); setLoginError(""); }}
                    className="p-1 hover:bg-white/5 text-white/40 hover:text-white/85 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleRegisterStaffAndLogin} className="space-y-4 flex-1">
                  
                  {loginError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80 block">ID Kakitangan PPZU *</label>
                    <input
                      type="text"
                      required
                      value={newStaffId}
                      onChange={(e) => { setNewStaffId(e.target.value); setLoginError(""); }}
                      placeholder="Contoh: PPZU-002, PPZU-789..."
                      className="w-full text-xs p-2.5 bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl text-white placeholder:text-white/30 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80 block">Nama Penuh Kakitangan *</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => { setNewStaffName(e.target.value); setLoginError(""); }}
                      placeholder="Contoh: Khairul Azmi Bin Ahmad"
                      className="w-full text-xs p-2.5 bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl text-white placeholder:text-white/30 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/80 block">Sektor / Bahagian Jabatan</label>
                    <select
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-900 border border-white/10 focus:border-emerald-500 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Bahagian Perancangan Fizikal">Bahagian Perancangan Fizikal</option>
                      <option value="Unit Geoinformasi & GIS">Unit Geoinformasi & GIS</option>
                      <option value="Sektor Rancangan Pemajuan">Sektor Rancangan Pemajuan</option>
                      <option value="Unit Pentadbiran & Kewangan">Unit Pentadbiran & Kewangan</option>
                      <option value="Bahagian Penyelidikan & Dasar">Bahagian Penyelidikan & Dasar</option>
                    </select>
                  </div>

                  {/* Application check box */}
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestAdminOnSignUp}
                        onChange={(e) => setRequestAdminOnSignUp(e.target.checked)}
                        className="mt-1 rounded border-white/20 focus:ring-emerald-500 text-emerald-500 cursor-pointer"
                      />
                      <div className="leading-tight">
                        <span className="text-xs font-bold text-amber-300 block">Mohon Pelantikan Pentadbir (Admin Mode)</span>
                        <span className="text-[9.5px] text-white/50 block mt-0.5">
                          Tandakan checkbox ini untuk memohon tugasan pentadbir Pusat Sumber (Dihadkan 3 Slot Pentadbir).
                        </span>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-1.5 uppercase font-mono tracking-wider"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Daftar & Masuk Portal</span>
                  </button>
                </form>

                <div className="text-[10px] text-white/40 text-center border-t border-white/5 pt-3">
                  Portal Rujukan Katalog & Arkib Perancangan Bandar PPZU, PLANMalaysia.
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
