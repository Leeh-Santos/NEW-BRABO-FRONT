import { useState } from "react";
import { useToast } from "../components/ui/ToastProvider";

export function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { showToast } = useToast();

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast("Address copied to clipboard!", "success");
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    } catch {
      showToast("Failed to copy address", "error");
    }
  };

  return { copy, copiedKey };
}
