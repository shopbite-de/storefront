// @ts-check

/**
 * `shopbite/no-literal-text` (ADR 0002): a string in code that reads like
 * text for people is a UI text outside the locale files, in any language.
 * Write it into i18n/locales/<code>/<area>.json and use t() / $t().
 *
 * Checked: string and template literals in scripts and template
 * expressions, and static attribute values in templates (template text
 * itself is `vue/no-bare-strings-in-template`'s).
 *
 * Text by shape: a string with a space or an upper-case word ("Preis",
 * "Add to basket"); a word between placeholders (`${a} oder ${b}`,
 * `${n} min`) unless the whole is a class list; a lone word with space
 * around it (`.join(" und ")`).
 *
 * Text by position, any word but a message key: what a mustache renders
 * (`{{ open ? "offen" : "zu" }}`), a text attribute or prop (`aria-*`,
 * `title`, `alt`, `placeholder`, `label`, … bound or static), a
 * `label`/`title`/`description`-like property, and a name the template
 * renders that the script set to a string (`const label = ref("…")`).
 *
 * Not text, by shape: message keys and other lower-case identifiers
 * (`order.cart.title`, `konto-profil`, `produkt`, `isHydrating`), paths and
 * URLs, constants and codes (`EUR`, `UND_ERR_SOCKET`), CSS class lists and
 * values, SVG path data, CSP keywords, time zones and media types, strings
 * without letters. Not text, by place: code attributes (`:class`,
 * `:autocomplete`, `:to`, …), import sources, object keys, type literals,
 * comparisons with `===`/`!==`, the key of `t()`, messages for developers
 * (`new Error(…)`, `console.*(…)`, `create…Error(…)`, `invalidValue(…)`).
 * Anything else that has to stay (a protocol word, backend data) gets an
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
  if (CSP_KEYWORD.test(text)) return false;
  if (text.split(/\s+/).every((token) => CLASS_TOKEN.test(token))) {
    return false;
  }
  return true;
}

/**
 * A letters-only word with a space on one side and a space or a placeholder
 * on the other (`${a} oder ${b}`, `${n} min`), not a unit (`${n}px`).
 */
const SPACED_WORD = /(?:^|\s)\p{L}{2,}\s|\s\p{L}{2,}(?:\s|$)/u;
/** A quoted CSP keyword (`'self'`, `'unsafe-inline'`). */
const CSP_KEYWORD = /^'[a-z-]+'$/;
/** A lone word with space around it, as `.join(" und ")` takes it. */
const PADDED_WORD = /^(?:\s+\p{L}+\s*|\s*\p{L}+\s+)$/u;
/** A class list token that only a class list has (`gap-2`, `sm:flex`). */
const UTILITY_TOKEN = /[-:[\]/!0-9]/;
/** A message key (`order.cart.title`). */
const KEY = /^[a-z][\w-]*(?:\.[\w-]+)+$/;

/**
 * Template attributes and component props whose value people read, bound
 * or static (the list of `vue/no-bare-strings-in-template` plus `text`).
 */
const TEXT_ATTRIBUTES = new Set([
  "title",
  "alt",
  "placeholder",
  "label",
  "hint",
  "legend",
  "description",
  "trailing",
  "text",
  "confirm-label",
  "cancel-label",
  "item-name",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
]);

/** Object keys whose value people read (`{ label: … }`, a toast's fields). */
const TEXT_KEYS = new Set([
  "title",
  "label",
  "description",
  "placeholder",
  "alt",
  "hint",
  "text",
  "ariaLabel",
  "aria-label",
]);

/** `confirmLabel` → `confirm-label`. @param {string} name */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Callees whose string arguments are for developers, not guests. */
const DEVELOPER_CALL =
  /^(?:console\.\w+|(?:[A-Z]\w*)?Error|create\w*Error|invalidValue)$/;

/** Callees whose string argument is a message key. */
const TRANSLATE_CALL = /^(?:\$?t|i18n\.t|\$i18n\.t)$/;

/** @param {any} callee */
function calleeName(callee) {
  if (!callee) return "";
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && !callee.computed) {
    return `${calleeName(callee.object)}.${callee.property.name}`;
  }
  return "";
}

/**
 * The node an expression's value flows into, through the nodes that pass a
 * string on as it is (conditionals' branches, `||`/`??`, `+`, `as`).
 * @param {any} node
 */
function valueTarget(node) {
  let child = node;
  let parent = node.parent;
  while (
    parent &&
    (parent.type === "TemplateLiteral" ||
      (parent.type === "BinaryExpression" && parent.operator === "+") ||
      (parent.type === "ConditionalExpression" && parent.test !== child) ||
      parent.type === "LogicalExpression" ||
      parent.type === "TSAsExpression" ||
      parent.type === "TSSatisfiesExpression")
  ) {
    child = parent;
    parent = parent.parent;
  }
  return { child, parent };
}

/** Whether a literal is in a place where it cannot be a UI text. @param {any} node */
function exempt(node) {
  let { child, parent } = valueTarget(node);
  // arrays of strings (`["Enter", "Escape"]`) count like their place
  while (parent?.type === "ArrayExpression") {
    ({ child, parent } = valueTarget(parent));
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
      return (
        DEVELOPER_CALL.test(calleeName(parent.callee)) ||
        TRANSLATE_CALL.test(calleeName(parent.callee))
      );
    default:
      return false;
  }
}

/**
 * Whether a string in a place people read it (a text attribute, a
 * mustache, a `label` property) is text: any word that is no message key.
 * @param {string} value
 */
const isTextValue = (value) => /\p{L}/u.test(value) && !KEY.test(value.trim());

/** Whether a template literal is a class list (`flex ${gap} sm:grid`). @param {any} literal */
function isClassList(literal) {
  const whole = literal.quasis
    .map((/** @type {any} */ quasi) => quasi.value.cooked ?? quasi.value.raw)
    .join(" ")
    .trim();
  const tokens = whole.split(/\s+/).filter(Boolean);
  return (
    tokens.every((token) => CLASS_TOKEN.test(token)) &&
    (tokens.length === 0 ||
      tokens.some((token) => UTILITY_TOKEN.test(token)) ||
      inClassPosition(literal))
  );
}

/** Whether a value goes into a `class` (attribute, property, variable). @param {any} node */
function inClassPosition(node) {
  const { child, parent } = valueTarget(node);
  if (!parent) return false;
  if (parent.type === "Property" && parent.value === child) {
    return /class/i.test(String(parent.key?.name ?? parent.key?.value ?? ""));
  }
  if (parent.type === "VariableDeclarator") {
    return /class/i.test(String(parent.id?.name ?? ""));
  }
  return false;
}

/** The template attribute an expression belongs to, if any. @param {any} node */
function attributeOf(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === "VAttribute") return current;
    if (current.type === "VElement") return null;
  }
  return null;
}

/** An attribute's name: `aria-label` for `:aria-label` and `:ariaLabel`. @param {any} attribute */
function attributeName(attribute) {
  const key = attribute.key;
  if (!attribute.directive) return kebab(key?.rawName ?? "");
  if (key?.name?.name !== "bind") return null;
  return key.argument?.type === "VIdentifier"
    ? kebab(key.argument.rawName)
    : null;
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
    const report = (node, value) =>
      context.report({
        node,
        messageId: "text",
        data: { text: value.trim().slice(0, 60) },
      });

    /**
     * Strings bound to a name in the script (`const label = ref("…")`,
     * `const label = "…"`), reported when the template renders the name.
     * @type {Map<string, { node: any, value: string }[]>}
     */
    const named = new Map();

    /**
     * Whether a literal's value lands in a text position: a `label`-like
     * property in the script, a text attribute or a mustache in a template.
     * @param {any} node
     */
    function textPosition(node) {
      const { child, parent } = valueTarget(node);
      if (parent?.type === "Property" && parent.value === child) {
        const key = parent.key?.name ?? parent.key?.value;
        return TEXT_KEYS.has(String(key));
      }
      if (parent?.type === "VExpressionContainer") {
        const attribute = attributeOf(parent);
        if (!attribute) return true; // {{ … }}
        const name = attributeName(attribute);
        return name !== null && TEXT_ATTRIBUTES.has(name);
      }
      return false;
    }

    /** Whether a template literal sits in a code attribute (`:class`). @param {any} node */
    function inCodeAttribute(node) {
      const attribute = attributeOf(node);
      if (!attribute) return false;
      const name = attributeName(attribute);
      return (
        name !== null &&
        (CODE_ATTRIBUTES.has(name) || /^(?:data|stroke|fill)-/.test(name))
      );
    }

    /** @param {any} node @param {string} value */
    function checkString(node, value) {
      if (inCodeAttribute(node)) return;
      if (textPosition(node)) {
        if (isTextValue(value) && !exempt(node)) report(node, value);
        return;
      }
      if (exempt(node)) return;
      const padded =
        PADDED_WORD.test(value) &&
        !allow.has(value.trim()) &&
        !ALLOWED.has(value.trim());
      if (padded || readsLikeText(value, allow)) {
        report(node, value);
      }
    }

    /** @param {any} node */
    const literal = (node) => {
      if (typeof node.value !== "string") return;
      // `const label = ref("…")` / `const label = "…"`: maybe rendered
      const holder =
        node.parent?.type === "CallExpression" &&
        /^(?:ref|shallowRef)$/.test(calleeName(node.parent.callee))
          ? node.parent.parent
          : node.parent;
      if (
        holder?.type === "VariableDeclarator" &&
        holder.id?.type === "Identifier" &&
        holder.init &&
        (holder.init === node || holder.init === node.parent)
      ) {
        const list = named.get(holder.id.name) ?? [];
        list.push({ node, value: node.value });
        named.set(holder.id.name, list);
      }
      checkString(node, node.value);
    };

    /** @param {any} node */
    const templateElement = (node) => {
      const literalNode = node.parent;
      // a tagged template is code (`css\`…\``), its parts are no texts
      if (literalNode?.parent?.type === "TaggedTemplateExpression") return;
      if (inCodeAttribute(literalNode) || exempt(literalNode)) return;
      const value = node.value.cooked ?? node.value.raw;
      if (textPosition(literalNode)) {
        if (isTextValue(value)) report(node, value);
        return;
      }
      // a word between placeholders (`${a} oder ${b}`, `${n} min`)
      if (
        literalNode.expressions.length > 0 &&
        SPACED_WORD.test(value) &&
        !isClassList(literalNode)
      ) {
        report(node, value);
        return;
      }
      // a key or path built from parts (`auth.errors.${key}Moment`)
      const whole = literalNode.quasis
        .map(
          (/** @type {any} */ quasi) => quasi.value.cooked ?? quasi.value.raw,
        )
        .join("x");
      if (!readsLikeText(whole, allow)) return;
      // the static parts of `${count} Artikel`: text around placeholders
      if (readsLikeText(value.replace(/^\W+|\W+$/g, ""), allow)) {
        report(node, value);
      }
    };

    /** A name the template renders (`{{ label }}`, `:title="label"`). @param {any} node */
    function renderedName(node) {
      const target =
        node.type === "MemberExpression" &&
        !node.computed &&
        node.property?.name === "value"
          ? node.object
          : node;
      if (target.type !== "Identifier") return;
      if (!textPosition(node)) return;
      for (const entry of named.get(target.name) ?? []) {
        // a string the script already reported stays one report
        if (isTextValue(entry.value) && !readsLikeText(entry.value, allow)) {
          report(entry.node, entry.value);
        }
      }
      named.delete(target.name);
    }

    const script = {
      Literal: literal,
      TemplateElement: templateElement,
    };
    const template = {
      Literal: (/** @type {any} */ node) => {
        if (typeof node.value === "string") checkString(node, node.value);
      },
      TemplateElement: templateElement,
      "VExpressionContainer > Identifier": renderedName,
      "VExpressionContainer > MemberExpression": renderedName,
      "VExpressionContainer > ConditionalExpression > Identifier": renderedName,
      /** @param {any} node */
      "VAttribute[directive=false]"(node) {
        const name = kebab(node.key?.rawName ?? "");
        if (node.value?.type !== "VLiteral") return;
        if (CODE_ATTRIBUTES.has(name) || /^(?:data|stroke|fill)-/.test(name)) {
          return;
        }
        const value = node.value.value;
        if (
          TEXT_ATTRIBUTES.has(name)
            ? isTextValue(value)
            : readsLikeText(value, allow)
        ) {
          report(node.value, value);
        }
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
