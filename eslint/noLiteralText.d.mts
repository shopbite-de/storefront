import type { Rule } from "eslint";
export declare const noLiteralText: Rule.RuleModule;
export declare function readsLikeText(
  value: string,
  allow?: ReadonlySet<string>,
): boolean;
declare const plugin: { rules: Record<string, Rule.RuleModule> };
export default plugin;
