import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section id="home" className="py-20 md:py-32">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            I'm <br />
            <span className="text-blue-600 dark:text-blue-400">SeopE9611</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">This is a small digital place that I'm creating.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#projects" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2">
              project <ArrowRight size={16} />
            </a>
            <a href="#contact" className="px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-md transition-colors">
              contact
            </a>
          </div>
        </div>
        {/* 이미지 추가하고 싶을 때 주석 해제 */}
        <div className="order-1 md:order-2 flex justify-center">
          <img src="src/assets/logo_light.png" alt="" />
          {/* <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
            <img src="/placeholder.svg?height=300&width=300" alt="프로필 이미지" className="w-60 h-60 md:w-72 md:h-72 rounded-full object-cover border-4 border-white dark:border-gray-800" />
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default Hero;
