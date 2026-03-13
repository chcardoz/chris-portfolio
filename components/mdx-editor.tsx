'use client'

import { forwardRef, type ReactNode, useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor'

const Editor = dynamic(() => import('./initialized-mdx-editor'), {
  ssr: false,
  loading: () => (
    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-8 text-neutral-500 text-center">
      Loading editor...
    </div>
  ),
})

const ForwardRefEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />
)
ForwardRefEditor.displayName = 'ForwardRefEditor'

export function BlogPostEditor({
  slug,
  initialContent,
  children,
}: {
  slug: string
  initialContent: string
  children: ReactNode
}) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const save = useCallback(async () => {
    const content = editorRef.current?.getMarkdown()
    if (!content) return

    setSaving(true)
    try {
      const res = await fetch('/api/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setLastSaved(new Date())
      setHasChanges(false)
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSaving(false)
    }
  }, [slug])

  if (!editing) {
    return (
      <>
        <button
          onClick={() => setEditing(true)}
          className="edit-post-button mb-4 px-3 py-1.5 text-xs font-mono rounded-md transition-opacity hover:opacity-80"
        >
          Edit this post
        </button>
        {children}
      </>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-neutral-400">
          {lastSaved
            ? `Last saved ${lastSaved.toLocaleTimeString()}`
            : 'Unsaved'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs font-mono rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className="px-3 py-1.5 text-xs font-mono rounded-md bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="mdx-editor-wrapper">
        <ForwardRefEditor
          ref={editorRef}
          markdown={initialContent}
          onChange={() => setHasChanges(true)}
          contentEditableClassName="prose dark:prose-invert max-w-none min-h-[300px] p-4"
        />
      </div>
    </div>
  )
}
