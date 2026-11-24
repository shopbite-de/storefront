// @ts-check

/**
 * `shopbite/no-literal-text` (ADR 0002): a string in code that reads like
 * text for people is a UI text outside the locale files, in any language.
 * Write it into i18n/locales/<code>/<area>.json and use t() / $t().
 *
 * Checked: string and template literals in scripts and template
 * expressions, and static attribute values in templates (template text
 * itself is `vue/no-bare-strings-in-template`'s). Not text, by shape:
 * message keys and other lower-case identifiers (`order.cart.title`,
 * `konto-profil`, `produkt`, `isHydrating`), paths and URLs, constants and
 * codes (`EUR`, `UND_ERR_SOCKET`), CSS class lists, time zones and media
 * types, and strings without letters. Not text, by place: import sources,
 * object keys, type literals, comparisons with `===`/`!==`, messages for
 * developers (`new Error(…)`, `console.*(…)`, `createError(…)`,
 * `createNotFoundError(…)`). Anything
 * else that has to stay (a protocol word, backend data) gets an
 * `eslint-disable-next-line` with the reason, or goes into `allow`.
 */

/** Words that are names, not texts: key names, headers, components. */
const ALLOWED = new Set([
  // KeyboardEvent.key
  "Enter",
  "Escape",
  "Tab",
  "Backspace",
  "Delete",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  // HTTP header names and auth schemes
  "Accept",
  "Authorization",
  "Bearer",
  "Cache-Control",
  "Content-Type",
  "Origin",
  "Referer",
  "Retry-After",
  "Sec-Fetch-Site",
  "User-Agent",
  "X-Forwarded-For",
  // schema.org types
  "Restaurant",
  "FAQPage",
  "Question",
  "Answer",
  "PostalAddress",
  "OpeningHoursSpecification",
  "PropertyValue",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

/** Template attributes whose values are code, not text. */
const CODE_ATTRIBUTES = new Set([
  "class",
  "style",
  "id",
  "name",
  "type",
  "role",
  "href",
  "src",
  "srcset",
  "sizes",
  "media",
  "to",
  "rel",
  "as",
  "tag",
  "keypath",
  "autocomplete",
  "inputmode",
  "pattern",
  "accept",
  "d",
  "points",
  "viewBox",
  "transform",
  "xmlns",
]);

/** Lower-case start, no spaces: keys, route names, params, paths, camelCase. */
const IDENTIFIER = /^[a-z0-9_$@#./:?&=%~+-][\w$@#./:?&=%~+,\][()*-]*$/;
/** Constants and codes. */
const CONSTANT = /^[A-Z0-9][A-Z0-9_.:-]*$/;
/** A PascalCase or camelCase name without spaces (a component, a type). */
const NAME = /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/;
/** URLs, `mailto:`, data URIs. */
const URL_LIKE = /^[a-z][a-z0-9+.-]*:\S*$/i;
/** IANA time zones and media types (`Europe/Berlin`, `text/plain; charset=utf-8`). */
const SLASHED = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+(?:;\s*[\w-]+=[\w-]+)*$/;
/** SVG path data (`M12 5v14`). */
const SVG_PATH = /^[Mm][\d\s.,MmZzLlHhVvCcSsQqTtAa-]*$/;
/** CSS values and media queries (`min(76rem, calc(100vw - 4rem))`). */
const CSS_VALUE = /^[a-z0-9\s(),.:%+*/-]+$/;
/** One token of a CSS class list (Tailwind variants and arbitrary values). */
const CLASS_TOKEN = /^!?-?[a-z0-9@*[(][a-z0-9:_./[\]()%#&>=,'"+!*@-]*$/;

/**
 * Whether a string reads like text for people.
 * @param {string} value
 * @param {ReadonlySet<string>} [allow]
 */
export function readsLikeText(value, allow = ALLOWED) {
  const text = value.trim();
  if (!/\p{L}/u.test(text)) return false;
  if (allow.has(text) || ALLOWED.has(text)) return false;
  if (IDENTIFIER.test(text) || CONSTANT.test(text) || NAME.test(text)) {
    return false;
  }
  if (URL_LIKE.test(text) || SLASHED.test(text)) return false;
  if (SVG_PATH.test(text) || CSS_VALUE.test(text)) return false;
  if (text.split(/\s+/).every((token) => CLASS_TOKEN.test(token))) {
    return false;
  }
  return true;
}

/** Callees whose string arguments are for developers, not guests. */
const DEVELOPER_CALL = /^(?:console\.\w+|(?:[A-Z]\w*)?Error|create\w*Error)$/;

/** @param {any} callee */
function calleeName(callee) {
  if (!callee) return "";
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && !callee.computed) {
    return `${calleeName(callee.object)}.${callee.property.name}`;
  }
  return "";
}

/** Whether a literal is in a place where it cannot be a UI text. @param {any} node */
function exempt(node) {
  let child = node;
  let parent = node.parent;
  // through template literals, concatenations, conditionals, arrays
  while (
    parent &&
    (parent.type === "TemplateLiteral" ||
      (parent.type === "BinaryExpression" && parent.operator === "+") ||
      (parent.type === "ConditionalExpression" && parent.test !== child) ||
      parent.type === "LogicalExpression" ||
      parent.type === "ArrayExpression" ||
      parent.type === "TSAsExpression" ||
      parent.type === "TSSatisfiesExpression")
  ) {
    child = parent;
    parent = parent.parent;
  }
  if (!parent) return false;
  switch (parent.type) {
    case "ImportDeclaration":
    case "ExportNamedDeclaration":
    case "ExportAllDeclaration":
    case "ImportExpression":
    case "TSLiteralType":
    case "TSExternalModuleReference":
    case "TSModuleDeclaration":
      return true;
    case "Property": {
      // a key, a JSON-LD keyword's value (`"@type": "Menu"`), or a
      // developer's message in createError({ message })
      if (parent.key === child) return true;
      const key = parent.key?.value ?? parent.key?.name;
      if (typeof key === "string" && key.startsWith("@")) return true;
      const call = parent.parent?.parent;
      return (
        call?.type === "CallExpression" &&
        DEVELOPER_CALL.test(calleeName(call.callee))
      );
    }
    case "MemberExpression":
      return parent.property === child;
    case "BinaryExpression":
      return ["===", "!==", "==", "!=", "in"].includes(parent.operator);
    case "SwitchCase":
      return parent.test === child;
    case "NewExpression":
    case "CallExpression":
      return DEVELOPER_CALL.test(calleeName(parent.callee));
    default:
      return false;
  }
}

/** @type {import("eslint").Rule.RuleModule} */
export const noLiteralText = {
  meta: {
    type: "problem",
    docs: {
      description:
        "UI texts belong in the locale files (i18n/locales), not in code (ADR 0002)",
    },
    messages: {
      text: 'Text "{{text}}" outside the locale files: move it to i18n/locales/<code>/<area>.json and translate it with t() (ADR 0002).',
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const allow = new Set(context.options[0]?.allow ?? []);
    /** @param {any} node @param {string} value */
    const check = (node, value) => {
      if (readsLikeText(value, allow) && !exempt(node)) {
        context.report({
          node,
          messageId: "text",
          data: { text: value.trim().slice(0, 60) },
        });
      }
    };
    /** @param {any} node */
    const literal = (node) => {
      if (typeof node.value === "string") check(node, node.value);
    };
    /** @param {any} node */
    const templateElement = (node) => {
      const literalNode = node.parent;
      // a tagged template is code (`css\`…\``), its parts are no texts
      if (literalNode?.parent?.type === "TaggedTemplateExpression") return;
      if (exempt(literalNode)) return;
      // a key or path built from parts (`auth.errors.${key}Moment`)
      const whole = literalNode.quasis
        .map(
          (/** @type {any} */ quasi) => quasi.value.cooked ?? quasi.value.raw,
        )
        .join("x");
      if (!readsLikeText(whole, allow)) return;
      const value = node.value.cooked ?? node.value.raw;
      // the static parts of `${count} Artikel`: text around placeholders
      if (readsLikeText(value.replace(/^\W+|\W+$/g, ""), allow)) {
        context.report({
          node,
          messageId: "text",
          data: { text: value.trim().slice(0, 60) },
        });
      }
    };
    const script = {
      Literal: literal,
      TemplateElement: templateElement,
    };
    const template = {
      ...script,
      /** @param {any} node */
      "VAttribute[directive=false]"(node) {
        const name = node.key?.rawName ?? "";
        if (node.value?.type !== "VLiteral") return;
        if (CODE_ATTRIBUTES.has(name) || /^(?:data|stroke|fill)-/.test(name)) {
          return;
        }
        check(node.value, node.value.value);
      },
    };
    const services = /** @type {any} */ (context.sourceCode.parserServices);
    if (services?.defineTemplateBodyVisitor) {
      return services.defineTemplateBodyVisitor(template, script);
    }
    return script;
  },
};

export default { rules: { "no-literal-text": noLiteralText } };
