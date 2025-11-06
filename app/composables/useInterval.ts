import { onMounted, onUnmounted } from "vue";

export function useInterval(callback: () => void, interval: number) {
  let timer: NodeJS.Timeout | null = null;

  onMounted(() => {
    timer = setInterval(callback, interval);
  });

  onUnmounted(() => {
    if (timer !== null) {
      clearInterval(timer);
    }
  });
}
