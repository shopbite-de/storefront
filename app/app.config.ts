export default defineAppConfig({
  ui: {
    colors: {
      primary: "#ff5b00",
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
