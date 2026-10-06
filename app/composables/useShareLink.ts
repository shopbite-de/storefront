/**
 * Shares the current page (#411): the native share sheet where the browser
 * has one (phones: WhatsApp, messages …), otherwise the link is copied and
 * a toast confirms it. `canShare` is false during SSR and the first render,
 * so the button's icon does not cause a hydration mismatch.
 *
 * With a `productNumber`, a completed share or copy is tracked in Matomo
 * together with the shared path (`useTrackEvent().trackShare`).
 */
export function useShareLink() {
  const toast = useToast();
  const { trackShare } = useTrackEvent();
  const canShare = ref(false);

  onMounted(() => {
    canShare.value = typeof navigator.share === "function";
  });

  async function share({
    title,
    productNumber,
  }: { title?: string; productNumber?: string } = {}) {
    const url = window.location.href;
    const { pathname, search, hash } = window.location;
    const track = (method: "share" | "copy") => {
      if (productNumber)
        trackShare(method, productNumber, pathname + search + hash);
    };

    if (canShare.value) {
      try {
        await navigator.share({ title, url });
        track("share");
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
      track("copy");
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
