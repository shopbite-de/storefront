import type { NavigationNode } from "../../shared/domain";

/** A navigation entry for component tests; a menu section by default. */
export function navNode(
  fields: Partial<NavigationNode> & Pick<NavigationNode, "label">,
): NavigationNode {
  return {
    id: fields.label.toLowerCase(),
    kind: "menu-section",
    path: null,
    external: false,
    icon: null,
    media: null,
    children: [],
    ...fields,
  };
}
