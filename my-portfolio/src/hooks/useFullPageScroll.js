// 스크롤 스냅 커스텀 훅 (현재 미사용)
// 적용 시 App.jsx에서 각 섹션에 .section 클래스 추가하기

import { useEffect } from 'react';

const useFullPageScroll = () => {
  useEffect(() => {
    let isScrolling = false;
    // 모든 섹션은 .section 클래스로 지정
    const sections = document.querySelectorAll('.section');

    const handleWheel = (e) => {
      e.preventDefault(); // 기본 스크롤 동작 방지
      if (isScrolling) return;
      isScrolling = true;
      const delta = e.deltaY;
      const currentScroll = window.scrollY;
      let targetSection = null;

      if (delta > 0) {
        // 아래로 스크롤: 현재 위치보다 아래에 있는 첫 번째 섹션 찾기
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].offsetTop > currentScroll + 10) {
            targetSection = sections[i];
            break;
          }
        }
      } else {
        // 위로 스크롤: 현재 위치보다 위에 있는 마지막 섹션 찾기
        for (let i = sections.length - 1; i >= 0; i--) {
          if (sections[i].offsetTop < currentScroll - 10) {
            targetSection = sections[i];
            break;
          }
        }
      }

      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }

      // 애니메이션 진행 시간(여기선 800ms) 동안 추가 스크롤 방지
      setTimeout(() => {
        isScrolling = false;
      }, 800);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
};

export default useFullPageScroll;
