import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBrainMcpServer } from "./server";

const server = createBrainMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);
