import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ZoomIn, ZoomOut, Crosshair, Plus } from 'lucide-react';
import BpmnJS from 'bpmn-js/lib/Viewer';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Incident {
  id: string;
  incidentType: string;
  incidentMessage?: string | null;
}

export type ActivityState = 'completed' | 'in-progress';

interface BpmnViewerProps {
  xml: string;
  /** Token counts — used only on Definition view (shows number badges) */
  tokens?: Record<string, number>;
  incidents?: Record<string, Incident[]>;
  /** Color BPMN elements by execution state */
  activityStates?: Record<string, ActivityState>;
  /** Show green route lines on sequence flows between completed activities */
  showRoutes?: boolean;
  /** Called when a BPMN element is clicked. Receives element id and type. */
  onElementClick?: (elementId: string, elementType: string, element: any) => void;
  /** Heatmap: activityId → intensity 0.0 to 1.0 */
  heatmap?: Record<string, number>;
  height?: number | string;
  className?: string;
  /** If provided, shows an "Add Variable" button in the controls */
  onAddVariable?: () => void;
}

export interface BpmnViewerHandle {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/* ------------------------------------------------------------------ */
/*  Injected styles                                                    */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'bpmn-viewer-custom-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes bpmn-token-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.25); opacity: 0.85; }
    }
    @keyframes bpmn-in-progress-blink {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
    /* Completed activities — green border on tasks, events, gateways */
    .bpmn-activity-completed .djs-visual > :is(rect, circle, polygon, path, ellipse) {
      stroke: #22c55e !important;
      stroke-width: 2.5px !important;
    }
    /* In-progress activities — orange blinking border */
    .bpmn-activity-in-progress .djs-visual {
      animation: bpmn-in-progress-blink 1.5s ease-in-out infinite !important;
    }
    .bpmn-activity-in-progress .djs-visual > :is(rect, circle, polygon, path, ellipse) {
      stroke: #f97316 !important;
      stroke-width: 3px !important;
    }
    /* Completed sequence flows — green route lines */
    .bpmn-seq-completed .djs-visual > :is(path, polyline) {
      stroke: #22c55e !important;
      stroke-width: 3px !important;
    }
    /* Also color the arrowhead marker */
    .bpmn-seq-completed .djs-visual path[fill] {
      fill: #22c55e !important;
      stroke: #22c55e !important;
    }
    /* In-progress sequence flows — orange route lines */
    .bpmn-seq-in-progress .djs-visual > :is(path, polyline) {
      stroke: #f97316 !important;
      stroke-width: 3px !important;
    }
    .bpmn-seq-in-progress .djs-visual path[fill] {
      fill: #f97316 !important;
      stroke: #f97316 !important;
    }
    .bpmn-heat-1 .djs-visual > rect,
    .bpmn-heat-1 .djs-visual > circle,
    .bpmn-heat-1 .djs-visual > polygon {
      fill: rgba(59, 130, 246, 0.15) !important;
      stroke: rgba(59, 130, 246, 0.6) !important;
      stroke-width: 2px !important;
    }
    .bpmn-heat-2 .djs-visual > rect,
    .bpmn-heat-2 .djs-visual > circle,
    .bpmn-heat-2 .djs-visual > polygon {
      fill: rgba(234, 179, 8, 0.2) !important;
      stroke: rgba(234, 179, 8, 0.7) !important;
      stroke-width: 2px !important;
    }
    .bpmn-heat-3 .djs-visual > rect,
    .bpmn-heat-3 .djs-visual > circle,
    .bpmn-heat-3 .djs-visual > polygon {
      fill: rgba(249, 115, 22, 0.25) !important;
      stroke: rgba(249, 115, 22, 0.8) !important;
      stroke-width: 2.5px !important;
    }
    .bpmn-heat-4 .djs-visual > rect,
    .bpmn-heat-4 .djs-visual > circle,
    .bpmn-heat-4 .djs-visual > polygon {
      fill: rgba(239, 68, 68, 0.3) !important;
      stroke: rgba(239, 68, 68, 0.9) !important;
      stroke-width: 3px !important;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Overlay helpers                                                    */
/* ------------------------------------------------------------------ */

function createTokenBadge(count: number, color: string = '#22c55e', shadow: string = 'rgba(34,197,94,0.3)', textColor: string = '#fff'): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    minWidth: '24px',
    height: '24px',
    borderRadius: '12px',
    padding: '0 6px',
    backgroundColor: color,
    color: textColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '1',
    pointerEvents: 'none' as string,
    boxShadow: `0 1px 3px ${shadow}, 0 0 0 2px rgba(255,255,255,0.8)`,
    zIndex: '10',
  });
  el.textContent = String(count);
  return el;
}

function createIncidentMarker(incidents: Incident[]): HTMLElement {
  const el = document.createElement('div');
  const count = incidents.length;
  Object.assign(el.style, {
    minWidth: '24px',
    height: '24px',
    borderRadius: '12px',
    padding: '0 6px',
    backgroundColor: '#dc2626',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '1',
    cursor: 'default',
    boxShadow: '0 1px 3px rgba(220,38,38,0.4), 0 0 0 2px rgba(255,255,255,0.8)',
  });
  el.textContent = count > 1 ? String(count) : '\u26A0';
  el.title = incidents
    .map((i) => `${i.incidentType}${i.incidentMessage ? ': ' + i.incidentMessage : ''}`)
    .join('\n');
  return el;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BpmnViewer = forwardRef<BpmnViewerHandle, BpmnViewerProps>(
  function BpmnViewer(
    { xml, tokens, incidents, activityStates, showRoutes, heatmap, className = '', onAddVariable, onElementClick },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<InstanceType<typeof BpmnJS> | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    /* ── Zoom helpers ───────────────────────────────────────── */

    function getCanvas() {
      try {
        return viewerRef.current?.get('canvas') as
          | { zoom: (mode: string | number, center?: any) => number }
          | undefined;
      } catch {
        return undefined;
      }
    }

    function doZoom(delta: number) {
      const canvas = getCanvas();
      if (!canvas) return;
      const next = Math.max(0.2, Math.min(4, zoomLevel + delta));
      canvas.zoom(next);
      setZoomLevel(next);
    }

    function fitView() {
      const canvas = getCanvas();
      if (!canvas) return;
      canvas.zoom('fit-viewport', 'auto');
      setZoomLevel(1);
    }

    useImperativeHandle(ref, () => ({
      fitView,
      zoomIn: () => doZoom(0.2),
      zoomOut: () => doZoom(-0.2),
    }));

    useEffect(() => {
      ensureStyles();
    }, []);

    /* Auto-fit when container resizes (drag handle, window resize) */
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      let rafId: number;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          try {
            const canvas = viewerRef.current?.get('canvas') as any;
            if (canvas) {
              // Tell bpmn-js the container changed size
              if (canvas.resized) canvas.resized();
              canvas.zoom('fit-viewport', 'auto');
            }
          } catch {}
        });
      });
      observer.observe(el);
      return () => { observer.disconnect(); cancelAnimationFrame(rafId); };
    }, []);

    /* Create / re-import viewer when xml changes */
    useEffect(() => {
      if (!containerRef.current || !xml) return;

      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }

      const viewer = new BpmnJS({
        container: containerRef.current,
        additionalModules: [MoveCanvasModule],
      });
      viewerRef.current = viewer;

      let cancelled = false;

      (async () => {
        try {
          await viewer.importXML(xml);
          if (cancelled) return;

          // Center and fit the diagram in the viewport
          const canvas = viewer.get('canvas') as {
            zoom: (mode: string, center?: string) => void;
            viewbox: () => { inner: { x: number; y: number; width: number; height: number }; outer: { width: number; height: number } };
          };
          canvas.zoom('fit-viewport', 'auto');

          applyOverlays(viewer, tokens, incidents);
          applyActivityStates(viewer, activityStates, showRoutes);
          applyHeatmap(viewer, heatmap);

          // Add eye icon overlay on call activities
          if (onElementClick) {
            applyCallActivityOverlays(viewer, onElementClick);
          }
        } catch (err) {
          if (!cancelled) {
            console.error('[BpmnViewer] Failed to import XML:', err);
          }
        }
      })();

      return () => {
        cancelled = true;
        viewer.destroy();
        viewerRef.current = null;
      };
    }, [xml]);

    /* Update overlays + states when props change */
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !xml) return;

      try {
        const overlays = viewer.get('overlays') as {
          remove: (filter: { type: string }) => void;
        };
        overlays.remove({ type: 'tokens' });
        overlays.remove({ type: 'incidents' });
        overlays.remove({ type: 'call-activity-link' });
      } catch {
        return;
      }

      applyOverlays(viewer, tokens, incidents);
      applyActivityStates(viewer, activityStates, showRoutes);
      applyHeatmap(viewer, heatmap);
      if (onElementClick) applyCallActivityOverlays(viewer, onElementClick);
    }, [tokens, incidents, activityStates, showRoutes, heatmap, xml]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className={className}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--bg-surface, #1e1e2e)',
            overflow: 'hidden',
          }}
        />

        {/* Controls — right side */}
        <div
          className="flex flex-col gap-1"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
          }}
        >
          {/* Center / fit viewport — first button */}
          <ControlButton title="Center diagram" onClick={fitView}>
            <Crosshair size={16} />
          </ControlButton>
          <ControlButton title="Zoom in" onClick={() => doZoom(0.2)}>
            <ZoomIn size={16} />
          </ControlButton>
          <ControlButton title="Zoom out" onClick={() => doZoom(-0.2)}>
            <ZoomOut size={16} />
          </ControlButton>
          {onAddVariable && (
            <>
              <div style={{ height: 4 }} />
              <ControlButton title="Add variable" onClick={onAddVariable}>
                <Plus size={16} />
              </ControlButton>
            </>
          )}
        </div>
      </div>
    );
  },
);

export default BpmnViewer;

/* ------------------------------------------------------------------ */
/*  Control Button                                                     */
/* ------------------------------------------------------------------ */

function ControlButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center cursor-pointer transition-colors"
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-md, 6px)',
        border: '1px solid var(--border, #ccc)',
        backgroundColor: 'var(--bg-surface, #fff)',
        color: 'var(--text-secondary, #666)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated, #eee)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface, #fff)')}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: apply token + incident overlays                          */
/* ------------------------------------------------------------------ */

function applyOverlays(
  viewer: InstanceType<typeof BpmnJS>,
  tokens?: Record<string, number>,
  incidents?: Record<string, Incident[]>,
) {
  try {
    const overlays = viewer.get('overlays') as {
      add: (
        elementId: string,
        type: string,
        config: { position: { top: number; left: number }; html: HTMLElement },
      ) => void;
    };
    const elementRegistry = viewer.get('elementRegistry') as {
      get: (id: string) => any;
    };

    const BADGE_SIZE = 22;

    if (tokens) {
      for (const [activityId, count] of Object.entries(tokens)) {
        if (count > 0) {
          const el = elementRegistry.get(activityId);
          if (!el) continue;

          // Bottom-right of the element
          const w = el.width ?? 0;
          const h = el.height ?? 0;
          const top = h - BADGE_SIZE + 4;
          const left = w - BADGE_SIZE + 4;

          overlays.add(activityId, 'tokens', {
            position: { top, left },
            html: createTokenBadge(count),
          });
        }
      }
    }

    if (incidents) {
      for (const [activityId, list] of Object.entries(incidents)) {
        if (list.length > 0) {
          const el = elementRegistry.get(activityId);
          if (!el) continue;

          // Bottom-left corner (so it doesn't overlap token badge at bottom-right)
          const h = el.height ?? 0;
          overlays.add(activityId, 'incidents', {
            position: { top: h - 8, left: -8 },
            html: createIncidentMarker(list),
          });
        }
      }
    }
  } catch (err) {
    console.error('[BpmnViewer] Failed to apply overlays:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Internal: apply activity state coloring (green/orange borders)     */
/* ------------------------------------------------------------------ */

function applyActivityStates(
  viewer: InstanceType<typeof BpmnJS>,
  states?: Record<string, ActivityState>,
  showRoutes?: boolean,
) {
  try {
    const elementRegistry = viewer.get('elementRegistry') as {
      forEach: (cb: (element: any) => void) => void;
      get: (id: string) => any;
    };
    const canvas = viewer.get('canvas') as {
      addMarker: (id: string, cls: string) => void;
      removeMarker: (id: string, cls: string) => void;
    };

    // Clear all custom markers
    const ALL_MARKERS = [
      'bpmn-activity-completed',
      'bpmn-activity-in-progress',
      'bpmn-seq-completed',
      'bpmn-seq-in-progress',
    ];
    elementRegistry.forEach((element: any) => {
      for (const m of ALL_MARKERS) canvas.removeMarker(element.id, m);
    });

    if (!states) return;

    // Build a set of all element IDs that are on the completed or in-progress path.
    // This includes tasks, events, gateways — anything in the audit log.
    const completedSet = new Set<string>();
    const inProgressSet = new Set<string>();

    for (const [activityId, state] of Object.entries(states)) {
      if (state === 'completed') completedSet.add(activityId);
      else if (state === 'in-progress') inProgressSet.add(activityId);
    }

    // Apply markers to all BPMN elements (tasks, events, gateways, sub-processes)
    elementRegistry.forEach((element: any) => {
      const elId = element.id;
      if (element.type === 'bpmn:SequenceFlow') return; // handled below

      if (inProgressSet.has(elId)) {
        canvas.addMarker(elId, 'bpmn-activity-in-progress');
      } else if (completedSet.has(elId)) {
        canvas.addMarker(elId, 'bpmn-activity-completed');
      }
    });

    // Color sequence flows (routes) — the actual path lines including curves through gateways
    if (showRoutes) {
      // For a sequence flow to be colored, both its source and target must be
      // on the executed path (completed or in-progress).
      const onPath = new Set([...completedSet, ...inProgressSet]);

      elementRegistry.forEach((element: any) => {
        if (element.type !== 'bpmn:SequenceFlow') return;

        // Resolve source and target IDs — bpmn-js shape elements
        const sourceId = element.source?.id ?? null;
        const targetId = element.target?.id ?? null;
        if (!sourceId || !targetId) return;

        const sourceOnPath = onPath.has(sourceId);
        const targetOnPath = onPath.has(targetId);

        if (!sourceOnPath || !targetOnPath) return;

        // Both endpoints are on the path — determine color
        const targetInProgress = inProgressSet.has(targetId);
        if (targetInProgress) {
          canvas.addMarker(element.id, 'bpmn-seq-in-progress');
        } else {
          canvas.addMarker(element.id, 'bpmn-seq-completed');
        }
      });
    }
  } catch (err) {
    console.error('[BpmnViewer] Failed to apply activity states:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Internal: apply heatmap coloring (blue → yellow → orange → red)    */
/* ------------------------------------------------------------------ */

const HEAT_CLASSES = ['bpmn-heat-1', 'bpmn-heat-2', 'bpmn-heat-3', 'bpmn-heat-4'];

function applyHeatmap(
  viewer: InstanceType<typeof BpmnJS>,
  heatmap?: Record<string, number>,
) {
  try {
    const elementRegistry = viewer.get('elementRegistry') as {
      forEach: (cb: (element: any) => void) => void;
      get: (id: string) => any;
    };
    const canvas = viewer.get('canvas') as {
      addMarker: (id: string, cls: string) => void;
      removeMarker: (id: string, cls: string) => void;
    };

    // Clear all heat markers
    elementRegistry.forEach((element: any) => {
      for (const cls of HEAT_CLASSES) {
        canvas.removeMarker(element.id, cls);
      }
    });

    if (!heatmap) return;

    for (const [activityId, intensity] of Object.entries(heatmap)) {
      const el = elementRegistry.get(activityId);
      if (!el) continue;
      // Map 0-1 intensity to heat level 1-4
      const level = Math.min(4, Math.max(1, Math.ceil(intensity * 4)));
      canvas.addMarker(activityId, `bpmn-heat-${level}`);
    }
  } catch (err) {
    console.error('[BpmnViewer] Failed to apply heatmap:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Internal: add eye icon overlays on call activities                  */
/* ------------------------------------------------------------------ */

function applyCallActivityOverlays(
  viewer: InstanceType<typeof BpmnJS>,
  onElementClick: (elementId: string, elementType: string, element: any) => void,
) {
  try {
    const overlays = viewer.get('overlays') as {
      add: (elementId: string, type: string, config: { position: { top: number; left: number }; html: HTMLElement }) => void;
    };
    const elementRegistry = viewer.get('elementRegistry') as {
      forEach: (cb: (element: any) => void) => void;
    };

    elementRegistry.forEach((element: any) => {
      if (element.type !== 'bpmn:CallActivity') return;

      const w = element.width ?? 0;
      const btn = document.createElement('div');
      Object.assign(btn.style, {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.8)',
        zIndex: '20',
        transition: 'transform 0.15s ease',
      });
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      btn.title = 'View called process';
      btn.onmouseenter = () => { btn.style.transform = 'scale(1.15)'; };
      btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
      btn.onclick = (e) => {
        e.stopPropagation();
        onElementClick(element.id, element.type, element.businessObject);
      };

      overlays.add(element.id, 'call-activity-link', {
        position: { top: -12, left: w - 12 },
        html: btn,
      });
    });
  } catch (err) {
    console.error('[BpmnViewer] Failed to apply call activity overlays:', err);
  }
}
