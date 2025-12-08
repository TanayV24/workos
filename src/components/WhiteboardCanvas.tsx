// src/components/WhiteboardCanvas.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Download, RotateCcw } from "lucide-react";
import html2canvas from "html2canvas";

export type Sticky = {
  id: string;
  text: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
};

export type CanvasState = {
  content: string;
  stickies: Sticky[];
};

type Props = {
  boardId?: number;
  initialState?: CanvasState;
  onCreate?: (state: CanvasState) => Promise<any>;
  onSave?: (state: CanvasState) => Promise<any>;
  enableAutosave?: (getState: () => CanvasState) => void;
  saving?: boolean;
};

export default function WhiteboardCanvas({
  boardId,
  initialState,
  onCreate: onCreateProp,
  onSave: onSaveProp,
  enableAutosave,
  saving,
}: Props) {
  const [content, setContent] = useState<string>(initialState?.content || "");
  const [stickies, setStickies] = useState<Sticky[]>(initialState?.stickies || []);
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // push history (debounced lightly)
  const pushHistory = useCallback(
    (state: CanvasState) => {
      setHistory((prev) => {
        const newHist = prev.slice(0, historyIndex + 1);
        newHist.push(state);
        setHistoryIndex(newHist.length - 1);
        return newHist;
      });
    },
    [historyIndex]
  );

  useEffect(() => {
    if (initialState) {
      setContent(initialState.content || "");
      setStickies(initialState.stickies || []);
      pushHistory({ content: initialState.content || "", stickies: initialState.stickies || [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState]);

  useEffect(() => {
    if (enableAutosave) enableAutosave(() => ({ content, stickies }));
  }, [enableAutosave, content, stickies]);

  const handleCreate = async () => {
    if (!onCreateProp) return;
    const state = { content, stickies };
    await onCreateProp(state);
    pushHistory(state);
  };

  const handleSave = async () => {
    if (!onSaveProp) {
      if (onCreateProp) await handleCreate();
      return;
    }
    const state = { content, stickies };
    await onSaveProp(state);
    pushHistory(state);
  };

  const addSticky = () => {
    const s: Sticky = {
      id: Math.random().toString(36).slice(2, 9),
      text: "New note",
      x: 36 + (stickies.length % 6) * 28,
      y: 36 + Math.floor(stickies.length / 6) * 22,
      w: 200,
      h: 110,
      color: "#fff59d",
    };
    const ns = [...stickies, s];
    setStickies(ns);
    pushHistory({ content, stickies: ns });
  };

  const removeSticky = (id: string) => {
    const ns = stickies.filter((s) => s.id !== id);
    setStickies(ns);
    pushHistory({ content, stickies: ns });
  };

  // drag
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onStickyMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const s = stickies.find((x) => x.id === id);
    if (!s) return;
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: s.x, origY: s.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const { id, startX, startY, origX, origY } = dragState.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setStickies((prev) => prev.map((p) => (p.id === id ? { ...p, x: origX + dx, y: origY + dy } : p)));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      pushHistory({ content, stickies });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // resize
  const onResizeStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const s = stickies.find((x) => x.id === id);
    if (!s) return;
    const startW = s.w || 200;
    const startH = s.h || 120;
    const startX = e.clientX;
    const startY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setStickies((prev) => prev.map((p) => (p.id === id ? { ...p, w: Math.max(120, startW + dx), h: Math.max(60, startH + dy) } : p)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      pushHistory({ content, stickies });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const s = history[idx];
    setContent(s.content);
    setStickies(s.stickies);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    const s = history[idx];
    setContent(s.content);
    setStickies(s.stickies);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      const clip = canvasRef.current;
      const prev = clip.style.boxShadow;
      clip.style.boxShadow = "none";
      const canvas = await html2canvas(clip, { scale: 2, useCORS: true, backgroundColor: null });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(document.title || "whiteboard").replace(/\s+/g, "_")}.png`;
      a.click();
      clip.style.boxShadow = prev;
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed. See console for details.");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
      if ((e.ctrlKey || e.metaKey) && e.key === "y") redo();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const state = { content, stickies };
        if (onSaveProp) onSaveProp(state);
        else if (onCreateProp) onCreateProp(state);
        pushHistory(state);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, content, stickies]);

  const handleSaveShortcut = async () => {
    const state: CanvasState = { content, stickies };
    if (onSaveProp) await onSaveProp(state);
    else if (onCreateProp) await onCreateProp(state);
    pushHistory(state);
  };

  return (
    <div className="flex w-full gap-6 p-6">
      <div
        ref={canvasRef}
        className="relative flex-1 rounded-2xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800/60 p-6 shadow-lg"
        style={{ minHeight: 520 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100/60 dark:bg-slate-700/40 p-2">
              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Workspace</div>
            <div className="ml-3 text-xs text-slate-400 dark:text-slate-400">Live • Draft</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={addSticky} className="px-3 py-2 rounded-full bg-slate-50/60 dark:bg-slate-700/40">
              <Plus className="h-4 w-4" /> Add
            </Button>

            <div className="flex items-center gap-2 rounded-full bg-slate-50/40 dark:bg-slate-800/40 p-1">
              <Button variant="ghost" onClick={undo} className="px-2 py-1">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={redo} className="px-2 py-1">
                Redo
              </Button>
            </div>

            <Button variant="outline" onClick={exportPNG} className="px-3 py-2">
              <Download className="h-4 w-4" /> Export
            </Button>

            <Button variant="default" onClick={handleSaveShortcut} disabled={saving} className="px-4 py-2">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[420px] resize-none rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm leading-relaxed outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-inner"
          style={{ fontFamily: "Inter, ui-sans-serif, system-ui", fontSize: 14, lineHeight: 1.6 }}
          placeholder="Type notes here — the main canvas. Use markdown for headings and lists."
        />

        <div className="relative mt-6 h-[260px] w-full border rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/70 p-3 overflow-hidden">
          {stickies.map((s) => (
            <AnimatePresence key={s.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                className="absolute cursor-grab rounded-lg border border-slate-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-700/10 p-2 shadow-md"
                onMouseDown={(e) => onStickyMouseDown(e as React.MouseEvent, s.id)}
                onDoubleClick={() => {}}
              >
                <textarea
                  value={s.text}
                  onChange={(e) => {
                    const t = e.target.value;
                    setStickies((prev) => prev.map((p) => (p.id === s.id ? { ...p, text: t } : p)));
                  }}
                  className="w-full h-full resize-none bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => removeSticky(s.id)} className="rounded p-1 hover:bg-slate-100/40 dark:hover:bg-slate-700/40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div
                    onMouseDown={(e) => onResizeStart(e as any, s.id)}
                    className="h-4 w-4 cursor-se-resize rounded bg-slate-200/60 dark:bg-slate-700/60"
                    title="Resize"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          ))}
        </div>
      </div>

      <aside className="w-[320px] flex-shrink-0 space-y-4">
        <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-100">Stickies</h4>
            <div className="text-xs text-slate-400 dark:text-slate-300">{stickies.length}</div>
          </div>

          <div className="mt-3 space-y-3 max-h-[56vh] overflow-auto pr-2">
            {stickies.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded border p-2 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex-1">
                  <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-100">{s.text.split("\n")[0] || "Note"}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-300">x:{Math.round(s.x)} y:{Math.round(s.y)}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const el = document.querySelector(`div[style*="${s.id}"]`);
                      (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="rounded p-1 hover:bg-slate-100/40 dark:hover:bg-slate-700/40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeSticky(s.id)} className="rounded p-1 hover:bg-slate-100/40 dark:hover:bg-slate-700/40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {stickies.length === 0 && <div className="text-xs text-slate-400 dark:text-slate-300">No stickies — add one to get started.</div>}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setStickies([]); pushHistory({ content, stickies: [] }); }}>
              Clear
            </Button>
            <Button variant="default" onClick={addSticky}><Plus className="h-4 w-4" /> New</Button>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow text-xs text-slate-500 dark:text-slate-300">
          Pro tips: Use Cmd/Ctrl+S to save, Cmd/Ctrl+Z to undo. Export the board to PNG for sharing.
        </div>
      </aside>
    </div>
  );
}
