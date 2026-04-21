import { motion, HTMLMotionProps } from 'framer-motion';

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export default function AnimatedButton({ children, variant = 'primary', fullWidth, className = '', ...props }: AnimatedButtonProps) {
  const baseStyles = 'relative overflow-hidden rounded-xl font-medium transition-all flex items-center justify-center gap-2';
  const widthStyles = fullWidth ? 'w-full px-4 py-3' : 'px-4 py-2';
  
  let variantStyles = '';
  if (variant === 'primary') {
    variantStyles = 'bg-primary text-background hover:bg-primary-light shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]';
  } else if (variant === 'secondary') {
    variantStyles = 'bg-surface border border-surface-border text-white hover:bg-surface-light';
  } else {
    variantStyles = 'bg-transparent text-text-secondary hover:text-white hover:bg-white/5';
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${widthStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
