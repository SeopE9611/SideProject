const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <a href="#" className="text-2xl font-bold">
              SeopE
            </a>
          </div>

          <div className="text-center md:text-right">
            <p>&copy; {currentYear} 한번 더 갈아엎어야하는 포트폴리오. All Rights Reserved.</p>
            <p className="text-sm text-gray-400 mt-1">Made with React and Tailwind by SeopE</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
