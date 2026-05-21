const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Начинаю наполнение базы книг...');

  const books = [
    {
      title: "Алиса в Стране Чудес",
      author: "Льюис Кэрролл",
      description: "Классическая сказка о девочке, попавшей в воображаемый мир.",
      coverUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/images/cover.jpg",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/package.opf",
      tags: ["Классика", "RU", "Сказка"],
      category: "Литература"
    },
    {
      title: "Moby Dick",
      author: "Herman Melville",
      description: "The epic tale of Captain Ahab's obsession with the white whale.",
      coverUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/images/9780316000000.jpg",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf",
      tags: ["Classic", "EN", "Adventure"],
      category: "Academic"
    },
    {
      title: "Преступление и наказание",
      author: "Федор Достоевский",
      description: "Глубокий психологический роман о морали и искуплении.",
      coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/package.opf",
      tags: ["Драма", "RU", "Философия"],
      category: "Литература"
    },
    {
      title: "Основы алгоритмов",
      author: "Томас Кормен",
      description: "Фундаментальный учебник по компьютерным наукам.",
      coverUrl: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf",
      tags: ["IT", "RU", "Учебник"],
      category: "Наука"
    },
    {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      description: "A story of wealth, love, and the American Dream in the 1920s.",
      coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/package.opf",
      tags: ["Classic", "EN", "Drama"],
      category: "Literature"
    },
    {
      title: "Sherlock Holmes",
      author: "Arthur Conan Doyle",
      description: "The adventures of the world's most famous detective.",
      coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf",
      tags: ["Mystery", "EN", "Detective"],
      category: "Fiction"
    },
    {
      title: "O'zbekiston Tarixi",
      author: "Академия Наук",
      description: "Полная история Узбекистана с древнейших времен.",
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/package.opf",
      tags: ["Tarix", "UZ", "Academic"],
      category: "История"
    },
    {
      title: "Мастер и Маргарита",
      author: "Михаил Булгаков",
      description: "Мистический роман о любви и дьяволе в Москве.",
      coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf",
      tags: ["RU", "Мистика", "Классика"],
      category: "Литература"
    },
    {
      title: "Clean Code",
      author: "Robert C. Martin",
      description: "A handbook of agile software craftsmanship.",
      coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/alice/OPS/package.opf",
      tags: ["Programming", "EN", "Engineering"],
      category: "Science"
    },
    {
      title: "1984",
      author: "George Orwell",
      description: "A dystopian social science fiction novel.",
      coverUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=600&auto=format&fit=crop",
      fileUrl: "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf",
      tags: ["Dystopia", "EN", "Political"],
      category: "Fiction"
    }
  ];

  for (const book of books) {
    await prisma.book.create({
      data: book
    });
  }

  console.log('База успешно наполнена 10 книгами!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
