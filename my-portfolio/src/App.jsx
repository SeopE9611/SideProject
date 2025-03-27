import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import useFullPageScroll from './hooks/useFullPageScroll';

function App() {
  useFullPageScroll();
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <main>
          <section className="section">
            <Hero />
          </section>
          <section className="section">
            <About />
          </section>
          <section className="section">
            <Skills />
          </section>
          <section className="section">
            <Projects />
          </section>
          <section className="section">
            <Contact />
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
