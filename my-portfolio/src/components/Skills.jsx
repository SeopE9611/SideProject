const Skills = () => {
  const skillCategories = [
    {
      title: '프론트엔드',
      skills: [
        { name: 'HTML', level: 0 },
        { name: 'CSS', level: 0 },
        { name: 'JavaScript', level: 0 },
        { name: 'React', level: 0 },
        { name: 'Tailwind CSS', level: 0 },
      ],
    },
    {
      title: '백엔드',
      skills: [
        { name: 'Node.js', level: 0 },
        { name: 'Express', level: 0 },
        { name: 'MongoDB', level: 0 },
        { name: 'RESTful API', level: 0 },
      ],
    },
    {
      title: '도구 및 기타',
      skills: [
        { name: 'Git', level: 0 },
        { name: 'Vite', level: 0 },
        { name: 'Figma', level: 0 },
        { name: 'UI/UX', level: 0 },
      ],
    },
  ];

  return (
    <section id="skills" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">기술 스택</h2>
          <div className="w-20 h-1 bg-blue-600 dark:bg-blue-400 mx-auto mb-8"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">부트캠프와 유튜브 독학을 통해 습득한 기술들입니다.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {skillCategories.map((category) => (
            <div key={category.title} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">{category.title}</h3>
              <div className="space-y-4">
                {category.skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between mb-1">
                      <span>{skill.name}</span>
                      <span>{skill.level}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full" style={{ width: `${skill.level}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
