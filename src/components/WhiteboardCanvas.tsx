import React, { useEffect, useRef, useState } from "react";

type Shape = {
  id?: string;
  type: "sticky" | "rect" | "freehand";
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  color?: string;
};

export default function WhiteboardCanvas({
  boardId,
  initialCanvas,
  onChange,
  websocketUrl, // optional for real-time
}: {
  boardId?: number;
  initialCanvas?: any;
  onChange?: (canvas:any)=>void;
  websocketUrl?: string | null;
}) {
  const [canvas, setCanvas] = useState<any>(initialCanvas || { shapes: [] });
  const [selected, setSelected] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(()=>{
    setCanvas(initialCanvas || { shapes: [] });
  }, [initialCanvas]);

  // Optional: connect to websocket for real-time
  useEffect(()=>{
    if(!websocketUrl || !boardId) return;
    const ws = new WebSocket(`${websocketUrl.replace(/^http/, "ws")}/ws/whiteboard/${boardId}/`);
    wsRef.current = ws;
    ws.onopen = ()=>console.log("WS open");
    ws.onmessage = (ev)=> {
      try {
        const data = JSON.parse(ev.data);
        if(data?.action === "update_canvas") {
          setCanvas(data.payload);
        } else if(data?.action === "append_shape") {
          setCanvas((c:any)=>({...c, shapes:[...(c.shapes||[]), data.payload]}));
        }
      } catch(e){}
    };
    ws.onclose = ()=>console.log("WS closed");
    return ()=> { ws.close(); wsRef.current = null; };
  }, [websocketUrl, boardId]);

  const saveLocal = (c:any) => {
    setCanvas(c);
    if(onChange) onChange(c);
  };

  const addSticky = () => {
    const newShape: Shape = {
      id: Math.random().toString(36).slice(2,9),
      type: "sticky",
      x: 20 + (canvas.shapes?.length || 0) * 20,
      y: 20,
      w: 160,
      h: 120,
      text: "New note",
      color: "#fff59d",
    };
    const c = {...canvas, shapes:[...(canvas.shapes||[]), newShape]};
    saveLocal(c);
    // If websocket available, broadcast append_shape
    if(wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action:"append_shape", payload:newShape }));
    }
  };

  const updateShape = (idx:number, patch:Partial<Shape>)=>{
    const shapes = [...(canvas.shapes||[])];
    shapes[idx] = {...shapes[idx], ...patch};
    const c = {...canvas, shapes};
    saveLocal(c);
  };

  // Basic drag handling for each sticky
  const handleMouseDown = (e:React.MouseEvent, idx:number)=>{
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = canvas.shapes[idx];
    const onMove = (ev:MouseEvent)=>{
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      updateShape(idx, { x: (orig.x||0) + dx, y: (orig.y||0) + dy });
    };
    const onUp = ()=> {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <button onClick={addSticky} className="px-3 py-1 bg-yellow-300 rounded">Add Sticky</button>
      </div>
      <div className="border h-[600px] bg-white relative overflow-hidden">
        {(canvas.shapes || []).map((s:Shape, idx:number) => (
          <div
            key={s.id ?? idx}
            onMouseDown={(e)=>handleMouseDown(e, idx)}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y,
              width: s.w || 140,
              minHeight: s.h || 100,
            }}
            className="p-2 rounded shadow"
          >
            <textarea
              value={s.text}
              onChange={(e)=>updateShape(idx, { text: e.target.value })}
              className="w-full bg-transparent resize-none outline-none"
              style={{minHeight: (s.h||100)-16}}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
