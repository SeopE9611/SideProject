const KAKAO_POSTCODE_SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export type KakaoPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
};

type KakaoPostcodeSize = {
  width: number;
  height: number;
};

type KakaoPostcodeOptions = {
  oncomplete: (data: KakaoPostcodeData) => void;
  onresize?: (size: KakaoPostcodeSize) => void;
  width?: string;
  height?: string;
  maxSuggestItems?: number;
};

type KakaoPostcodeInstance = {
  embed: (element: HTMLElement) => void;
};

type KakaoPostcodeConstructor = new (options: KakaoPostcodeOptions) => KakaoPostcodeInstance;

declare global {
  interface Window {
    daum?: {
      Postcode?: KakaoPostcodeConstructor;
    };
    kakao?: {
      Postcode?: KakaoPostcodeConstructor;
    };
  }
}

let postcodeScriptPromise: Promise<void> | null = null;

export function getKakaoPostcodeConstructor() {
  return window.daum?.Postcode ?? window.kakao?.Postcode ?? null;
}

export async function loadKakaoPostcode(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (getKakaoPostcodeConstructor()) {
    return;
  }

  if (postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  postcodeScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_POSTCODE_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");

    const handleLoad = () => {
      if (getKakaoPostcodeConstructor()) {
        resolve();
        return;
      }

      postcodeScriptPromise = null;

      reject(new Error("Kakao postcode constructor is unavailable"));
    };

    const handleError = () => {
      postcodeScriptPromise = null;

      reject(new Error("Failed to load Kakao postcode script"));
    };

    script.src = KAKAO_POSTCODE_SCRIPT_URL;
    script.async = true;

    script.addEventListener("load", handleLoad, { once: true });

    script.addEventListener("error", handleError, { once: true });

    document.body.appendChild(script);
  });

  return postcodeScriptPromise;
}
