import { useEffect, useRef, useState } from 'react';

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
  stepDuration?: number;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  onAnimationComplete,
  stepDuration = 0.35
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const durationMs = stepDuration * 1000 * 2;
  const animationName = direction === 'top' ? 'hsb-blur-text-top' : 'hsb-blur-text-bottom';

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!inView || !onAnimationComplete) return;
    const total = (elements.length - 1) * delay + durationMs;
    const t = window.setTimeout(() => onAnimationComplete(), total);
    return () => window.clearTimeout(t);
  }, [inView, elements.length, delay, durationMs, onAnimationComplete]);

  return (
    <p ref={ref} className={`blur-text ${className} flex flex-wrap`}>
      {elements.map((segment, index) => {
        const style: React.CSSProperties = inView
          ? {
              display: 'inline-block',
              animationName,
              animationDuration: `${durationMs}ms`,
              animationDelay: `${(index * delay) / 1}ms`,
              animationTimingFunction: 'cubic-bezier(0.2, 0.65, 0.3, 0.9)',
              animationFillMode: 'both',
              willChange: 'transform, filter, opacity'
            }
          : {
              display: 'inline-block',
              opacity: 0,
              filter: 'blur(10px)',
              transform: direction === 'top' ? 'translateY(-50px)' : 'translateY(50px)'
            };

        return (
          <span key={index} style={style}>
            {segment === ' ' ? ' ' : segment}
            {animateBy === 'words' && index < elements.length - 1 && ' '}
          </span>
        );
      })}
    </p>
  );
};

export default BlurText;
