import { useState } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { buttonVariants } from './ui/variants';

const Header = ({ darkMode, toggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { name: '소개', href: '#about' },
    { name: '기술', href: '#skills' },
    { name: '프로젝트', href: '#projects' },
    { name: '연락처', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-token shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="#" className="text-2xl font-bold">
          SeopE
        </a>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <a key={item.name} href={item.href} className="text-muted hover:text-foreground transition-colors">
              {item.name}
            </a>
          ))}
          <button onClick={toggleDarkMode} className={`${buttonVariants.ghost} !p-2 rounded-full`} aria-label={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>

        <div className="flex items-center md:hidden">
          <button onClick={toggleDarkMode} className={`${buttonVariants.ghost} !p-2 mr-2 rounded-full`} aria-label={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={toggleMenu} className={`${buttonVariants.ghost} !p-2 rounded-full`}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-card border-b border-token shadow-md md:hidden">
            <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {navItems.map((item) => (
                <a key={item.name} href={item.href} className="text-muted hover:text-foreground transition-colors" onClick={toggleMenu}>
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
