import { ExternalLink, Github, X } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import { useState } from 'react';
import ReactDOM from 'react-dom';
import { badgeVariant, buttonVariants, cardVariant, linkVariant, modalPanelVariant, overlayVariant } from './ui/variants';

const Projects = ({ darkMode }) => {
  const revealRef = useScrollReveal(0.2);
  const [selectedProject, setSelectedProject] = useState(null);

  const closeModal = () => setSelectedProject(null);
  const projects = [
    {
      title: '다시,봄',
      description_sub: '프로젝트 기간 : 2024.12.22 ~ 1.23',
      description: '친환경 제품을 판매하기 위한 목적으로 제작한 전자상거래 사이트입니다.',
      image: {
        light: '/2trillionmarket_light.png',
        dark: '/2trillionmarket_dark.png',
      },
      tags: ['Node.js', 'Vite React', 'Tailwind CSS', 'Tanstack', 'zustand'],
      liveLink: 'https://2trillionmarket.netlify.app/',
      githubLink: 'https://github.com/FRONTENDBOOTCAMP-11th/againSpring_shop/tree/main',
    },
    {
      title: '테니스 플로우 (진행중)',
      description_sub: '프로젝트 기간 : ~ing',
      description: '테니스 라켓 / 스트링 교체,판매 및 아카데미 관리 목적으로 제작한 사이트입니다.',
      image: {
        light: '/ddokaebi-tennis_light.png',
        dark: '/ddokaebi-tennis_dark.png',
      },
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

  const modalContainer = document.getElementById('modal-root') || document.body;

  const modal =
    selectedProject &&
    ReactDOM.createPortal(
      <div className={overlayVariant} onClick={closeModal}>
        <div className={`${modalPanelVariant} relative max-w-lg w-full mx-2`} onClick={(e) => e.stopPropagation()}>
          <button className="absolute top-2 right-2 text-muted hover:text-foreground" onClick={closeModal}>
            <X size={20} />
          </button>

          <h3 className="text-xl font-bold mb-2">{selectedProject.title}</h3>
          <p className="mb-2 text-muted">{selectedProject.description_sub}</p>
          <p className="mb-4">{selectedProject.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedProject.tags.map((tag) => (
              <span key={tag} className={badgeVariant}>
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-4">
            <a href={selectedProject.liveLink} target="_blank" rel="noopener noreferrer" className={linkVariant}>
              <ExternalLink size={16} /> 배포 사이트
            </a>
            <a href={selectedProject.githubLink} target="_blank" rel="noopener noreferrer" className={linkVariant}>
              <Github size={16} /> GitHub
            </a>
          </div>
        </div>
      </div>,
      modalContainer,
    );
  return (
    <section ref={revealRef} id="projects" className="py-20 bg-muted-surface opacity-0 transform translate-y-10 transition-opacity duration-1000 ease-out">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">프로젝트</h2>
          <div className="w-20 h-1 section-divider mx-auto mb-8"></div>
          <p className="text-lg text-muted">완성도는 낮을지 몰라도 의지 100%로 만든 프로젝트 입니다</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="group relative">
              <div className={`${cardVariant} overflow-hidden p-0 transition-transform hover:scale-[1.02]`}>
                <img src={typeof project.image === 'object' ? (darkMode ? project.image.dark : project.image.light) : project.image} alt={project.title} className="container mx-auto h-80 object-cover" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => setSelectedProject(project)} className={buttonVariants.outline}>
                  자세히 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedProject && modal}
    </section>
  );
};

export default Projects;
