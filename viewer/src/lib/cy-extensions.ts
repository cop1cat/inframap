// Register Cytoscape extensions once at module load. Importing this module
// has the side-effect of installing cose-bilkent and svg.

import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import svgExt from "cytoscape-svg";
import navigator from "cytoscape-navigator";
import "cytoscape-navigator/cytoscape.js-navigator.css";

cytoscape.use(coseBilkent);
cytoscape.use(svgExt);
cytoscape.use(navigator);

export {};
