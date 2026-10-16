export type ReadingStatus = "reading" | "read";

export type Book = {
  id: string;
  title: string;
  author: string;
  status: ReadingStatus;
};

// Add books here as the shelf grows. Covers are plain title boxes for now.
export const books: Book[] = [
  {
    id: "alexander-hamilton",
    title: "Alexander Hamilton",
    author: "Ron Chernow",
    status: "reading",
  },
];
