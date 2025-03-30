import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import SpaceScene from './components/SpaceScene';

function App() {
  // useFullPageScroll(); ( 스크롤 스냅 미사용에 따른 주석처리)
  const [darkMode, setDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <main>
          <SpaceScene />
          <Projects darkMode={darkMode} />
          <Hero />
          <About />
          <Skills />
          <Contact />
        </main>
        <Footer />
        {/* modal-root를 dark 컨텍스트 내부에 배치 */}
        <div id="modal-root" />
      </div>
    </div>
  );
}

export default App;
