import { useEffect, useRef } from 'react';

// useScrollReveal custom hook - 요소가 뷰포트에 일정 비율 이상이 보이면 'fade-in' 클래스를 추가.
const useScrollReveal = (threshold = 0.1) => {
  // threshold 매개변수는 기본값이 0.1 (요소가 10% 보이면 애니메이션 효과를 트리거)
  const elementRef = useRef(null); // 관찰할 요소에 대한 참조를 생성

  useEffect(() => {
    const element = elementRef.current; // 실제 DOM 요소에 접근
    if (!element) return; // 요소가 없으면 진행 X

    // IntersectionObserver 생성
    const observer = new IntersectionObserver(
      ([entry]) => {
        // entry.inIntersectiong이 true이면 요소가 뷰포트 내에 일정 비율 이상 보임
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in'); // fade-in 클래스 추가
          observer.unobserve(entry.target); // 한번 애니메이션이 실행되면 중지
        }
      },

      {
        // thershold: 요소가 보이는 비율을 설정
        threshold: 0.5, // 이 값을 높이면 요소가 일정 비율 이상 보일 때까지 애니메이션이 실행되지 않음

        // rootMargin: 뷰포트 경계에 대해 추가적인 마진을 설정
        rootMargin: '0px 0px -100px 0px', // 음수 값을 늘리면 요소가 뷰포트에 들어오기 전에 애니메이션을 늦출 수 있음
      }
    );

    observer.observe(element); // oberver를 이용해 실제 DOM 요소를 감시하기 시작.

    // 컴포넌트가 언마운트될 때 옵저버를 해제하여 메모리 누수 방지
    return () => observer.disconnect();
  }, [threshold]); // threshold 값이 변경되면 재실행
  // 관찰할 DOM 요소의 ref를 반환하고 이 ref를 각 컴포넌트의 ref 속성에 할당하면,
  // 해당 요소가 IntersectionObsever에 의해 감시됨.
  return elementRef;
};

export default useScrollReveal;
