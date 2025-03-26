import { ExternalLink, Github } from 'lucide-react';

const Projects = () => {
  const projects = [
    {
      title: '다시,봄',
      description_sub: '프로젝트 기간 : 2024.12.22 ~ 1.23',
      description: '친환경 제품을 판매하기 위한 목적으로 제작한 전자상거래 사이트입니다.',
      image: 'src/assets/2trillionmarket.png',
      tags: ['Node.js', 'Vite React', 'Tailwind CSS', 'Tanstack', 'zustand'],
      liveLink: 'https://2trillionmarket.netlify.app/',
      githubLink: 'https://github.com/FRONTENDBOOTCAMP-11th/againSpring_shop/tree/main',
    },
    {
      title: '도깨비 테니스 아카데미 (진행중)',
      description_sub: '프로젝트 기간 : ~ing',
      description: '테니스 라켓 / 스트링 교체,판매 및 아카데미 관리 목적으로 제작한 사이트입니다.',
      image: 'src/assets/ddokaebi-tennis.jpg',
      tags: ['React'],
      liveLink: '#',
      githubLink: '#',
    },
    {
      title: '샬롬의집 (예정)',
      description_sub: '프로젝트 기간 : null',
      description: '서울시 강서구 방화동에 위치한 장애인 공동체 복지관 사이트 입니다.',
      image: 'src/assets/shalom.png',
      tags: ['React'],
      liveLink: '#',
      githubLink: '#',
    },
  ];

  return (
    <section id="projects" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">프로젝트</h2>
          <div className="w-20 h-1 bg-blue-600 dark:bg-blue-400 mx-auto mb-8"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">완성도는 낮을지 몰라도 의지 100%로 만든 프로젝트 입니다 </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md transition-transform hover:scale-[1.02]">
              <img src={project.image || '/placeholder.svg'} alt={project.title} className="container mx-auto w-auto h-48 object-cover align-center" />
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{project.description_sub}</p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4">
                  <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                    <ExternalLink size={16} /> 배포 사이트 (Netlify)
                  </a>
                  <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                    <Github size={16} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
