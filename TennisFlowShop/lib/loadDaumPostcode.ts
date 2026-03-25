const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let daumPostcodeScriptPromise: Promise<void> | null = null;

export async function loadDaumPostcode(): Promise<void> {
  if (typeof window === "undefined") return;
  if ((window as any).daum?.Postcode) return;
  if (daumPostcodeScriptPromise) return daumPostcodeScriptPromise;

  daumPostcodeScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`,
    );
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => resolve();
    const handleError = () => {
      daumPostcodeScriptPromise = null;
      reject(new Error("Failed to load Daum postcode script"));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.src = DAUM_POSTCODE_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
      return;
    }

    if (
      (window as any).daum?.Postcode ||
      (existingScript as any).readyState === "complete"
    ) {
      resolve();
    }
  });

  return daumPostcodeScriptPromise;
}
