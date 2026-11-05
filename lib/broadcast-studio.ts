import { DEFAULT_BROADCAST_STATE, type BroadcastState } from "./broadcast";

export type StudioAction = "draft" | "preview" | "ready" | "take" | "hide" | "restore" | "refresh" | "reveal";
export type StudioRecord = BroadcastState & { draft?: BroadcastState; previousProgram?: BroadcastState; readySignature?: string; studioStatus?: "draft" | "preview" | "ready" | "live" | "hidden" };
export function studioSignature(state: BroadcastState) {
  const content: Record<string, unknown> = { ...state };
  for (const key of ["revision", "visible", "revealId", "updatedAt"]) delete content[key];
  return JSON.stringify(content);
}
export function transitionBroadcastStudio(current: StudioRecord, next: BroadcastState, action: StudioAction): StudioRecord {
  if (current.revision !== next.revision) throw new Error("Broadcast revision conflict.");
  const revision = current.revision + 1;
  const program = { ...DEFAULT_BROADCAST_STATE, ...current };
  // Strip nested private studio metadata before saving history or a draft.
  delete program.draft; delete program.previousProgram; delete program.readySignature; delete program.studioStatus;
  if (["draft", "preview", "ready"].includes(action)) return { ...current, revision, draft: { ...next, revision, visible: false },
    studioStatus: action as "draft" | "preview" | "ready", readySignature: action === "ready" ? studioSignature(next) : "" };
  if (action === "take" && current.readySignature !== studioSignature(next)) throw new Error("Mark this exact graphic ready before taking it live.");
  if (action === "take" && ["mvp", "winner"].includes(next.graphic)) throw new Error("Use the explicit reveal control for winners and MVPs.");
  if (action === "restore" && !current.previousProgram) throw new Error("No previous program is available.");
  const selected = action === "restore" ? current.previousProgram! : action === "hide" || action === "refresh" ? program : next;
  const visible = action === "hide" ? false : action === "refresh" ? current.visible : true;
  return { ...selected, revision, visible, revealId: action === "reveal" ? current.revealId + 1 : current.revealId,
    previousProgram: action === "hide" || action === "refresh" ? current.previousProgram : program,
    draft: { ...(action === "take" || action === "reveal" || action === "restore" ? selected : current.draft ?? next), revision, visible: false }, readySignature: "", studioStatus: visible ? "live" : "hidden" };
}
