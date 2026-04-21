import { approvalMissingContextBinding, MissionRequestSchema } from "./missionRequest";
import { newRequestId, vanguardChatLog, withRequestIdHeaders } from "./telemetry";
import { getThreadPrefix, isRedTeamMode } from "../../../src/lib/runtime/redteam";
import { getVectorRuntimeConfig } from "../../../src/lib/runtime/vectorClient";
import { computeApprovalContextHash } from "../../../src/lib/approval/hash";
import type { ApprovalContextV1 } from "../../../src/lib/approval/types";
import { handleApprovalRequest } from "./approvalFlow";
import { handleMissionRequest } from "./missionFlow";

export const runtime = "edge";

const vectorEnv = getVectorRuntimeConfig();

export async function POST(req: Request) {
  const reqId = newRequestId(req);
  const actorId = req.headers.get("x-actor-id") ?? undefined;
  const actorRole = req.headers.get("x-actor-role") ?? undefined;

  try {
    const body = await req.json();
    const parsed = MissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("MissionRequestSchema error:", parsed.error.flatten());
      vanguardChatLog({
        reqId,
        phase: "parse",
        status: 400,
        message: "MissionRequestSchema validation failed",
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(new Response("Invalid mission payload", { status: 400 }), reqId);
    }

    const {
      messages,
      target,
      thread_id,
      isApproval,
      approved,
      tool_call_id,
      approval_id,
      approval_context_hash,
      approval_context,
    } = parsed.data;

    if (isApproval && !thread_id) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        message: "Missing thread_id for approval",
        isApproval: true,
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(
        new Response("Missing thread_id for approval", { status: 400 }),
        reqId,
      );
    }

    if (isApproval && typeof approved !== "boolean") {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        threadId: thread_id,
        message: "Missing approved boolean",
        isApproval: true,
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(
        new Response("Missing approved boolean for approval request", {
          status: 400,
        }),
        reqId,
      );
    }

    if (approvalMissingContextBinding(parsed.data)) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        threadId: thread_id,
        message: "Missing approval context binding fields",
        isApproval: true,
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(
        new Response("Missing approval context binding fields", {
          status: 400,
        }),
        reqId,
      );
    }

    const threadId = thread_id ?? `${getThreadPrefix()}-${Date.now()}`;
    const missionId = threadId;

    // Fast-fail tampered approval payloads before touching external dependencies.
    if (isApproval && approval_context && typeof approval_context === "object") {
      try {
        const bodyContext = approval_context as ApprovalContextV1;
        const computedBodyHash = await computeApprovalContextHash(bodyContext);
        if (computedBodyHash !== approval_context_hash) {
          vanguardChatLog({
            reqId,
            phase: "approval",
            status: 409,
            threadId,
            message: "Approval context hash mismatch (early body check)",
            isApproval: true,
            actorId,
            actorRole,
          });
          return withRequestIdHeaders(
            new Response("Approval mismatch — context hash is invalid", {
              status: 409,
            }),
            reqId,
          );
        }
      } catch {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval context hash computation failed (early body check)",
          isApproval: true,
          actorId,
          actorRole,
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — context payload is invalid", {
            status: 409,
          }),
          reqId,
        );
      }
    }

    const config = {
      configurable: { thread_id: threadId },
      version: "v2" as const,
      metadata: {
        thread_id: threadId,
        mission_id: missionId,
        request_id: reqId,
        is_approval: !!isApproval,
        vector_namespace: vectorEnv.namespace,
      },
      tags: [
        "vanguard-agent",
        isApproval ? "vanguard-agent-approval" : "vanguard-agent-recon",
        ...(isRedTeamMode() ? ["vanguard-agent-redteam"] : []),
      ],
    };

    if (isApproval) {
      return handleApprovalRequest({
        req,
        reqId,
        actorId,
        actorRole,
        threadId,
        missionId,
        config,
        approved,
        tool_call_id,
        approval_id,
        approval_context_hash,
        approval_context,
        target,
      });
    }

    return handleMissionRequest({
      req,
      reqId,
      actorId,
      actorRole,
      threadId,
      missionId,
      config,
      messages,
      target,
    });
  } catch (error) {
    console.error("Satellite Uplink Error:", error);
    vanguardChatLog({
      reqId,
      phase: "error",
      status: 500,
      message: error instanceof Error ? error.message : "unknown_error",
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Mission Aborted: Uplink Failure", { status: 500 }),
      reqId,
    );
  }
}
