      // afterSanitizeAttributes 훅으로 위험 요소 제거(타입 안전)
      DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        // 모든 on* 속성 제거
        // (DOMPurify 기본도 제거하지만 확실하게 한 번 더)
        for (const name in node) {
          // noop (TS 만족용)
        }

        // 앵커: javascript:, data: 차단 + rel 보정
        if (node instanceof jsdom.window.HTMLAnchorElement) {
          const href = node.getAttribute('href') || '';
          if (!/^https?:\/\//i.test(href)) {
            node.removeAttribute('href');
          }
          if (node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
          } else {
            // 그래도 안전하게 기본 rel 부여
            node.setAttribute('rel', 'noopener noreferrer');
          }
        }

        // 이미지: http/https만 허용(그 외 제거)
        if (node instanceof jsdom.window.HTMLImageElement) {
          const src = node.getAttribute('src') || '';
          if (!/^https?:\/\//i.test(src)) {
            // src 없애면 깨진 이미지 아이콘만 남으니 통째로 제거
            node.remove();
            return;
          }
          node.removeAttribute('srcset'); // srcset은 관리 안 할 거면 제거
        }

        // 이벤트 핸들러 속성(on*) 전부 제거
        // DOMPurify 기본 정책이 있지만 명시적으로 반복 제거
        Array.from(node.attributes ?? []).forEach((attr) => {
          const n = attr.name;
          if (/^on/i.test(n) || n === 'style') {
            node.removeAttribute(n);
          }
        });
      });
