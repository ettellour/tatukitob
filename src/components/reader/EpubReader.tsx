'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import ePub from 'epubjs';
import { get } from 'idb-keyval';

export default function EpubReader({ bookUrl, bookId }: { bookUrl: string, bookId: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const isReady = useRef(false);
  const isNavigating = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Определяем цвета на основе темы
  const isDark = resolvedTheme === 'dark';
  const bgColor = isDark ? '#001B36' : '#FFFDF7';
  const textColor = isDark ? '#F8F9FA' : '#1A1A1A';

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const next = useCallback(() => {
    if (!isReady.current || !renditionRef.current || isNavigating.current) return;
    isNavigating.current = true;
    renditionRef.current.next().finally(() => {
      setTimeout(() => { isNavigating.current = false; }, 300);
    });
  }, []);

  const prev = useCallback(() => {
    if (!isReady.current || !renditionRef.current || isNavigating.current) return;
    isNavigating.current = true;
    renditionRef.current.prev().finally(() => {
      setTimeout(() => { isNavigating.current = false; }, 300);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  useEffect(() => {
    if (!mounted || !viewerRef.current || !bookUrl) return;

    if (cleanupRef.current) cleanupRef.current();
    viewerRef.current.innerHTML = '';
    isReady.current = false;
    setIsLoading(true);

    let destroyed = false;
    let resizeObserver: ResizeObserver | null = null;

    const initBook = async (w: number, h: number) => {
      if (destroyed || !viewerRef.current) return;

      let bookData: string | ArrayBuffer = bookUrl;
      try {
        const offlineBlob = await get<Blob>(`book-${bookId}`);
        if (offlineBlob) {
          bookData = await offlineBlob.arrayBuffer();
          console.log('Книга загружена из офлайн хранилища');
        }
      } catch (err) {
        console.error('Ошибка чтения из IndexedDB:', err);
      }

      if (destroyed) return;

      const book = ePub(bookData as any);
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: w,
        height: h,
        flow: 'paginated',
        manager: 'default',
        allowScriptedContent: true,
      });

      renditionRef.current = rendition;

      // Применяем стили при загрузке каждой главы
      rendition.hooks.content.register((contents: any) => {
        contents.addStyles({
          'body': { 
            'color': `${textColor} !important`, 
            'background': `${bgColor} !important`,
            'padding': '40px 60px !important', // Отступы внутри текста
            'font-family': "var(--font-serif), Georgia, serif !important"
          },
          'p, span, div, h1, h2, h3, h4, h5, h6': { 'color': 'inherit !important' },
          'img': { 'max-width': '100% !important', 'height': 'auto !important' }
        });
      });

      // Обновление прогресса
      rendition.on('relocated', (location: any) => {
        if (destroyed) return;
        if (book.locations && book.locations.length() > 0) {
          const idx = book.locations.locationFromCfi(location.start.cfi);
          setCurrentPage(typeof idx === 'number' ? idx + 1 : 1);
        } else {
          setCurrentPage(Math.round((location.start?.percentage || 0) * 100));
        }
      });

      rendition.display().then(() => {
        if (destroyed) return;
        isReady.current = true;
        setIsLoading(false);
      });

      book.ready.then(() => {
        if (destroyed) return;
        book.locations.generate(1024).then(() => {
          if (!destroyed && book.locations.length()) {
            setTotalPages(book.locations.length());
            // Форсируем обновление счетчика
            const loc = rendition.currentLocation();
            if (loc) {
              const idx = book.locations.locationFromCfi((loc as any).start?.cfi);
              setCurrentPage(typeof idx === 'number' ? idx + 1 : 1);
            }
          }
        });
      });

      // Защищенный ResizeObserver
      resizeObserver = new ResizeObserver(() => {
        if (!destroyed && renditionRef.current && viewerRef.current) {
          const rw = viewerRef.current.offsetWidth;
          const rh = viewerRef.current.offsetHeight;
          if (rw > 0 && rh > 0 && typeof renditionRef.current.resize === 'function') {
            try { renditionRef.current.resize(rw, rh); } catch(e) {}
          }
        }
      });
      resizeObserver.observe(viewerRef.current);

      cleanupRef.current = () => {
        destroyed = true;
        isReady.current = false;
        resizeObserver?.disconnect();
        try { rendition.destroy(); book.destroy(); } catch(e) {}
      };
    };

    const startObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        startObserver.disconnect();
        initBook(entry.contentRect.width, entry.contentRect.height);
      }
    });
    startObserver.observe(viewerRef.current);

    return () => {
      destroyed = true;
      startObserver.disconnect();
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [mounted, bookUrl, bookId, isDark, textColor, bgColor]);

  if (!mounted) return null;

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className={`relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden ${isDark ? 'bg-[#001B36]' : 'bg-[#FFFDF7]'}`}>
      <div ref={viewerRef} className="w-full flex-1 overflow-hidden" style={{ minHeight: 0 }} />
      
      <div className={`shrink-0 flex items-center justify-between px-6 py-3 text-xs font-bold uppercase border-t ${
        isDark ? 'bg-[#001B36] border-white/10 text-white/60' : 'bg-[#FFFDF7] border-black/10 text-black/40'
      }`}>
        <button onClick={prev} className="px-4 py-2 hover:opacity-100 opacity-60">← Назад</button>
        <span className="font-serif normal-case text-sm">
          {totalPages > 0 ? `${currentPage} из ${totalPages}` : `${currentPage}%`}
        </span>
        <button onClick={next} className="px-4 py-2 hover:opacity-100 opacity-60">Вперед →</button>
      </div>

      <div className="h-0.5 w-full bg-black/5 dark:bg-white/5">
        <div className="h-full bg-[#009EDB] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-inherit">
          <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-white/40' : 'border-[#004B87]'}`} />
        </div>
      )}
    </div>
  );
}
