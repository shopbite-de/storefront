import {
  compile,
  createCoreContext,
  fallbackWithLocaleChain,
  resolveValue,
  translate,
  type CoreOptions,
} from "@intlify/core-base";

/**
 * The shop's translator (ADR 0002) on vue-i18n's message engine
 * (`@intlify/core-base`): it evaluates the messages that modules/locale.ts
 * compiled at build time (message ASTs; static texts as strings), with
 * vue-i18n's placeholders, plurals and fallback, and without the message
 * compiler (`__INTLIFY_DROP_MESSAGE_COMPILER__`), so the browser gets
 * neither a compiler nor a request. The locale never changes, so nothing
 * here is reactive and one translator serves every request.
 */

/** Named values, or the count of a plural message (`{count}`, `{n}`). */
export type TranslateArg =
  number | Readonly<Record<string, unknown>> | undefined;

/** `t(key)`, `t(key, { name })`, `t(key, count)`, `t(key, { name }, count)`. */
export type ShopTranslate = (key: string, ...args: TranslateArg[]) => string;

export interface TranslatorOptions {
  locale: string;
  fallbackLocale: string | null;
  /** Compiled messages by locale code (`#shopbite-messages`). */
  messages: Readonly<Record<string, unknown>>;
}

/** Turns a message's parts into what the caller renders (`<i18n-t>`). */
export interface PartsProcessor {
  normalize: (values: unknown[]) => unknown;
  interpolate: (value: unknown) => unknown;
}

function context(options: TranslatorOptions, processor?: PartsProcessor) {
  const core: CoreOptions = {
    locale: options.locale,
    fallbackLocale: options.fallbackLocale ?? false,
    messages: options.messages as CoreOptions["messages"],
    // nested keys (`menu.cart.title`) and vue-i18n's fallback chain
    messageResolver: resolveValue,
    localeFallbacker: fallbackWithLocaleChain,
    messageCompiler: compile,
    missingWarn: false,
    fallbackWarn: false,
  };
  if (processor) {
    (core as { processor?: unknown }).processor = {
      ...processor,
      type: "vnode",
    };
  }
  return createCoreContext(core);
}

export function createTranslator(options: TranslatorOptions) {
  const text = context(options);
  const t: ShopTranslate = (key, ...args) =>
    String(
      (translate as (...all: unknown[]) => unknown)(
        text,
        key,
        ...args.filter((arg) => arg !== undefined),
      ),
    );
  /** A message's parts, its placeholders filled with `named` (`<i18n-t>`). */
  const parts = (
    processor: PartsProcessor,
    key: string,
    named: Readonly<Record<string, unknown>>,
    plural?: number,
  ): unknown => {
    const ctx = context(options, processor);
    return plural === undefined
      ? (translate as (...all: unknown[]) => unknown)(ctx, key, named)
      : (translate as (...all: unknown[]) => unknown)(ctx, key, named, plural);
  };
  return { t, parts };
}

export type Translator = ReturnType<typeof createTranslator>;
