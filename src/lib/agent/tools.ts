import { RunnableLambda } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { reviveLangchainMessages } from "../langchain/reviveLangchainMessages";
import { lookupDomainRdapJson } from "../recon/rdapDomainSummary";
import type { VanguardStateType } from "./state";

const TAVILY_API_URL = "https://api.tavily.com/search";

export const reconTool = tool(
  async ({ query }: { query: string }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("Missing TAVILY_API_KEY");
    }

    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tavily request failed (${response.status}): ${text}`);
    }

    const result = await response.json();
    return JSON.stringify(result);
  },
  {
    name: "tavily_search",
    description: "Search public web intelligence for reconnaissance.",
    schema: z.object({
      query: z.string().min(1),
    }),
  },
);

export const domainWhoisTool = tool(
  async ({ domain }: { domain: string }) => {
    return lookupDomainRdapJson(domain);
  },
  {
    name: "domain_whois",
    description:
      "Fetch domain registration intelligence (registrar, status, and key events) using RDAP.",
    schema: z.object({
      domain: z.string().min(1),
    }),
  },
);

export const vanguardTools = [reconTool, domainWhoisTool];

const toolNodeInner = new ToolNode(vanguardTools);

/**
 * LangGraph's ToolNode rejects `state.messages` when Redis/checkpoint left plain
 * JSON objects (no `_getType`). Revive to BaseMessage instances before invoke.
 */
export const toolNode = RunnableLambda.from(async (state: VanguardStateType) => {
  const messages = reviveLangchainMessages(state.messages as unknown[]);
  return toolNodeInner.invoke({ messages });
}).withConfig({ runName: "tools" });
