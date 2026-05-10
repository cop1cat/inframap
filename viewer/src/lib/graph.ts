import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import "./cy-extensions";
import type { InfraJson } from "../types";

export function buildElements(infra: InfraJson): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const serviceIds = new Set(infra.services.map((s) => s.id));

  for (const g of infra.groups) {
    elements.push({
      group: "nodes",
      data: {
        id: g.id,
        label: g.label,
        kind: "group",
        color: g.color ?? "",
        ...(g.parent ? { parent: g.parent } : {}),
      },
      classes: "group",
    });
  }

  for (const s of infra.services) {
    elements.push({
      group: "nodes",
      data: {
        id: s.id,
        label: s.label,
        kind: "service",
        owner: s.owner,
        description: s.description,
        tags: s.tags,
        links: s.links,
        ...(s.group ? { parent: s.group } : {}),
      },
      classes: "service",
    });
  }

  // Ghost nodes for broken call targets, so edges can render.
  const ghostIds = new Set<string>();
  for (const s of infra.services) {
    for (const c of s.calls) {
      if (!serviceIds.has(c.id) && !ghostIds.has(c.id)) {
        ghostIds.add(c.id);
        elements.push({
          group: "nodes",
          data: {
            id: c.id,
            label: c.id,
            kind: "ghost",
          },
          classes: "service ghost",
        });
      }
    }
  }

  for (const s of infra.services) {
    for (const c of s.calls) {
      const edgeClasses = [c.type as string];
      if (c.broken) edgeClasses.push("broken");
      elements.push({
        group: "edges",
        data: {
          id: `${s.id}->${c.id}`,
          source: s.id,
          target: c.id,
          type: c.type,
          broken: c.broken,
        },
        classes: edgeClasses.join(" "),
      });
    }
  }

  return elements;
}

interface ThemeColors {
  text: string;
  textMuted: string;
  bg: string;
  nodeBg: string;
  nodeBorder: string;
  groupBg: string;
  groupBorder: string;
  edgeColor: string;
  edgeMuted: string;
  brokenColor: string;
  accent: string;
}

function readThemeColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string): string => {
    const value = cs.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    text: v("--text", "#1a1d24"),
    textMuted: v("--text-muted", "#6b7280"),
    bg: v("--bg", "#fafbfc"),
    nodeBg: v("--node-bg", "#ffffff"),
    nodeBorder: v("--node-border", "#4f7cff"),
    groupBg: v("--group-bg", "#f3f4f6"),
    groupBorder: v("--group-border", "#d1d5db"),
    edgeColor: v("--edge-color", "#4b5563"),
    edgeMuted: v("--edge-muted", "#9ca3af"),
    brokenColor: v("--broken-color", "#ef4444"),
    accent: v("--accent", "#4f7cff"),
  };
}

type Stylesheet = { selector: string; style: Record<string, unknown> };

function buildStylesheet(c: ThemeColors): Stylesheet[] {
  return [
    {
      selector: "node.group",
      style: {
        shape: "round-rectangle",
        "background-opacity": 0.04,
        "background-color": c.groupBg,
        "border-width": 1.5,
        "border-color": c.groupBorder,
        "border-opacity": 0.7,
        label: "data(label)",
        "text-valign": "top",
        "text-halign": "center",
        "text-margin-y": -6,
        color: c.textMuted,
        "font-size": 12,
        "font-weight": 600,
        padding: 18,
        "compound-sizing-wrt-labels": "include",
      },
    },
    {
      // colored groups override border
      selector: "node.group[color != '']",
      style: {
        "border-color": "data(color)",
      },
    },
    {
      selector: "node.service",
      style: {
        shape: "ellipse",
        width: 26,
        height: 26,
        "background-color": c.nodeBg,
        "border-width": 1.5,
        "border-color": c.nodeBorder,
        label: "data(label)",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 6,
        color: c.text,
        "font-size": 11,
        "min-zoomed-font-size": 6,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "line-color": c.edgeColor,
        "target-arrow-color": c.edgeColor,
        opacity: 0.5,
      },
    },
    { selector: "edge.sync", style: { "line-style": "solid" } },
    { selector: "edge.async", style: { "line-style": "dashed", "line-dash-pattern": [6, 4] } },
    { selector: "edge.event", style: { "line-style": "dotted" } },
    {
      selector: "edge.unknown",
      style: {
        "line-color": c.edgeMuted,
        "target-arrow-color": c.edgeMuted,
      },
    },
    {
      selector: "edge.broken",
      style: {
        "line-color": c.brokenColor,
        "target-arrow-color": c.brokenColor,
        "line-style": "dashed",
      },
    },

    // highlighted state
    {
      selector: ".highlighted",
      style: { opacity: 1 },
    },
    {
      selector: "node.highlighted.service",
      style: {
        "background-color": c.accent,
        "border-color": c.accent,
        "border-opacity": 1,
        color: c.text,
        "font-weight": 600,
        "z-index": 100,
      },
    },
    {
      selector: "node.highlighted.focused",
      style: {
        "background-color": "#fbbf24",
        "border-color": "#f59e0b",
        "z-index": 200,
      },
    },
    {
      selector: "edge.highlighted",
      style: {
        opacity: 1,
        "line-color": c.accent,
        "target-arrow-color": c.accent,
        "line-dash-pattern": [10, 6],
        "z-index": 50,
      },
    },
    {
      selector: "edge.highlighted.broken",
      style: {
        "line-color": c.brokenColor,
        "target-arrow-color": c.brokenColor,
      },
    },
    { selector: ".dim", style: { opacity: 0.12 } },
    { selector: "edge.dim", style: { opacity: 0.06 } },

    // ghost nodes (broken-link targets that don't exist as services)
    {
      selector: "node.ghost",
      style: {
        "background-color": c.bg,
        "border-color": c.brokenColor,
        "border-style": "dashed",
        "border-width": 1.5,
        color: c.brokenColor,
        "font-style": "italic",
      },
    },
  ];
}

const layoutOptions = {
  name: "cose-bilkent",
  nodeRepulsion: 8000,
  idealEdgeLength: 120,
  edgeElasticity: 0.45,
  gravity: 0.25,
  numIter: 2500,
  tile: true,
  animate: false,
  randomize: true,
  fit: true,
  padding: 30,
} as unknown as cytoscape.LayoutOptions;

export function createGraph(
  container: HTMLElement,
  infra: InfraJson,
  presetPositions?: Record<string, { x: number; y: number }>,
): Core {
  const colors = readThemeColors();

  const cy = cytoscape({
    container,
    elements: buildElements(infra),
    minZoom: 0.1,
    maxZoom: 4,
    style: buildStylesheet(colors) as unknown as cytoscape.StylesheetCSS[],
  });

  if (presetPositions && Object.keys(presetPositions).length > 0) {
    cy.nodes().forEach((n) => {
      const p = presetPositions[n.id()];
      if (p) n.position(p);
    });
    cy.fit(undefined, 30);
  } else {
    cy.layout(layoutOptions).run();
  }
  return cy;
}

export function updateGraph(cy: Core, infra: InfraJson): void {
  cy.elements().remove();
  cy.add(buildElements(infra));
  cy.layout(layoutOptions).run();
}

export function applyThemeColors(cy: Core): void {
  const colors = readThemeColors();
  cy.style(buildStylesheet(colors) as unknown as cytoscape.StylesheetCSS[]);
}
