"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Upload, Book as BookIcon, CheckCircle2, Loader2, Edit2, Trash2, X, Search } from 'lucide-react';
import Link from 'next/link';
import { translations, Language } from '@/lib/i18n';

interface Book {
  id: string;
  title: string;
  titleUz?: string | null;
  titleRu?: string | null;
  author: string;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string;
  tags: string[];
  category: string | null;
}

export default function AdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [lang, setLang] = useState<Language>('uz');
  const [search, setSearch] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [titleUz, setTitleUz] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('RU, Academic');
  const [coverUrl, setCoverUrl] = useState('');

  const t = translations[lang];

  useEffect(() => {
    fetchBooks();
  }, [search]);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`/api/books${search ? `?q=${search}` : ''}`);
      const data = await res.json();
      if (data && Array.isArray(data.books)) {
        setBooks(data.books);
      } else if (Array.isArray(data)) {
        setBooks(data);
      } else {
        setBooks([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFile(null);
    setTitleUz('');
    setTitleRu('');
    setAuthor('');
    setDescription('');
    setTags('RU, Academic');
    setCoverUrl('');
    setStatus(null);
  };

  const startEdit = (book: Book) => {
    setEditingId(book.id);
    setTitleUz(book.titleUz || '');
    setTitleRu(book.titleRu || '');
    setAuthor(book.author);
    setDescription(book.description || '');
    setTags(book.tags.join(', '));
    setCoverUrl(book.coverUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'uz' ? 'O\'chirishni xohlaysizmi?' : 'Вы уверены, что хотите удалить?')) return;
    
    try {
      const res = await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks(books.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setStatus(null);

    try {
      let finalFileUrl = books.find(b => b.id === editingId)?.fileUrl || '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('books')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('books')
          .getPublicUrl(fileName);
        
        finalFileUrl = publicUrl;
      }

      const payload = {
        title: titleRu || titleUz, // Fallback
        titleUz,
        titleRu,
        author,
        description,
        fileUrl: finalFileUrl,
        coverUrl,
        tags: tags.split(',').map(t => t.trim()),
        category: 'Literature'
      };

      const res = await fetch('/api/books', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload)
      });

      if (!res.ok) throw new Error('DB Error');

      setStatus({ type: 'success', msg: editingId ? 'Обновлено!' : t.success });
      resetForm();
      fetchBooks();
    } catch (error: any) {
      setStatus({ type: 'error', msg: t.error });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] dark:bg-[#0A0A0A] selection:bg-[#1EB53A] selection:text-white">
      {/* Header */}
      <nav className="border-b border-black/5 dark:border-white/5 py-6 px-8 sticky top-0 bg-[#FDFCF8]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity">
            <ArrowLeft size={14} /> {lang === 'uz' ? 'Bosh sahifa' : 'На главную'}
          </Link>
          
          <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-1 rounded-full">
            <button onClick={() => setLang('uz')} className={`px-3 py-1 rounded-full text-[10px] font-bold ${lang === 'uz' ? 'bg-white dark:bg-black' : 'opacity-40'}`}>UZ</button>
            <button onClick={() => setLang('ru')} className={`px-3 py-1 rounded-full text-[10px] font-bold ${lang === 'ru' ? 'bg-white dark:bg-black shadow-sm text-[#009EDB]' : 'opacity-40'}`}>RU</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* LEFT: Form */}
          <div className="lg:col-span-5">
            <div className="mb-12">
              <h1 className="font-serif text-4xl font-medium mb-4 tracking-tight">
                {editingId ? (lang === 'uz' ? 'Tahrirlash' : 'Редактирование') : t.uploadTitle}
              </h1>
              {editingId && (
                <button onClick={resetForm} className="text-xs uppercase tracking-widest font-bold text-red-500 flex items-center gap-1">
                  <X size={12} /> {lang === 'uz' ? 'Bekor qilish' : 'Отменить'}
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.bookTitle} (UZ)</label>
              <input type="text" value={titleUz} onChange={e => setTitleUz(e.target.value)} className="bg-transparent border-b border-black/10 dark:border-white/10 py-2 outline-none focus:border-[#009EDB] font-serif text-xl" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.bookTitle} (RU)</label>
              <input type="text" value={titleRu} onChange={e => setTitleRu(e.target.value)} className="bg-transparent border-b border-black/10 dark:border-white/10 py-2 outline-none focus:border-[#009EDB] font-serif text-xl" required />
            </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.bookAuthor}</label>
                <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="bg-transparent border-b border-black/10 dark:border-white/10 py-2 outline-none focus:border-[#009EDB] font-serif text-xl" required />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">{lang === 'uz' ? 'Muqova URL' : 'URL обложки'}</label>
                <input type="text" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." className="bg-transparent border-b border-black/10 dark:border-white/10 py-2 outline-none focus:border-[#009EDB] text-sm" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">EPUB {editingId ? `(${lang === 'uz' ? 'O\'zgartirish' : 'Заменить'})` : ''}</label>
                <input type="file" accept=".epub" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs opacity-60" />
              </div>

              <button disabled={isUploading} className="bg-[#004B87] dark:bg-white text-white dark:text-black py-4 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <BookIcon size={16} />}
                {editingId ? (lang === 'uz' ? 'Saqlash' : 'Сохранить') : t.addBtn}
              </button>

              {status && <div className={`p-4 rounded text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{status.msg}</div>}
            </form>
          </div>

          {/* RIGHT: List */}
          <div className="lg:col-span-7 border-l border-black/5 dark:border-white/5 pl-0 lg:pl-16">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-[10px] uppercase tracking-widest font-bold opacity-40">{lang === 'uz' ? 'Mavjud kitoblar' : 'Существующие книги'}</h2>
               <div className="relative">
                 <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="..." className="bg-black/5 dark:bg-white/5 rounded-full px-4 py-1 text-xs outline-none" />
                 <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
               </div>
            </div>

            <div className="flex flex-col gap-4">
              {books.map(book => (
                <div key={book.id} className="group flex items-center gap-4 bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-[#009EDB]/30 transition-all">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} className="w-12 h-16 object-cover rounded shadow-md bg-black/10" alt="" />
                  ) : (
                    <div className="w-12 h-16 bg-black/5 dark:bg-white/5 rounded flex items-center justify-center">
                      <BookIcon size={16} className="opacity-20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold truncate">
                      {lang === 'uz' ? (book.titleUz || book.title) : (book.titleRu || book.title)}
                    </h3>
                    <p className="text-[10px] opacity-40 truncate">{book.author}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(book)} className="p-2 hover:bg-[#009EDB]/10 text-[#009EDB] rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(book.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {loading && <Loader2 className="animate-spin mx-auto opacity-20" />}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
