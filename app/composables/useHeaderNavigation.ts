import type { NavigationMenuItem } from "@nuxt/ui";

export const useHeaderNavigation = async () => {
  const route = useRoute();

  const { data: navigationData } = await useAsyncData("navigation", () =>
    queryCollection("navigation").first(),
  );

  const navi = computed<NavigationMenuItem[]>(() => {
    if (!navigationData.value?.main) return [];

    return navigationData.value.main.map((item) => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      target: item.target,
      active:
        item.to === "/"
          ? route.path.length === 1
          : route.path.startsWith(item.to),
    }));
  });

  return {
    navigationData,
    navi,
  };
};
