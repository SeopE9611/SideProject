import { ArrowRight } from 'lucide-react';
import { buttonVariants } from './ui/variants';

const Hero = () => {
  return (
    <section id="home" className="py-20 md:py-32">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            I'm <br />
            <span className="text-primary">SeopE9611</span>
          </h1>
          <p className="text-lg text-muted mb-8">This is a small digital place that I'm creating.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#projects" className={buttonVariants.primary}>
              project <ArrowRight size={16} />
            </a>
            <a href="#contact" className={buttonVariants.outline}>
              contact
            </a>
          </div>
        </div>
        <div className="order-1 md:order-2 flex justify-center">
          <img src="/logo_light.png" alt="" className="dark:hidden" />
          <img src="/logo_dark.png" alt="" className="hidden dark:block" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
