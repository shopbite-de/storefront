/**
 * Shares the current page (#411): the native share sheet where the browser
 * has one (phones: WhatsApp, messages …), otherwise the link is copied and
 * a toast confirms it. `canShare` is false during SSR and the first render,
 * so the button's icon does not cause a hydration mismatch.
 */
export function useShareLink() {
  const toast = useToast();
  const canShare = ref(false);

  onMounted(() => {
    canShare.value = typeof navigator.share === "function";
  });

  async function share({ title }: { title?: string } = {}) {
    const url = window.location.href;

    if (canShare.value) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet is no error.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.add({
        title: "Link kopiert",
        icon: "i-lucide-check",
        color: "success",
      });
    } catch {
      toast.add({
        title: "Link konnte nicht kopiert werden",
        description: url,
        color: "error",
      });
    }
  }

  return { share, canShare };
}
