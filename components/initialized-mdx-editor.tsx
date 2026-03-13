'use client'

import type { ForwardedRef } from 'react'
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  frontmatterPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertCodeBlock,
  InsertFrontmatter,
  InsertThematicBreak,
  DiffSourceToggleWrapper,
  Separator,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Injected via <style> tag so we can use !important to beat the editor's own CSS module declarations.
// CSS custom properties set on a parent don't override the same property set on a child,
// and the editor sets its variables on its own root element, so we must target that element directly.
const themeCSS = `
  .mdxeditor-themed-override.mdxeditor {
    --basePageBg: #f0f0f0 !important;
    --baseBase: #f0f0f0 !important;
    --baseBgSubtle: #e8e8e8 !important;
    --baseBg: #d4d4d4 !important;
    --baseBgHover: #bfbfbf !important;
    --baseBgActive: #b0b0b0 !important;
    --baseLine: #a3a3a3 !important;
    --baseBorder: #a3a3a3 !important;
    --baseBorderHover: #888888 !important;
    --baseSolid: #6b6b6b !important;
    --baseSolidHover: #525252 !important;
    --baseText: #404040 !important;
    --baseTextContrast: #1a1a1a !important;
    border: none !important;
  }
  .mdxeditor-themed-override.mdxeditor [role='toolbar'] {
    flex-wrap: wrap;
  }
  @media (prefers-color-scheme: dark) {
    .mdxeditor-themed-override.mdxeditor {
      --basePageBg: #141414 !important;
      --baseBase: #1a1a1a !important;
      --baseBgSubtle: #222222 !important;
      --baseBg: #2a2a2a !important;
      --baseBgHover: #3d3d3d !important;
      --baseBgActive: #4a4a4a !important;
      --baseLine: #4a4a4a !important;
      --baseBorder: #4a4a4a !important;
      --baseBorderHover: #5a5a5a !important;
      --baseSolid: #888888 !important;
      --baseSolidHover: #a0a0a0 !important;
      --baseText: #999999 !important;
      --baseTextContrast: #e0e0e0 !important;
    }
  }
`

export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <MDXEditor
        className="mdxeditor-themed-override"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          frontmatterPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'tsx' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              ts: 'TypeScript',
              tsx: 'TSX',
              js: 'JavaScript',
              jsx: 'JSX',
              css: 'CSS',
              bash: 'Bash',
              '': 'Plain Text',
            },
          }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertCodeBlock />
                <InsertFrontmatter />
                <InsertThematicBreak />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
        {...props}
        ref={editorRef}
      />
    </>
  )
}
