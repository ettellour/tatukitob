'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// epub.js требует window, загружаем только на клиенте
const EpubReader = dynamic(() => import('@/components/reader/EpubReader'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-3.5rem)] bg-[#FFFDF7] dark:bg-[#001B36] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-t-transparent border-[#004B87] dark:border-white/40 rounded-full animate-spin" />
        <span className="text-sm font-serif italic opacity-50">Загрузка читалки...</span>
      </div>
    </div>
  )
});

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const id = searchParams.get('id');

  if (!url || !id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-6">
        <p className="text-2xl font-serif opacity-70">Книга не найдена</p>
        <button 
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-[#004B87] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#003562] transition-colors"
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  return <EpubReader bookUrl={url} bookId={id} />;
}

export default function ReaderPage() {
  return (
    <div className="h-screen flex flex-col bg-[#FFFDF7] dark:bg-[#001B36] overflow-hidden">
      {/* Минималистичный тулбар */}
      <header className="h-14 flex items-center px-6 justify-between shrink-0 border-b border-black/10 dark:border-white/10 z-20">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 -ml-2 opacity-50 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-serif font-bold text-lg tracking-tighter text-[#004B87] dark:text-[#FDFCF8]">
            UniLibrary.
          </span>
        </div>
      </header>

      {/* Читалка — занимает весь оставшийся экран */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-t-transparent border-[#004B87] rounded-full animate-spin" />
          </div>
        }>
          <ReaderContent />
        </Suspense>
      </main>
    </div>
  );
}
