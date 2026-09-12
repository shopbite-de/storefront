export default defineAppConfig({
  ui: {
    colors: {
      // Alias of the colour scale in main.css; a hex value here produced
      // invalid `var(--color-#ff5b00-*)` declarations (#319).
      primary: "brand",
    },
    drawer: {
      slots: {
        content: "fixed bg-default ring ring-default flex focus:outline-none",
      },
    },
  },
  toaster: {
    position: "bottom-right" as const,
    expand: false,
    duration: 2000,
  },
});
