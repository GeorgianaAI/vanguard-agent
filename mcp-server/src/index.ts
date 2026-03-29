import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { lookupDomainRdapJson } from "../../src/lib/recon/rdapDomainSummary.js";

const server = new McpServer({
  name: "vanguard-mcp",
  version: "0.1.0",
});

server.tool(
  "vanguard_ping",
  "Health check for the Vanguard MCP server (no side effects).",
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: true,
          server: "vanguard-mcp",
          version: "0.1.0",
        }),
      },
    ],
  }),
);

server.tool(
  "domain_whois",
  "Public RDAP domain summary (registrar, status, key events)—same source as the Vanguard LangGraph domain_whois tool.",
  { domain: z.string().min(1) },
  async ({ domain }) => {
    const text = await lookupDomainRdapJson(domain);
    return { content: [{ type: "text", text }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
