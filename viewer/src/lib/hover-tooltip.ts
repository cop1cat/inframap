import type { Core, NodeSingular } from "cytoscape";
import tippy, { type Instance, type Props } from "tippy.js";
import "tippy.js/dist/tippy.css";

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildHtml(node: NodeSingular): string {
  const data = node.data();
  const tags = (data.tags ?? {}) as Record<string, string>;
  const tagsHtml = Object.entries(tags)
    .map(([k, v]) => `<span class="tt-tag"><b>${escape(k)}</b>:${escape(v)}</span>`)
    .join("");
  return `
    <div class="tt">
      <div class="tt-title">${escape(data.label ?? data.id)}</div>
      <div class="tt-id">${escape(data.id)}</div>
      ${data.description ? `<div class="tt-desc">${escape(data.description)}</div>` : ""}
      ${data.owner ? `<div class="tt-owner">${escape(data.owner)}</div>` : ""}
      ${tagsHtml ? `<div class="tt-tags">${tagsHtml}</div>` : ""}
    </div>
  `;
}

export function attachHoverTooltips(cy: Core): () => void {
  const container = cy.container();
  if (!container) return () => {};

  // virtual reference: a hidden element we'll position
  const ref = document.createElement("div");
  ref.style.position = "absolute";
  ref.style.pointerEvents = "none";
  ref.style.width = "1px";
  ref.style.height = "1px";
  document.body.appendChild(ref);

  const instance: Instance<Props> = tippy(ref, {
    content: "",
    allowHTML: true,
    placement: "top",
    arrow: true,
    delay: [250, 0],
    offset: [0, 14],
    interactive: false,
    appendTo: () => document.body,
    trigger: "manual",
    hideOnClick: false,
  });

  const positionRef = (node: NodeSingular) => {
    const pos = node.renderedPosition();
    const rect = container.getBoundingClientRect();
    const r = Math.max(node.renderedWidth(), node.renderedHeight()) / 2;
    ref.style.left = `${rect.left + pos.x + window.scrollX}px`;
    ref.style.top = `${rect.top + pos.y - r + window.scrollY}px`;
  };

  let hovered: NodeSingular | null = null;

  const onMouseover = (e: cytoscape.EventObject) => {
    const n = e.target as NodeSingular;
    if (!n.isNode?.() || !n.hasClass("service")) return;
    hovered = n;
    instance.setContent(buildHtml(n));
    positionRef(n);
    instance.show();
  };

  const onMouseout = (e: cytoscape.EventObject) => {
    if (e.target === hovered) {
      hovered = null;
      instance.hide();
    }
  };

  const onPanZoom = () => {
    if (hovered) {
      positionRef(hovered);
      instance.popperInstance?.update();
    }
  };

  const hide = () => {
    hovered = null;
    instance.hide();
  };

  cy.on("mouseover", "node.service", onMouseover);
  cy.on("mouseout", "node.service", onMouseout);
  cy.on("pan zoom", onPanZoom);
  cy.on("tap", hide);
  cy.on("mousedown", hide);
  cy.on("drag", "node", hide);

  // Container-level fallback in case cytoscape's mouseout doesn't fire
  // (e.g. fast pointer movement, canvas redraw).
  container.addEventListener("mouseleave", hide);

  return () => {
    cy.off("mouseover", "node.service", onMouseover);
    cy.off("mouseout", "node.service", onMouseout);
    cy.off("pan zoom", onPanZoom);
    cy.off("tap", hide);
    cy.off("mousedown", hide);
    cy.off("drag", "node", hide);
    container.removeEventListener("mouseleave", hide);
    instance.destroy();
    ref.remove();
  };
}
