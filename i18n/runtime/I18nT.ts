import {
  createTextVNode,
  defineComponent,
  Fragment,
  h,
  isVNode,
  type PropType,
} from "vue";
import { shopI18n } from "./shop";
import type { PartsProcessor } from "./translator";

const vnodes: PartsProcessor = {
  normalize: (values) =>
    values.map((value) =>
      Array.isArray(value) || isVNode(value)
        ? value
        : createTextVNode(String(value)),
    ),
  interpolate: (value) => value,
};

/**
 * `<i18n-t keypath="…">` with a named slot per placeholder, for sentences
 * with links or markup inside (messages hold no HTML): vue-i18n's
 * Translation component on the shop's translator.
 */
export default defineComponent({
  name: "I18nT",
  props: {
    keypath: { type: String, required: true },
    /** The element around the sentence; none by default. */
    tag: { type: String, default: undefined },
    plural: { type: [Number, String] as PropType<number | string> },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const named: Record<string, unknown> = {};
      for (const [name, slot] of Object.entries(slots)) {
        if (name !== "_" && slot) named[name] = slot();
      }
      const plural =
        props.plural === undefined ? undefined : Number(props.plural);
      const children = shopI18n.parts(vnodes, props.keypath, named, plural);
      const list = Array.isArray(children) ? children : [children];
      return props.tag
        ? h(props.tag, attrs, list as never)
        : h(Fragment, attrs, list as never);
    };
  },
});
