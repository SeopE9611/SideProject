import useScrollReveal from '../hooks/useScrollReveal';

const About = () => {
  const revealRef = useScrollReveal(0.2);
  return (
    <section ref={revealRef} id="about" className=" py-20 bg-gray-50 dark:bg-gray-800 opacity-0 transform translate-y-10 transition-opacity duration-1000 ease-out">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">소개</h2>
          <div className="w-20 h-1 bg-blue-600 dark:bg-blue-400 mx-auto mb-8"></div>
        </div>

        <div className="max-w-4xl mx-auto">
          <p className="text-lg mb-6">"안녕하세요! 코딩과 커피를 사랑하는 주니어 개발자입니다. 이곳은 제가 만들어가는 작은 디지털 놀이터에요."</p>
          <p className="text-lg mb-6">저는 사용자 중심의 웹 애플리케이션을 개발하는 것을 좋아하는 프론트엔드 개발자입니다. React, JavaScript, HTML, CSS를 활용하여 반응형 웹사이트와 웹 애플리케이션을 구축하는 데 전문성을 가지고 있습니다.</p>

          <p className="text-lg mb-6">사용자 경험을 향상시키는 직관적인 인터페이스를 만드는 것에 열정을 가지고 있으며, 최신 웹 기술과 트렌드를 지속적으로 학습하고 있습니다. 팀 협업을 통해 문제를 해결하고 혁신적인 솔루션을 개발하는 것을 즐깁니다.</p>

          <p className="text-lg">저의 목표는 기술적 전문성과 창의성을 결합하여 사용자에게 가치를 제공하는 웹 애플리케이션을 개발하는 것입니다.</p>
        </div>
      </div>
    </section>
  );
};

export default About;
