// src/pages/Whiteboard.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WhiteboardCanvas from "@/components/WhiteboardCanvas"; // create this component (see note)
import { useAuth } from "@/contexts/AuthContext";

export default function WhiteboardPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [board, setBoard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      // if not authenticated, navigate to login — ProtectedRoute should normally handle this
      navigate("/login");
      return;
    }

    if (id) {
      setLoading(true);
      fetch(`/api/whiteboard/whiteboards/${id}/`)
        .then(async (r) => {
          if (!r.ok) throw new Error("Failed to fetch");
          return r.json();
        })
        .then((d) => {
          setBoard(d);
          setLoading(false);
        })
        .catch(() => {
          setBoard(null);
          setLoading(false);
        });
    } else {
      // no id: create temporary client-side board until user saves it
      setBoard({ title: "Untitled Board", canvas_json: { shapes: [] } });
      setLoading(false);
    }
  }, [id, isAuthenticated, navigate]);

  const onCanvasChange = (canvas: any) => {
    setBoard((b: any) => ({ ...b, canvas_json: canvas }));
  };

  const saveBoard = async () => {
    if (!board) return;
    if (id) {
      // update existing
      await fetch(`/api/whiteboard/whiteboards/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_json: board.canvas_json, title: board.title }),
      });
      alert("Board saved");
      return;
    }
    // create new board
    const res = await fetch("/api/whiteboard/whiteboards/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: board.title, canvas_json: board.canvas_json }),
    });
    if (!res.ok) {
      alert("Failed to create board");
      return;
    }
    const json = await res.json();
    alert("Board created");
    // redirect to the new board page
    navigate(`/whiteboard/${json.id}`);
  };

  if (loading) return <div className="p-6">Loading whiteboard…</div>;
  if (!board) return <div className="p-6">Board not found or you don't have access.</div>;

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center gap-3">
        <input
          className="border p-2 rounded flex-1"
          value={board?.title || ""}
          onChange={(e) => setBoard({ ...board, title: e.target.value })}
          placeholder="Board title"
        />
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={saveBoard}>
          {id ? "Save" : "Create"}
        </button>
      </div>

      {/* Note: create a component at src/components/WhiteboardCanvas.tsx (I provided it earlier).
          If you prefer a single-file approach, you can inline the canvas here.
      */}
      <WhiteboardCanvas
        boardId={id ? Number(id) : undefined}
        initialCanvas={board?.canvas_json}
        onChange={onCanvasChange}
        websocketUrl={null} // set to window.location.origin if you enabled channels/ws
      />
    </div>
  );
}
