import { BlogPosts } from "@/components/posts";

export const metadata = {
  title: "Writings",
  description:
    "Essays by Chris Cardoza on building, abstractions, art, physics, and how to make the future real.",
};

export default function Page() {
  return (
    <section className="writing-page">
      <h1 className="section-heading">writings</h1>
      <BlogPosts />
    </section>
  );
}
