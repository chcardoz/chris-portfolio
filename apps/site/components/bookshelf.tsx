"use client";

import { useState } from "react";
import { books, type ReadingStatus } from "@/lib/books";

type Filter = "all" | ReadingStatus;
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "all books" },
  { value: "reading", label: "reading" },
  { value: "read", label: "read" },
];

export function Bookshelf() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const visibleBooks = books.filter(
    (book) => filter === "all" || book.status === filter,
  );

  return (
    <section className="library-page" aria-labelledby="library-title">
      <aside className="library-sidebar">
        <h1 id="library-title">my library</h1>
        <p className="library-intro">A few books, past & present.</p>
        <fieldset className="library-filters">
          <legend className="sr-only">Filter books by reading status</legend>
          {filters.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setSelectedBook(null);
              }}
            >
              <span>{label}</span>
              <span className="filter-count">
                {
                  books.filter(
                    (book) => value === "all" || book.status === value,
                  ).length
                }
              </span>
            </button>
          ))}
        </fieldset>
        <p className="shelf-count">
          {books.length} volume{books.length === 1 ? "" : "s"} & counting
        </p>
        <p className="shelf-note">
          An unfinished shelf.
          <br />
          Always room for another.
        </p>
      </aside>
      <div className="shelf-content" aria-live="polite">
        {visibleBooks.length > 0 ? (
          <div className="bookshelf">
            {visibleBooks.map((book) => (
              <div
                className="book-tile"
                key={book.id}
                data-selected={selectedBook === book.id || undefined}
              >
                <button
                  type="button"
                  className="book-card"
                  aria-label={`${book.title} by ${book.author}`}
                  aria-expanded={selectedBook === book.id}
                  aria-controls={`details-${book.id}`}
                  onClick={() =>
                    setSelectedBook(selectedBook === book.id ? null : book.id)
                  }
                >
                  <span className="book-cover">
                    <span className="book-cover-author">{book.author}</span>
                    <span className="book-cover-title">{book.title}</span>
                    <span className="book-cover-status">
                      {book.status === "reading" ? "currently reading" : "read"}
                    </span>
                  </span>
                </button>
                <div id={`details-${book.id}`} className="book-caption">
                  <h2>{book.title}</h2>
                  <p>{book.author}</p>
                  <span>
                    {book.status === "reading" ? "Currently reading" : "Read"}
                  </span>
                </div>
              </div>
            ))}
            {[0, 1, 2].map((slot) => (
              <div
                className="book-tile empty-book"
                aria-hidden="true"
                key={`empty-${slot}`}
              >
                <div className="empty-book-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-shelf">Nothing on this shelf yet.</p>
        )}
      </div>
    </section>
  );
}
