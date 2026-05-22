'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { translations, Language } from '@/lib/i18n';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  useEffect(() => setMounted(true), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const t = translations[lang];

  // reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDownload = async (e: React.MouseEvent, bookTitle: string, fileUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // В будущем, если добавите PDF, тут можно брать расширение из URL
      a.download = `${bookTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Ошибка при скачивании книги');
    }
  };

  // Загрузка книг из БД
  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`);
        const data = await res.json();
        if (data && Array.isArray(data.books)) {
          setBooks(data.books);
          setTotalPages(data.totalPages || 1);
        } else if (Array.isArray(data)) {
          setBooks(data);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("Failed to load books:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchBooks, 300); // Debounce поиска
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#009EDB] selection:text-white dark:selection:bg-[#1EB53A] dark:selection:text-white">
      {/* Editorial Nav */}
      <nav className="w-full border-b border-black/10 dark:border-white/10 z-20 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-serif font-bold text-2xl tracking-tighter text-[#004B87] dark:text-[#FDFCF8]">{t.title}.</span>
          </div>
          <div className="flex items-center gap-6 text-xs uppercase tracking-widest font-semibold text-[#004B87] dark:text-[#FDFCF8]">
            <button 
                onClick={() => setLang('uz')}
                className={`${lang === 'uz' ? 'opacity-100 font-bold' : 'opacity-40'} hover:opacity-100 transition-opacity`}
            >
                UZ
            </button>
            <button 
                onClick={() => setLang('ru')}
                className={`${lang === 'ru' ? 'opacity-100 font-bold dark:text-[#009EDB]' : 'opacity-40'} hover:opacity-100 transition-opacity`}
            >
                RU
            </button>
            <div className="w-px h-4 bg-black/20 dark:bg-white/20 mx-2"></div>
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="opacity-60 hover:opacity-100 transition-opacity flex items-center"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">

        {/* Hero Section */}
        <header className="mb-24 flex flex-col md:flex-row justify-between items-start gap-12 w-full relative">
          <div className="flex flex-col items-start text-left max-w-3xl z-10 w-full md:w-2/3">
            <div className="inline-block bg-[#004B87] text-white dark:bg-[#FFFFFF] dark:text-[#004B87] px-6 pt-6 pb-4 md:px-12 md:pt-10 md:pb-8 mb-10 transform -rotate-1 hover:rotate-0 transition-transform duration-500 shadow-2xl border-b-4 border-[#1EB53A]">
              <h1 className="font-serif text-5xl md:text-7xl lg:text-[100px] font-medium tracking-tight leading-[0.9] text-left">
                {t.title}
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl opacity-70 max-w-xl font-serif italic mb-12 leading-relaxed">
              {t.subtitle}
            </p>
            
            <div className="w-full max-w-lg relative group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder} 
                className="w-full bg-transparent border-b-[3px] border-black/10 dark:border-white/10 pb-4 text-left text-xl outline-none focus:border-[#009EDB] dark:focus:border-[#1EB53A] transition-colors placeholder:text-black/30 dark:placeholder:text-white/30 font-serif"
              />
              <span className="absolute right-0 bottom-4 text-[10px] font-bold uppercase tracking-widest opacity-30">
                {isLoading ? t.loading : `${books.length} ${t.found}`}
              </span>
            </div>
          </div>

          <div className="w-full md:w-1/3 flex justify-center md:justify-end shrink-0 pt-8 md:pt-0 pointer-events-none opacity-95">
            <img 
              src="/W73eM8T-hn5cLRoa_rQWKshn3eUutXvm.png" 
              alt="University Logo" 
              className="w-64 h-64 md:w-80 md:h-80 lg:w-[400px] lg:h-[400px] object-contain drop-shadow-[0_20px_50px_rgba(0,75,135,0.15)]" 
            />
          </div>
        </header>

        {/* Catalog */}
        <section>
          <div className="flex items-baseline justify-between border-b border-black/10 dark:border-white/10 pb-4 mb-12">
            <h2 className="text-[11px] md:text-xs uppercase tracking-widest font-bold">
              {searchQuery ? t.results : t.catalog}
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-black/5 dark:bg-white/5 mb-4" />
                  <div className="h-4 w-2/3 bg-black/5 dark:bg-white/5 mb-2" />
                  <div className="h-4 w-1/2 bg-black/5 dark:bg-white/5" />
                </div>
              ))}
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 md:gap-x-12 gap-y-16">
              {books.map((book) => (
                <div key={book.id} className="flex flex-col group relative">
                  <Link href={`/reader?url=${encodeURIComponent(book.fileUrl)}&id=${book.id}`} className="block relative aspect-[3/4] mb-6 bg-black/5 dark:bg-white/5 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                    <img
                      src={book.coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white text-xs font-bold tracking-widest uppercase border border-white/40 px-6 py-3 bg-[#1EB53A]/90 backdrop-blur-md">
                        {t.read}
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-col">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {book.tags?.map((tag: string) => (
                        <span key={tag} className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl mb-1 leading-snug">
                      {lang === 'uz' ? (book.titleUz || book.title) : (book.titleRu || book.title)}
                    </h3>
                    <p className="text-sm opacity-60 font-medium mb-3">{book.author}</p>
                    <button 
                      onClick={(e) => handleDownload(e, book.title, book.fileUrl)}
                      className="mt-4 w-full py-2 border border-[#004B87]/30 dark:border-white/30 text-[#004B87] dark:text-[#FDFCF8] text-[10px] uppercase font-bold tracking-widest hover:bg-[#004B87] hover:text-white dark:hover:bg-white dark:hover:text-[#001B36] transition-colors text-center"
                    >
                      Скачать файл
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center opacity-40 italic font-serif text-xl">
              {t.noBooks}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-16 text-xs font-bold uppercase tracking-widest text-[#004B87] dark:text-[#FDFCF8]">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="disabled:opacity-20 opacity-60 hover:opacity-100 transition-opacity"
              >
                Назад
              </button>
              <span className="opacity-40">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="disabled:opacity-20 opacity-60 hover:opacity-100 transition-opacity"
              >
                Вперед
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="w-full border-t border-black/10 dark:border-white/10 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex justify-between text-[10px] uppercase tracking-widest font-bold opacity-40">
          <div>&copy; 2026 UniLibrary</div>
          <div className="flex gap-8">
            <Link href="#">{t.about}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
