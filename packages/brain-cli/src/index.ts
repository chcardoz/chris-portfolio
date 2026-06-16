import { Command } from "commander";
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
import { createCliContext } from "./context";

const program = new Command();

program
  .name("brain")
  .description("Control plane for the Florence content brain")
  .option("--root <dir>", "workspace root");

program
  .command("validate")
  .description("validate and parse content")
  .action(() => {
    const context = getContext();
    const documents = readBrainDocuments(context.config);
    const graph = buildBrainGraph(documents);

    console.log(
      JSON.stringify(
        {
          ok: graph.unresolvedLinks.length === 0,
          documents: documents.length,
          links: graph.links.length,
          unresolvedLinks: graph.unresolvedLinks.map((link) => ({
            from: link.fromDocumentId,
            target: link.target,
            kind: link.kind,
          })),
        },
        null,
        2,
      ),
    );

    if (graph.unresolvedLinks.length > 0) {
      process.exitCode = 1;
    }
  });

program
  .command("reindex")
  .description("rebuild the generated sqlite index")
  .action(() => {
    const context = getContext();
    const result = reindexBrainDatabase(context.config, context.dbPath);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("list")
  .description("list indexed documents")
  .action(() => {
    const context = getContext();
    const documents = listIndexedDocuments(context.dbPath);
    console.log(
      documents
        .map(
          (document) => `${document.id}\t${document.status}\t${document.title}`,
        )
        .join("\n"),
    );
  });

program
  .command("search")
  .argument("<query>")
  .option("-l, --limit <number>", "maximum result count", "10")
  .description("search indexed documents")
  .action((query: string, options: { limit: string }) => {
    const context = getContext();
    const results = searchIndexedDocuments(
      context.dbPath,
      query,
      Number(options.limit),
    );
    console.log(JSON.stringify(results, null, 2));
  });

program
  .command("read")
  .argument("<id-or-slug>")
  .description("read an indexed document")
  .action((idOrSlug: string) => {
    const context = getContext();
    const document = getIndexedDocument(context.dbPath, idOrSlug);

    if (!document) {
      console.error(`Document not found: ${idOrSlug}`);
      process.exitCode = 1;
      return;
    }

    console.log(document.rawContent);
  });

program
  .command("backlinks")
  .argument("<id-or-slug>")
  .description("list backlinks for an indexed document")
  .action((idOrSlug: string) => {
    const context = getContext();
    console.log(
      JSON.stringify(listBacklinks(context.dbPath, idOrSlug), null, 2),
    );
  });

program
  .command("orphans")
  .description("list unresolved local links")
  .action(() => {
    const context = getContext();
    console.log(JSON.stringify(listUnresolvedLinks(context.dbPath), null, 2));
  });

program
  .command("raw")
  .argument("<collection>")
  .argument("<slug>")
  .description("read a raw source document from content")
  .action((collection: string, slug: string) => {
    const context = getContext();
    console.log(readDocumentRaw(context.config, collection, slug));
  });

program.parse();

function getContext() {
  const options = program.opts<{ root?: string }>();
  return createCliContext(options.root);
}
