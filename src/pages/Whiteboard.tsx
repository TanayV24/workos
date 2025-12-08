// src/pages/Whiteboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Save, Share2 } from "lucide-react";
import WhiteboardCanvas, { CanvasState } from "@/components/WhiteboardCanvas";
import { motion } from "framer-motion";

/* NOTE:
   This file uses Tailwind dark: variants (e.g. bg-white dark:bg-slate-900).
   Ensure your Tailwind config uses `darkMode: 'class'` or `darkMode: 'media'`
   depending on how your app toggles dark mode. Your Sidebar uses a toggle,
   so `class` is probably correct (and you already have that in your project).
*/

function Toast({ msg, onClose }: { msg: string; onClose?: () => void }) {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => onClose && onClose(), 3500);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="fixed right-6 top-6 z-50 rounded-lg bg-slate-800/90 px-4 py-2 text-sm text-white shadow"
    >
      {msg}
    </motion.div>
  );
}

function getCsrfToken() {
  const m = document.cookie.match(/(^|;\s*)csrftoken=([^;]*)/);
  return m ? decodeURIComponent(m[2]) : null;
}

export default function WhiteboardPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [boardId, setBoardId] = useState<number | null>(id ? Number(id) : null);
  const [title, setTitle] = useState<string>("Untitled board");
  const [initialState, setInitialState] = useState<CanvasState | null>(null);
  const [errorToast, setErrorToast] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const autosaveRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
    if (boardId) loadBoard(boardId);
    else {
      setInitialState({ content: "# New board\n\nStart typing...", stickies: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (autosaveRef.current) window.clearInterval(autosaveRef.current);
    };
  }, []);

  async function loadBoard(bId: number) {
    try {
      const res = await fetch(`/api/whiteboard/whiteboards/${bId}/`, { credentials: "include" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      setTitle(json.title || `Board ${json.id}`);
      setInitialState(json.canvas_json || { content: "", stickies: [] });
    } catch (err) {
      console.error("Load error:", err);
      setErrorToast("Failed to load board. Check backend or permissions.");
      setInitialState({ content: "", stickies: [] });
    }
  }

  async function createBoard(state: CanvasState) {
    setIsSaving(true);
    try {
      const payload = { title, canvas_json: state };
      const res = await fetch(`/api/whiteboard/whiteboards/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken() || "",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Create failed: ${res.status}`);
      }
      const json = await res.json();
      setBoardId(json.id);
      setErrorToast("Board created");
      navigate(`/whiteboard/${json.id}`, { replace: true });
    } catch (err: any) {
      console.error("Create error:", err);
      setErrorToast("Failed to create board");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveBoard(state: CanvasState) {
    setIsSaving(true);
    try {
      if (!boardId) {
        await createBoard(state);
        return;
      }
      const res = await fetch(`/api/whiteboard/whiteboards/${boardId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken() || "",
        },
        body: JSON.stringify({ title, canvas_json: state }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Save failed: ${res.status}`);
      }
      setErrorToast("Saved");
    } catch (err) {
      console.error("Save error:", err);
      setErrorToast("Failed to save board. See console / network tab.");
    } finally {
      setIsSaving(false);
    }
  }

  function enableAutosave(getState: () => CanvasState) {
    if (autosaveRef.current) window.clearInterval(autosaveRef.current);
    autosaveRef.current = window.setInterval(async () => {
      try {
        const s = getState();
        if (boardId) {
          await saveBoard(s);
        } else {
          await createBoard(s);
        }
      } catch (e) {
        console.warn("Autosave failed", e);
      }
    }, 20_000);
  }

  return (
    <div className="flex h-[calc(100vh-0px)] w-full">
      <Toast msg={errorToast} onClose={() => setErrorToast("")} />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/40 bg-white/60 dark:bg-slate-800/60 dark:border-slate-700/40 px-6 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-300 text-slate-900 dark:text-slate-100"
                placeholder="Untitled board"
              />
              <div className="text-xs text-slate-500 dark:text-slate-400">Whiteboard • Collaborative notes & planning</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <Share2 className="h-4 w-4" /> Copy Link
            </Button>

            <Button
              variant="default"
              onClick={() => setErrorToast("Saving…")}
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </header>

        <main className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-900/80">
          <WhiteboardCanvas
            boardId={boardId || undefined}
            initialState={initialState || undefined}
            onCreate={createBoard}
            onSave={saveBoard}
            enableAutosave={enableAutosave}
            saving={isSaving}
          />
        </main>
      </div>
    </div>
  );
}
