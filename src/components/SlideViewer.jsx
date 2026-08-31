import React, { useEffect, useRef, useState } from "react";
import "./SlideViewer.css";

/**
 * Renders one PDF page at a time onto a canvas, with Prev/Next instead of
 * scrolling.
 *
 * Why not an <iframe> with the native PDF viewer (what this replaces):
 *   - it only scrolls, there's no page-at-a-time mode we can drive;
 *   - it never reports the page count, so "3 / 12" and disabling Next at the
 *     last page are impossible;
 *   - its default fit-page shrinks a 16:9 slide to ~0.32 scale inside a
 *     370px-wide phone, which measured out at ~6px body text — unreadable.
 *
 * Rotation is done by pdf.js itself (`getViewport({ rotation: 90 })`), not a
 * CSS transform, so the glyphs are rasterised at the rotated size and stay
 * crisp. Rotating lets a landscape slide use the phone's LONG axis as its
 * width, which is the only thing that meaningfully raises the scale on a
 * portrait screen.
 */
export default function SlideViewer({ url, expanded = false, tone = "light" }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const docRef = useRef(null);
  // Teardown lives on the LOADING TASK, not the document proxy — in pdf.js v6
  // only PDFDocumentLoadingTask exposes destroy(); calling it on the proxy
  // throws "destroy is not a function".
  const loadingTaskRef = useRef(null);
  // pdf.js throws if a page is rendered while a previous render is still in
  // flight on the same canvas — keep the task so we can cancel it first.
  const renderTaskRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Bumped on resize/expand so the render effect recomputes the fit scale.
  const [fitTick, setFitTick] = useState(0);

  // ── Load the document once per URL ───────────────────────────────────
  useEffect(() => {
    if (!url) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setNumPages(0);
    setPage(1);

    (async () => {
      try {
        // Dynamic import: pdf.js is heavy and only a presenter who actually
        // opens a slide needs it, so it stays out of the main bundle.
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const loadingTask = pdfjs.getDocument({ url });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (!active) {
          loadingTask.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch {
        if (active) {
          setError("Gagal membuka slide.");
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      docRef.current = null;
    };
  }, [url]);

  // ── Re-fit when the panel resizes (expand/collapse, orientation) ─────
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setFitTick((t) => t + 1));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // ── Render the current page, scaled to fit the box ───────────────────
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!doc || !canvas || !box || numPages === 0) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;

        const rotation = expanded ? 90 : 0;
        const base = pdfPage.getViewport({ scale: 1, rotation });
        const boxW = box.clientWidth;
        const boxH = box.clientHeight;
        if (boxW === 0 || boxH === 0) return;

        // Contain: whole page always visible, never cropped — the point of
        // Prev/Next is that nothing needs scrolling to be reachable.
        const scale = Math.min(boxW / base.width, boxH / base.height);
        const viewport = pdfPage.getViewport({ scale, rotation });

        // Rasterise at device pixel ratio so text stays sharp on retina.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTaskRef.current?.cancel();
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err) {
        // A cancelled render is expected whenever the user flips pages fast.
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          setError("Gagal menampilkan halaman.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, numPages, expanded, fitTick]);

  const atFirst = page <= 1;
  const atLast = page >= numPages;

  return (
    <div className={`slideview slideview--${tone}`}>
      <div className="slideview-canvas-box" ref={boxRef}>
        {loading && <p className="slideview-msg">Memuat slide...</p>}
        {error && <p className="slideview-msg">{error}</p>}
        <canvas ref={canvasRef} className="slideview-canvas" style={error || loading ? { display: "none" } : undefined} />
      </div>

      {numPages > 0 && !error && (
        <div className="slideview-nav">
          <button
            type="button"
            className="slideview-nav-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={atFirst}
            aria-label="Halaman sebelumnya"
          >
            ‹
          </button>
          <span className="slideview-nav-count">
            {page} / {numPages}
          </span>
          <button
            type="button"
            className="slideview-nav-btn"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={atLast}
            aria-label="Halaman berikutnya"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
