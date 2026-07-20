import React from 'react';

interface TurkishLiraIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function TurkishLiraIcon({ className = "w-4 h-4", ...props }: TurkishLiraIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Vertical stem that curves to the right at the bottom */}
      <path d="M12 3v14.5c0 2.5 2 3.5 5 3.5" />
      {/* Two upward-slanted parallel lines */}
      <path d="M8 10.5l7.5-2.5" />
      <path d="M8 14.5l7.5-2.5" />
    </svg>
  );
}
