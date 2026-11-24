// @ts-check
import { germanWords } from "./germanText.mjs";

/**
 * `shopbite/no-german-text` (ADR 0002): a string literal in a script or a
 * template expression that reads German is a UI text outside the locale
 * files. Write it into i18n/locales/<code>/<area>.json and use t().
 * Identifier-like strings (`"konto-profil"`, `"ohne"`: route names, query
 * parameters) are not texts. Backend data and protocols that stay German
 * (Shopware's property group names, the order comment's "Wunschlieferzeit")
 * are disabled with a comment that says why.
 */

// route names, query parameters, constants and error codes (`UND_ERR_SOCKET`)
const IDENTIFIER = /^(?:[a-z0-9][a-z0-9_.:/-]*|[A-Z0-9][A-Z0-9_]*)$/;

/** @param {string} text */
function wordsOf(text) {
  const trimmed = text.trim();
  if (!trimmed || IDENTIFIER.test(trimmed)) return [];
  return germanWords(trimmed);
}

/** @type {import("eslint").Rule.RuleModule} */
export const noGermanText = {
  meta: {
    type: "problem",
    docs: {
      description:
        "UI texts belong in the locale files (i18n/locales), not in code (ADR 0002)",
    },
    messages: {
      german:
        'German text "{{words}}" outside the locale files: move it to i18n/locales/<code>/<area>.json and translate it with t() (ADR 0002).',
    },
    schema: [],
  },
  create(context) {
    /** @param {import("estree").Node} node @param {string} text */
    const check = (node, text) => {
      const words = wordsOf(text);
      if (words.length) {
        context.report({
          node,
          messageId: "german",
          data: { words: words.join(" ") },
        });
      }
    };
    const visitors = {
      /** @param {import("estree").Literal} node */
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      /** @param {import("estree").TemplateElement} node */
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
    const services = /** @type {any} */ (context.sourceCode.parserServices);
    if (services?.defineTemplateBodyVisitor) {
      return services.defineTemplateBodyVisitor(visitors, visitors);
    }
    return visitors;
  },
};

export default { rules: { "no-german-text": noGermanText } };
