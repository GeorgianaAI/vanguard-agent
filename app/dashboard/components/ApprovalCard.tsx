import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { APPROVAL_TITLE } from "../lib/constants";
import type { ToolActionHandler, ToolPart } from "../lib/types";
import { getToolName } from "ai";
import { getApprovalPolicyLabel } from "@/src/lib/approval/policy";
import { getApprovalPayloadFromPart } from "../lib/chatHelpers";
import type { ApprovalContextV1 } from "@/src/lib/approval/types";
import { AgentBadge, type AgentType } from "./AgentBadge";

type ApprovalCardProps = {
  part: ToolPart;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
  disabled?: boolean;
  previousApprovalContext?: ApprovalContextV1 | null;
};

function requestedNodeToAgentType(node?: ApprovalContextV1["requested_by_node"]): AgentType {
  if (node === "supervisor") return "SUPERVISOR";
  if (node === "scout") return "SCOUT";
  return "AUDITOR";
}

export function ApprovalCard({
  part,
  onAuthorize,
  onAbort,
  disabled = false,
  previousApprovalContext = null,
}: ApprovalCardProps) {
  const payload = getApprovalPayloadFromPart(part);
  const context = payload.approvalContext;
  const toolName = context?.tool.name ?? getToolName(part);
  const toolArgs = context?.tool.args_display ?? {};
  const policyLabel = getApprovalPolicyLabel(toolName);
  const sideEffectsLabel = context?.side_effects.replaceAll("_", " ").toUpperCase();
  const normalizeBadgeLabel = (value: string) => value.replace(/[^A-Z0-9]/g, "");
  const showSideEffectsBadge =
    !!sideEffectsLabel &&
    normalizeBadgeLabel(sideEffectsLabel) !== normalizeBadgeLabel(policyLabel);

  const changeHints = context?.changes_since_last?.length ? context.changes_since_last : [];
  const priorApprovals = context?.prior_approvals_in_thread ?? 0;

  return (
    <div className="my-6 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-6 shadow-xl ring-1 ring-inset ring-amber-500/10">
      <div className="mb-4 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">
          {APPROVAL_TITLE}
        </div>
        {context && <AgentBadge type={requestedNodeToAgentType(context.requested_by_node)} />}
      </div>

      <p className="mb-6 text-[11px] leading-relaxed tracking-tight text-slate-400 uppercase font-medium">
        Vanguard is requesting external tool execution. Verify mission parameters before manual
        authorization.
      </p>

      {context && (
        <div
          data-testid="approval-context"
          className="mb-5 space-y-3 rounded-xl border border-amber-900/30 bg-slate-950/40 p-4 text-[11px] text-slate-300"
        >
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-emerald-900/30 px-2 py-1 text-[9px] font-black tracking-widest text-emerald-300">
              {policyLabel}
            </span>
            <span className="rounded bg-amber-900/30 px-2 py-1 text-[9px] font-black tracking-widest text-amber-200">
              {context.risk_level.toUpperCase()} RISK
            </span>
            {showSideEffectsBadge && (
              <span className="rounded bg-slate-800 px-2 py-1 text-[9px] font-black tracking-widest text-slate-300">
                {sideEffectsLabel}
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-amber-300">
              MISSION GOAL
            </span>
            <p className="mt-1 text-slate-200">{context.summary}</p>
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-amber-300">
              PLANNED TOOL CALL
            </span>
            <p className="mt-1 font-semibold text-cyan-300">{toolName}</p>
            <pre className="mt-1 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[10px] text-slate-300">
              {JSON.stringify(toolArgs, null, 2)}
            </pre>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <span className="text-[9px] font-black tracking-widest text-amber-300">
                EXPECTED OUTPUT
              </span>
              <p className="mt-1 text-slate-300">{context.expected_output.join(", ")}</p>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-amber-300">EXPIRES</span>
              <p data-testid="approval-expiry" className="mt-1 text-amber-200">
                {new Date(context.expires_at).toLocaleString()}
              </p>
            </div>
          </div>
          {changeHints.length > 0 && (
            <div>
              <span className="text-[9px] font-black tracking-widest text-amber-300">
                CHANGES SINCE LAST APPROVAL
              </span>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                {changeHints.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-[10px] text-slate-400">
            Prior approvals in thread: {priorApprovals}
            {previousApprovalContext
              ? ` · Previous plan: ${previousApprovalContext.tool.name}`
              : ""}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          data-testid="authorize-mission"
          disabled={disabled}
          onClick={() => onAuthorize(part)}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Authorize Mission
        </button>
        <button
          type="button"
          data-testid="abort-action"
          disabled={disabled}
          onClick={() => onAbort(part)}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
        >
          <XCircle className="h-3.5 w-3.5" /> Abort Action
        </button>
      </div>
    </div>
  );
}
