import { APPROVAL_TITLE } from "../lib/constants";
import type { ToolActionHandler, ToolPart } from "../lib/types";

type ApprovalCardProps = {
  part: ToolPart;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function ApprovalCard({
  part,
  onAuthorize,
  onAbort,
}: ApprovalCardProps) {
  return (
    <div className="mt-3 rounded border border-amber-900 bg-amber-950/20 p-3">
      <div className="mb-3 text-sm font-semibold text-amber-300">
        {APPROVAL_TITLE}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAuthorize(part)}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
        >
          Authorize Mission
        </button>
        <button
          type="button"
          onClick={() => onAbort(part)}
          className="rounded bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
        >
          Abort Action
        </button>
      </div>
    </div>
  );
}
