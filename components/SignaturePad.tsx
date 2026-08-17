"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  toBlob: () => Promise<Blob | null>;
  isEmpty: () => boolean;
  clear: () => void;
};

const SignaturePad = forwardRef<SignaturePadHandle, { label?: string }>(
  function SignaturePad({ label = "Tanda tangan" }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const empty = useRef(true);
    const [hasInk, setHasInk] = useState(false);

    function resizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      const previous = empty.current ? null : canvas.toDataURL();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0b172a";
      if (previous) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = previous;
      }
    }

    useEffect(() => {
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    function point(event: React.PointerEvent<HTMLCanvasElement>) {
      const rect = event.currentTarget.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function start(event: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const context = event.currentTarget.getContext("2d");
      const p = point(event);
      context?.beginPath();
      context?.moveTo(p.x, p.y);
    }

    function move(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      const context = event.currentTarget.getContext("2d");
      const p = point(event);
      context?.lineTo(p.x, p.y);
      context?.stroke();
      empty.current = false;
      setHasInk(true);
    }

    function stop() {
      drawing.current = false;
    }

    function clear() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      empty.current = true;
      setHasInk(false);
    }

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => empty.current,
      toBlob: () => new Promise((resolve) => canvasRef.current?.toBlob(resolve, "image/png")),
    }));

    return (
      <div className="signature-wrap">
        <div className="signature-label-row">
          <span>{label}<b aria-hidden="true">*</b></span>
          <button type="button" className="text-button" onClick={clear} disabled={!hasInk}>
            Hapus & ulangi
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          aria-label={label}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        />
        <p className="field-hint">Gunakan jari atau mouse untuk membubuhkan tanda tangan.</p>
      </div>
    );
  },
);

export default SignaturePad;
