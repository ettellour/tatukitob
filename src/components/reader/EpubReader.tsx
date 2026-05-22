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

  // Процент книги, который занимает один экран. Замеряется один раз и фиксируется.
  const screenPercentRef = useRef<number | null>(null);
  const lastPageRef = useRef<number>(1);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const isDark = resolvedTheme === 'dark';
  const bgColor = isDark ? '#001B36' : '#FFFDF7';
  const textColor = isDark ? '#F8F9FA' : '#1A1A1A';

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => { setMounted(true); }, []);

  const next = useCallback(() => {
    if (!isReady.current || !renditionRef.current || isNavigating.current) return;
    isNavigating.current = true;
    renditionRef.current.next().finally(() => {
      setTimeout(() => { isNavigating.current = false; }, 150);
    });
  }, []);

  const prev = useCallback(() => {
    if (!isReady.current || !renditionRef.current || isNavigating.current) return;
    isNavigating.current = true;
    renditionRef.current.prev().finally(() => {
      setTimeout(() => { isNavigating.current = false; }, 150);
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

  // Применяем стили при смене темы "на лету"
  useEffect(() => {
    if (renditionRef.current && isReady.current) {
      try {
        renditionRef.current.getContents().forEach((content: any) => {
          content.addStyles({
            'color': `${textColor} !important`, 
            'background': `${bgColor} !important`
          });
        });
      } catch (e) {}
    }
  }, [textColor, bgColor]);

  // Применяем изменение размера шрифта и пересчитываем страницы
  useEffect(() => {
    if (!renditionRef.current || !isReady.current) return;
    
    
    // Сбрасываем замер
    screenPercentRef.current = null;
    try { renditionRef.current.themes.fontSize(`${fontSize}%`); } catch(e) {}

    // Принудительно перерисовываем текущую страницу, чтобы вызвать relocated с новыми размерами
    const timer = setTimeout(() => {
      try {
        const loc = renditionRef.current?.currentLocation();
        if (loc?.start?.cfi) {
          renditionRef.current?.display(loc.start.cfi);
        }
      } catch(e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [fontSize]);

  useEffect(() => {
    if (!mounted || !viewerRef.current || !bookUrl) return;

    if (cleanupRef.current) cleanupRef.current();
    viewerRef.current.innerHTML = '';
    isReady.current = false;
    screenPercentRef.current = null;
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
        spread: 'none',
        allowScriptedContent: true,
      });

      renditionRef.current = rendition;

      // Применяем стили при загрузке каждой главы
      rendition.hooks.content.register((contents: any) => {
        contents.addStyles({
          'body': { 
            'color': `${textColor} !important`, 
            'background': `${bgColor} !important`,
            'padding': '40px 60px !important',
            'font-family': "var(--font-serif), Georgia, serif !important"
          },
          'p, span, div, h1, h2, h3, h4, h5, h6': { 'color': 'inherit !important' },
          'img': { 'max-width': '100% !important', 'height': 'auto !important' }
        });
      });

      // Единственный источник правды для счётчика страниц
      rendition.on('relocated', (location: any) => {
        if (destroyed) return;

        const startP = location.start?.percentage ?? 0;
        const endP = location.end?.percentage ?? startP;

        // Замеряем размер экрана (в процентах от книги) ОДИН РАЗ
        if (screenPercentRef.current === null) {
          let sp = endP - startP;
          // Защита: на первой/последней/пустой странице бывают кривые значения
          if (sp <= 0.001 || sp >= 0.5) {
            sp = 0.05; // Временное значение, обновится при следующей нормальной странице
            // НЕ фиксируем — оставляем null чтобы пересчитать на следующей странице
          } else {
            screenPercentRef.current = sp;
          }
        }

        const sp = screenPercentRef.current || 0.05;
        const total = Math.max(1, Math.round(1 / sp));
        let current = Math.round(startP / sp) + 1;
        current = Math.max(1, Math.min(total, current));

        // Защита от "мёртвых страниц": если page не изменился, не дергаем setState
        if (current !== lastPageRef.current || total !== totalPages) {
          lastPageRef.current = current;
          setTotalPages(total);
          setCurrentPage(current);
        }
      });

      rendition.display().then(() => {
        if (destroyed) return;
        isReady.current = true;
      });

      book.ready.then(() => {
        if (destroyed) return;
        book.locations.generate(1024).then(() => {
          if (destroyed) return;
          setIsLoading(false);
        }).catch(() => {
          if (!destroyed) setIsLoading(false);
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

  const goToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages || !bookRef.current?.locations) return;
    const sp = screenPercentRef.current || (1 / totalPages);
    const targetP = Math.min(0.999, Math.max(0, (pageNum - 1) * sp));
    const cfi = bookRef.current.locations.cfiFromPercentage(targetP);
    if (cfi) renditionRef.current?.display(cfi);
  };

  return (
    <div className={`relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden ${isDark ? 'bg-[#001B36]' : 'bg-[#FFFDF7]'}`}>
      <div ref={viewerRef} className="w-full flex-1 overflow-hidden" style={{ minHeight: 0 }} />
      
      <div className={`shrink-0 flex items-center justify-between px-6 py-3 text-xs font-bold uppercase border-t ${
        isDark ? 'bg-[#001B36] border-white/10 text-white/60' : 'bg-[#FFFDF7] border-black/10 text-black/40'
      }`}>
        <button onClick={prev} className="px-4 py-2 hover:opacity-100 opacity-60">← Назад</button>
        
        <div className="flex items-center gap-4 font-serif normal-case text-sm">
          <button onClick={() => setFontSize(f => Math.max(50, f - 10))} className="hover:opacity-100 opacity-60 px-2 text-lg">A-</button>
          
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={currentPage || ''}
              min={1}
              max={totalPages || 100}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setCurrentPage(val);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) goToPage(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className={`w-12 text-center bg-transparent border-b ${isDark ? 'border-white/30 text-white' : 'border-black/30 text-black'} outline-none focus:border-[#009EDB]`}
            />
            <span className="opacity-60">из {totalPages > 0 ? totalPages : '...'}</span>
          </div>

          <button onClick={() => setFontSize(f => Math.min(200, f + 10))} className="hover:opacity-100 opacity-60 px-2 text-lg">A+</button>
        </div>

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
