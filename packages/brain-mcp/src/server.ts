import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildBrainGraph,
  readBrainDocuments,
  readDocumentRaw,
} from "@florence/brain-core";
import {
  getIndexedDocument,
  listBacklinks,
  listIndexedDocuments,
  listUnresolvedLinks,
  reindexBrainDatabase,
  searchIndexedDocuments,
} from "@florence/brain-db";
import { createMcpContext } from "./context";

export function createBrainMcpServer() {
  const server = new McpServer({
    name: "florence-brain",
    version: "0.1.0",
  });

  server.registerTool(
    "validate",
    {
      title: "Validate brain content",
      description: "Parse content and report unresolved local links.",
    },
    async () => {
      const context = createMcpContext();
      const documents = readBrainDocuments(context.config);
      const graph = buildBrainGraph(documents);

      return jsonToolResult({
        ok: graph.unresolvedLinks.length === 0,
        documents: documents.length,
        links: graph.links.length,
        unresolvedLinks: graph.unresolvedLinks,
      });
    },
  );

  server.registerTool(
    "reindex",
    {
      title: "Rebuild brain index",
      description: "Rebuild the generated SQLite index from content.",
    },
    async () => {
      const context = createMcpContext();
      return jsonToolResult(
        reindexBrainDatabase(context.config, context.dbPath),
      );
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "List indexed documents",
      description: "List documents currently present in the generated index.",
    },
    async () => {
      const context = createMcpContext();
      return jsonToolResult(listIndexedDocuments(context.dbPath));
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search indexed documents",
      description: "Run SQLite FTS search against the generated index.",
      inputSchema: {
        query: z.string().min(1),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async ({ query, limit }) => {
      const context = createMcpContext();
      return jsonToolResult(
        searchIndexedDocuments(context.dbPath, query, limit),
      );
    },
  );

  server.registerTool(
    "read_document",
    {
      title: "Read indexed document",
      description: "Read a document from the generated index by ID or slug.",
      inputSchema: {
        idOrSlug: z.string().min(1),
      },
    },
    async ({ idOrSlug }) => {
      const context = createMcpContext();
      const document = getIndexedDocument(context.dbPath, idOrSlug);

      if (!document) {
        return textToolResult(`Document not found: ${idOrSlug}`, true);
      }

      return textToolResult(document.rawContent);
    },
  );

  server.registerTool(
    "read_raw",
    {
      title: "Read raw source document",
      description:
        "Read a raw source file from content by collection and slug.",
      inputSchema: {
        collection: z.string().min(1),
        slug: z.string().min(1),
      },
    },
    async ({ collection, slug }) => {
      const context = createMcpContext();

      try {
        return textToolResult(
          readDocumentRaw(context.config, collection, slug),
        );
      } catch (error) {
        return textToolResult(errorMessage(error), true);
      }
    },
  );

  server.registerTool(
    "backlinks",
    {
      title: "List backlinks",
      description: "List backlinks for an indexed document by ID or slug.",
      inputSchema: {
        idOrSlug: z.string().min(1),
      },
    },
    async ({ idOrSlug }) => {
      const context = createMcpContext();
      return jsonToolResult(listBacklinks(context.dbPath, idOrSlug));
    },
  );

  server.registerTool(
    "unresolved_links",
    {
      title: "List unresolved links",
      description: "List unresolved local links from the generated index.",
    },
    async () => {
      const context = createMcpContext();
      return jsonToolResult(listUnresolvedLinks(context.dbPath));
    },
  );

  return server;
}

function jsonToolResult(value: unknown) {
  return textToolResult(JSON.stringify(value, null, 2));
}

function textToolResult(text: string, isError = false) {
  return {
    isError,
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
