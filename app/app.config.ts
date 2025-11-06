export default defineAppConfig({
  ui: {
    colors: {
      primary: "orange",
      gray: "cool",
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
