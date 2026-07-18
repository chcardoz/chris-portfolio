import { BlogPosts } from "@/components/posts";

export const metadata = {
  title: "Blog",
  description:
    "Essays by Chris Cardoza on building, abstractions, art, physics, and how to make the future real.",
};

export default function Page() {
  return (
    <section className="stagger-scope">
      <h1 className="stagger-in font-semibold text-2xl mb-8">
        Some of my writing
      </h1>
      <div className="stagger-in" style={{ animationDelay: "150ms" }}>
        <BlogPosts />
      </div>
    </section>
  );
}
