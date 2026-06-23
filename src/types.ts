export type BookType = "Digital" | "Fizikal" | "Kedua-duanya";

export type BookStatus = "Tersedia" | "Dipinjam" | "Rujukan Sahaja";

export interface BookChapter {
  id: string;
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  type: BookType;
  status: BookStatus;
  location: string;
  coverColor: string; // Tailwinds background-gradient configuration for elegant mock covers
  description: string;
  publishYear: number;
  pages: number;
  chapters?: BookChapter[];
}

export interface LoanRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  staffName: string;
  staffId: string;
  department: string;
  loanDate: string;
  returnDate: string;
  status: "Diproses" | "Diluluskan" | "Ditolak" | "Selesai";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface StaffUser {
  id: string; // Staff ID (e.g., PPZU-101)
  name: string;
  department: string;
  isAdmin: boolean;
  status: "Aktif_Staf" | "Mohon_Admin" | "Disahkan_Admin";
}

