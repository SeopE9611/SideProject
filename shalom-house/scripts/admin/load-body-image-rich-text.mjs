import { registerHooks } from "node:module";

// 기존 문서 검사기를 재사용합니다. 일반 앱 모듈 해석은 그대로 둡니다.
export async function loadBodyImageRichText() {
  const richTextUrl = new URL("../../src/features/news/news.rich-text.ts", import.meta.url);
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(context.parentURL === richTextUrl.href && specifier === "./body-image-reference"
        ? "./body-image-reference.ts" : specifier, context);
    },
  });
  return import(richTextUrl.href).finally(() => hook.deregister());
}
