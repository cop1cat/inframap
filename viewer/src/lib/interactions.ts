import type { Core, EdgeSingular, NodeSingular, SingularElementArgument } from "cytoscape";

let animationTimer: number | null = null;

function stopAnimation(cy: Core): void {
  if (animationTimer !== null) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
  cy.edges(".highlighted").style("line-dash-offset", 0);
}

function startEdgeAnimation(cy: Core): void {
  stopAnimation(cy);
  let offset = 0;
  animationTimer = window.setInterval(() => {
    offset = (offset - 4) % 1000;
    cy.edges(".highlighted").style("line-dash-offset", offset);
  }, 60);
}

export function clearHighlight(cy: Core): void {
  cy.elements().removeClass("highlighted dim focused");
  stopAnimation(cy);
}

function highlightSet(cy: Core, set: SingularElementArgument[], focusId?: string): void {
  clearHighlight(cy);
  const ids = new Set(set.map((el) => el.id()));
  cy.elements().forEach((el) => {
    if (ids.has(el.id())) {
      el.addClass("highlighted");
      if (el.id() === focusId) el.addClass("focused");
    } else {
      el.addClass("dim");
    }
  });
  startEdgeAnimation(cy);
}

function ancestors(node: NodeSingular): NodeSingular[] {
  return node.parents().toArray() as NodeSingular[];
}

export function highlightService(cy: Core, node: NodeSingular): void {
  const edges = node.connectedEdges();
  const neighbors = edges.connectedNodes();
  const set: SingularElementArgument[] = [node, ...edges.toArray(), ...neighbors.toArray()];
  // include parent groups of node and its neighbours so they don't dim
  set.push(...ancestors(node));
  for (const n of neighbors.toArray() as NodeSingular[]) set.push(...ancestors(n));
  highlightSet(cy, set, node.id());
}

export function highlightEdge(cy: Core, edge: EdgeSingular): void {
  const src = edge.source() as NodeSingular;
  const tgt = edge.target() as NodeSingular;
  highlightSet(
    cy,
    [edge, src, tgt, ...ancestors(src), ...ancestors(tgt)],
    edge.id(),
  );
}

export function highlightGroup(cy: Core, group: NodeSingular): void {
  const children = group.children();
  highlightSet(
    cy,
    [group, ...children.toArray(), ...ancestors(group)],
    group.id(),
  );
}

export function highlightById(cy: Core, ids: string[]): void {
  const focus = cy.collection();
  for (const id of ids) {
    const el = cy.getElementById(id);
    if (el.length === 0) continue;
    focus.merge(el);
    if (el.isNode()) {
      const edges = el.connectedEdges();
      focus.merge(edges).merge(edges.connectedNodes());
      if (el.isParent()) focus.merge(el.children());
      focus.merge(el.parents());
      edges.connectedNodes().forEach((n) => {
        focus.merge(n.parents());
      });
    }
  }
  if (focus.length === 0) return;
  highlightSet(cy, focus.toArray(), ids.length === 1 ? ids[0] : undefined);
}

export function isHighlighted(cy: Core): boolean {
  return cy.elements(".highlighted").length > 0;
}

export function highlightByEdgeClass(cy: Core, edgeClass: string): void {
  const edges = cy.edges(`.${edgeClass}`);
  if (edges.length === 0) {
    clearHighlight(cy);
    return;
  }
  const focus = cy.collection().merge(edges);
  edges.forEach((e) => {
    focus.merge(e.source());
    focus.merge(e.target());
    focus.merge(e.source().parents());
    focus.merge(e.target().parents());
  });
  highlightSet(cy, focus.toArray());
}

export function attachInteractions(cy: Core): void {
  cy.on("tap", (e) => {
    const t = e.target;
    if (t === cy) {
      clearHighlight(cy);
      return;
    }
    if (t.isNode?.()) {
      if (t.hasClass("service")) highlightService(cy, t);
      else if (t.hasClass("group")) highlightGroup(cy, t);
    } else if (t.isEdge?.()) {
      highlightEdge(cy, t);
    }
  });

  attachMiddleMousePan(cy);
}

function attachMiddleMousePan(cy: Core): void {
  const container = cy.container();
  if (!container) return;

  let panning = false;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: MouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    panning = true;
    lastX = e.clientX;
    lastY = e.clientY;
    container.style.cursor = "grabbing";
  };
  const onMove = (e: MouseEvent) => {
    if (!panning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const p = cy.pan();
    cy.pan({ x: p.x + dx, y: p.y + dy });
  };
  const onUp = (e: MouseEvent) => {
    if (e.button !== 1) return;
    panning = false;
    container.style.cursor = "";
  };
  // suppress middle-click autoscroll
  const onAuxClick = (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  };

  container.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  container.addEventListener("auxclick", onAuxClick);
}
