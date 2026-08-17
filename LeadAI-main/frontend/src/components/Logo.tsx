import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${dimensions} relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20`}>
        <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center font-extrabold text-white tracking-tighter">
          <span className="gradient-text">AI</span>
        </div>
      </div>
      <div>
        <div className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
          Lead<span className="text-purple-400 font-black">AI</span>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
          Enterprise B2B Growth
        </div>
      </div>
    </div>
  );
};
