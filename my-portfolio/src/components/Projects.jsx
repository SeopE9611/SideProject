import { ExternalLink, Github, X } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import { useState } from 'react';
import ReactDOM from 'react-dom';

const Projects = () => {
  // 스크롤 애니메이션 커스텀 훅
  const revealRef = useScrollReveal(0.2);

  // 선택된 프로젝트를 저장하는 state (모달이 열릴 때 사용)
  const [selectedProject, setSelectedProject] = useState(null);

  // 모달을 닫는 함수: selectedProject를 null로 설정
  const closeModal = () => setSelectedProject(null);
  const projects = [
    {
      title: '다시,봄',
      description_sub: '프로젝트 기간 : 2024.12.22 ~ 1.23',
      description: '친환경 제품을 판매하기 위한 목적으로 제작한 전자상거래 사이트입니다.',
      image: '/2trillionmarket.png',
      tags: ['Node.js', 'Vite React', 'Tailwind CSS', 'Tanstack', 'zustand'],
      liveLink: 'https://2trillionmarket.netlify.app/',
      githubLink: 'https://github.com/FRONTENDBOOTCAMP-11th/againSpring_shop/tree/main',
    },
    {
      title: '도깨비 테니스 아카데미 (진행중)',
      description_sub: '프로젝트 기간 : ~ing',
      description: '테니스 라켓 / 스트링 교체,판매 및 아카데미 관리 목적으로 제작한 사이트입니다.',
      image: '/ddokaebi-tennis.jpg',
      tags: ['React'],
      liveLink: '#',
      githubLink: '#',
    },
    {
      title: '샬롬의집 (예정)',
      description_sub: '프로젝트 기간 : null',
      description: '서울시 강서구 방화동에 위치한 장애인 공동체 복지관 사이트 입니다.',
      image: '/shalom.png',
      tags: ['React'],
      liveLink: '#',
      githubLink: '#',
    },
  ];

  // 모달이 렌더링될 컨테이너를 찾음
  // id가 modal-root인 요소가 없으면 fallback으로 document.body를 사용
  const modalContainer = document.getElementById('modal-root') || document.body;

  // 선택된 프로젝트가 있을 때 모달을 생성
  const modal =
    selectedProject &&
    ReactDOM.createPortal(
      // 전체화면 오버레이: 클릭 시 closeModal이 호출되어 모달이 닫힘
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={closeModal}>
        {/* 모달 내부 컨텐츠 영역 - onClick에서 e.stopPropagation()을 호출해 오버레이 클릭 이벤트 전파를 막음 */}
        {/* Q : 다른 섹션은 다크모드를 props로 전달 받지 않고 tailwind의 dark 접두사가 잘 작동하는데 project 섹션에는 왜 작동하지 않는가? */}
        {/* A : 다른 섹션은 부모 컨테이너가 dark 모드 클래스를 그대로 상속 받기 때문에 dark 접두사가 잘 작동하지만
            모달은 React Protal을 통해 document.body(혹은 별도의 modal-root)로 렌더링 되므로
            글로벌 dak 모드 클래스가 상속되지 않는다. 그래서 프로젝트 섹션에서는 darkMode prop을 받아 조건부 클래스로 직접 지정해 줘야한다. 
            만약 prop을 받지 않고 dark 접두사를 받으려면 모달이 dark 클래스가 적용된 DOM 계층 내에 존재해야한다.*/}

        <div className="bg-white/80 dark:bg-black/80 p-6 rounded shadow-lg relative max-w-lg w-full mx-2 text-black dark:text-white" onClick={(e) => e.stopPropagation()}>
          <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={closeModal}>
            <X size={20} />
          </button>

          {/* 모달 내부의 프로젝트 상세 정보 */}
          <h3 className="text-xl font-bold mb-2">{selectedProject.title}</h3>
          <p className="mb-2">{selectedProject.description_sub}</p>
          <p className="mb-4">{selectedProject.description}</p>
          {/* 프로젝트 태그 목록 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedProject.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                {tag}
              </span>
            ))}
          </div>
          {/* 외부링크 */}
          <div className="flex gap-4">
            <a href={selectedProject.liveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
              <ExternalLink size={16} /> 배포 사이트
            </a>
            <a href={selectedProject.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
              <Github size={16} /> GitHub
            </a>
          </div>
        </div>
      </div>,
      modalContainer // 모달을 렌더링할 컨테이너
    );

  return (
    <section ref={revealRef} id="projects" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        {/* 섹션 제목 */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">프로젝트</h2>
          <div className="w-20 h-1 bg-blue-600 dark:bg-blue-400 mx-auto mb-8"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">완성도는 낮을지 몰라도 의지 100%로 만든 프로젝트 입니다</p>
        </div>

        {/* 프로젝트 카드 리스트 */}
        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="group relative">
              {/* 카드 영역 */}
              <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md transition-transform hover:scale-[1.02]">
                <img src={project.image || '/placeholder.svg'} alt={project.title} className="container mx-auto h-64 object-cover" />
              </div>
              {/* 모달 오버레이(호버 시 "자세히 보기" 버튼이나타남) */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <button
                  onClick={() => setSelectedProject(project)}
                  className="opacity-0 group-hover:opacity-100
                  text-white border border-white px-4 py-2
                  rounded transition duration-300"
                >
                  자세히 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 선택된 프로젝트가 있을 경우 모달 렌더링 */}
      {selectedProject && modal}
    </section>
  );
};

export default Projects;
