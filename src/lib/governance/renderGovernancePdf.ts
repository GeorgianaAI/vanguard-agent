import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { GovernanceViewModel } from "@/app/governance/lib/buildGovernanceViewModel";

export type GovernancePdfInput = {
  generatedAtIso: string;
  model: GovernanceViewModel;
};

function wrapLines(text: string, maxChars: number): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [""];
  const lines: string[] = [];
  let rest = t;
  while (rest.length > maxChars) {
    let slice = rest.slice(0, maxChars);
    const breakAt = slice.lastIndexOf(" ");
    if (breakAt > maxChars * 0.5) {
      slice = rest.slice(0, breakAt);
      rest = rest.slice(breakAt + 1).trimStart();
    } else {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
      continue;
    }
    lines.push(slice.trimEnd());
  }
  if (rest.length) lines.push(rest);
  return lines;
}

/**
 * Compliance-oriented PDF from the governance view model (resilient on partial data).
 */
export async function renderGovernanceCompliancePdf(
  input: GovernancePdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { model, generatedAtIso } = input;

  const margin = 48;
  const lineH = 12;
  const maxW = 520;
  const charsPerLine = 92;

  let page = doc.addPage([612, 792]);
  let y = 750;

  const addLine = (text: string, size = 10, bold = false, color = rgb(0.1, 0.1, 0.12)) => {
    const f = bold ? fontBold : font;
    for (const line of wrapLines(text, charsPerLine)) {
      if (y < margin + 40) {
        page = doc.addPage([612, 792]);
        y = 750;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: f,
        color,
        maxWidth: maxW,
      });
      y -= lineH;
    }
  };

  const addHeading = (h: string) => {
    y -= 6;
    addLine(h, 11, true, rgb(0, 0.25, 0.35));
    y -= 4;
  };

  addLine("Vanguard — Governance & Compliance Evidence", 14, true);
  addLine(`Generated (UTC): ${generatedAtIso}`, 9, false, rgb(0.35, 0.35, 0.4));
  y -= 8;

  addHeading("Identifiers");
  addLine(
    `Data mode: ${model.source === "derived" ? "Mission-linked data" : "Insufficient transcript for mission-linked governance"}`,
  );
  if (model.threadId) addLine(`Thread ID: ${model.threadId}`);
  if (model.missionId) addLine(`Mission ID: ${model.missionId}`);
  if (model.requestId) addLine(`Evidence request ID: ${model.requestId}`);

  const warnBlock: string[] = [];
  if (model.evidenceStatus === "degraded") {
    warnBlock.push("Evidence pipeline status: DEGRADED");
  }
  for (const w of model.evidenceWarnings) {
    warnBlock.push(`Evidence: ${w}`);
  }
  for (const w of model.advisoryEnrichmentWarnings) {
    warnBlock.push(`Advisory enrichment: ${w}`);
  }
  if (warnBlock.length > 0) {
    addHeading("Warnings & degraded signals");
    for (const w of warnBlock) addLine(w, 9, false, rgb(0.55, 0.25, 0.1));
  }

  addHeading("Decision integrity ledger (summary)");
  for (const row of model.ledgerRows) {
    addLine(
      `${row.agent} | ${row.action} | ${row.status} | Risk: ${row.risk} | ${row.time}`,
      9,
    );
  }

  addHeading("Advisory signals");
  if (model.advisorySignals.length === 0) {
    addLine("None listed.");
  } else {
    for (const a of model.advisorySignals) {
      addLine(
        `${a.id} — ${a.severity} (CVSS ${a.cvss}) — ${a.stack}`,
        9,
        true,
      );
      addLine(a.note, 8);
      addLine(`Remediation: ${a.remediationHint}`, 8, false, rgb(0.35, 0.35, 0.4));
      y -= 4;
    }
    if (model.advisoryOverflowCount > 0) {
      addLine(
        `Additional findings not shown on dashboard: +${model.advisoryOverflowCount}`,
        8,
        false,
        rgb(0.45, 0.35, 0.15),
      );
    }
  }

  addHeading("Evidence trail");
  for (const e of model.evidenceTrail) {
    addLine(`${e.id}: ${e.label}`, 9, true);
    addLine(e.desc, 8);
    y -= 2;
  }

  addHeading("NIST-aligned snapshot");
  addLine(
    `Measure — ${model.nistMeasure.mode}: ${model.nistMeasure.label} = ${model.nistMeasure.value} (${model.nistMeasure.percent}%)`,
  );
  addLine(
    `Manage — ${model.nistManage.mode}: ${model.nistManage.label} = ${model.nistManage.value} (${model.nistManage.percent}%)`,
  );

  y -= 10;
  addLine(
    "Defensive OSINT scope only. Advisory data is correlation from public sources; validate before operational decisions.",
    8,
    false,
    rgb(0.4, 0.4, 0.45),
  );

  return doc.save();
}
