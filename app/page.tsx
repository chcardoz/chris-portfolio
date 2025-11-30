import { BlogPosts } from '@/components/posts'
import { VisitorsGlobe } from '@/components/visitors-globe'

export default function Page() {
  return (
    <section>
      <div className="mb-8 space-y-6">
        <VisitorsGlobe />
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tighter">Chris Cardoza</h1>
          <p className="text-neutral-800 dark:text-neutral-200">
            {`I am an optimist who is obsessed with the future. And I believe the best way to predict the future is to invent it. Here you will find my work, what my process is to get ideas, to build them, and to tell the world the story of how I got there.`}
          </p>
        </div>
      </div>
      <div className="my-10">
        <BlogPosts />
      </div>
    </section>
  )
}
