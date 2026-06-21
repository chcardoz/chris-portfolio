export { reindexBrainDatabase } from "./indexer";
export { createBrainSchema, openBrainDatabase } from "./schema";
export {
  getIndexedDocument,
  listBacklinks,
  listIndexedDocuments,
  listUnresolvedLinks,
  searchIndexedDocuments,
} from "./queries";
export type { ReindexResult } from "./indexer";
export type { IndexedDocument, IndexedLink, SearchResult } from "./queries";
