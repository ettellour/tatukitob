import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Получение всех книг с поиском
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 12;

  try {
    const whereClause = query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { titleUz: { contains: query, mode: 'insensitive' } },
        { titleRu: { contains: query, mode: 'insensitive' } },
      ]
    } : {};

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.book.count({ where: whereClause })
    ]);

    return NextResponse.json({
      books,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalBooks: total
    });
  } catch (error) {
    console.error('[GET BOOKS ERROR]:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

// POST: Создание новой книги
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const book = await prisma.book.create({
      data: json
    });
    return NextResponse.json(book);
  } catch (error) {
    console.error('[POST BOOK ERROR]:', error);
    return NextResponse.json({ error: 'Failed to create book', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT: Обновление книги
export async function PUT(request: Request) {
  try {
    const json = await request.json();
    console.log('[PUT BOOK DATA]:', json);
    const { id, ...data } = json;
    
    if (!id) throw new Error('Book ID is missing');

    const book = await prisma.book.update({
      where: { id },
      data: data
    });
    return NextResponse.json(book);
  } catch (error) {
    console.error('[PUT BOOK ERROR]:', error);
    return NextResponse.json({ error: 'Failed to update book', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE: Удаление книги
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.book.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE BOOK ERROR]:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
