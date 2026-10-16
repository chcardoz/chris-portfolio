import { Bookshelf } from "@/components/bookshelf";

export const metadata = {
  title: "Library",
  description: "What Chris Cardoza is reading and has read.",
};

export default function LibraryPage() {
  return <Bookshelf />;
}
