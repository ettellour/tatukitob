'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Настраиваем воркер через unpkg для Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function PdfReader({ bookUrl }: { bookUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка документа
  useEffect(() => {
    setIsLoading(true);
    let isCancelled = false;
    const loadingTask = pdfjsLib.getDocument(bookUrl);
    
    loadingTask.promise.then((doc) => {
      if (isCancelled) {
        doc.destroy();
        return;
      }
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    }).catch((err) => {
      if (!isCancelled && err.name !== 'WorkerException') {
        console.error('PDF Load Error:', err);
      }
    });
    
    return () => {
      isCancelled = true;
      // В React 18 Strict Mode не используем loadingTask.destroy(), 
      // так как это убивает глобальный воркер при двойном рендере
    };
  }, [bookUrl]);

  // Рендер страницы
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    
    setIsLoading(true);
    
    let renderTask: pdfjsLib.RenderTask;
    let isCancelled = false;

    pdfDoc.getPage(currentPage).then((page) => {
      if (isCancelled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Вычисляем масштаб, чтобы страница влезла в контейнер
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current!.clientWidth - 40; // отступы
      const containerHeight = containerRef.current!.clientHeight - 40;
      
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      renderTask = page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        canvas: canvas,
      } as any);

      renderTask.promise.then(() => {
        if (!isCancelled) setIsLoading(false);
      }).catch((err) => {
        if (err.name !== 'RenderingCancelledException') {
          console.error(err);
        }
      });
    });

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage]);

  const prev = () => setCurrentPage(p => Math.max(1, p - 1));
  const next = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  
  // Клавиатура
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-[#E5E7EB] dark:bg-[#111827]">
      <div 
        ref={containerRef} 
        className="w-full flex-1 overflow-hidden flex items-center justify-center p-5"
      >
        <canvas 
          ref={canvasRef} 
          className="shadow-xl bg-white max-w-full max-h-full" 
        />
      </div>
      
      <div className="shrink-0 flex items-center justify-between px-6 py-3 text-xs font-bold uppercase border-t bg-[#FFFDF7] dark:bg-[#001B36] border-black/10 dark:border-white/10 text-black/40 dark:text-white/60">
        <button onClick={prev} disabled={currentPage <= 1} className="px-4 py-2 hover:opacity-100 opacity-60 disabled:opacity-20">← Назад</button>
        
        <div className="flex items-center gap-4 font-serif normal-case text-sm">
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={currentPage || ''}
              min={1}
              max={totalPages || 1}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setCurrentPage(Math.max(1, Math.min(totalPages, val)));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-12 text-center bg-transparent border-b border-black/30 dark:border-white/30 text-black dark:text-white outline-none focus:border-[#009EDB]"
            />
            <span className="opacity-60">из {totalPages > 0 ? totalPages : '...'}</span>
          </div>
        </div>

        <button onClick={next} disabled={currentPage >= totalPages} className="px-4 py-2 hover:opacity-100 opacity-60 disabled:opacity-20">Вперед →</button>
      </div>

      <div className="h-0.5 w-full bg-black/5 dark:bg-white/5">
        <div className="h-full bg-[#009EDB] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/10 dark:bg-black/40">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[#004B87] dark:border-white/40" />
        </div>
      )}
    </div>
  );
}
