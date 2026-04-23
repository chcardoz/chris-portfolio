import { BlogPosts } from "@/components/posts";

export const metadata = {
  title: "Blog",
  description:
    "Essays by Chris Cardoza on building, abstractions, art, physics, and how to make the future real.",
};

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">
        Some of my writing
      </h1>
      <BlogPosts />
    </section>
  );
}
