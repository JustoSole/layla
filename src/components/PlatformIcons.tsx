import React from 'react';

interface PlatformIconProps {
  platform: 'Google' | 'TripAdvisor' | 'Facebook';
  size?: number;
  className?: string;
}

const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, size = 16, className = '' }) => {
  const commonProps = {
    width: size,
    height: size,
    className: `inline-block ${className}`,
  };

  switch (platform) {
    case 'Google':
      // Icono oficial de Google - logo completo
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <path 
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
            fill="#4285F4"
          />
          <path 
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
            fill="#34A853"
          />
          <path 
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
            fill="#FBBC05"
          />
          <path 
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
            fill="#EA4335"
          />
        </svg>
      );
    
    case 'TripAdvisor':
      // Icono oficial de TripAdvisor - logo real reconocible
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          {/* Fondo verde TripAdvisor */}
          <circle cx="12" cy="12" r="11" fill="#00AF87" stroke="#00AF87" strokeWidth="1"/>
          {/* Búho de TripAdvisor - versión más fiel */}
          <circle cx="8" cy="9.5" r="3.2" fill="white"/>
          <circle cx="16" cy="9.5" r="3.2" fill="white"/>
          <circle cx="8" cy="9.5" r="2.3" fill="#00AF87"/>
          <circle cx="16" cy="9.5" r="2.3" fill="#00AF87"/>
          <circle cx="8" cy="9.5" r="1.3" fill="white"/>
          <circle cx="16" cy="9.5" r="1.3" fill="white"/>
          <circle cx="8" cy="9.5" r="0.7" fill="#00AF87"/>
          <circle cx="16" cy="9.5" r="0.7" fill="#00AF87"/>
          {/* Pico más realista */}
          <path d="M12 12.5 L10.2 16 L13.8 16 Z" fill="#FFB400"/>
          {/* Cejas características */}
          <path d="M5 7 Q8 5.5 11 7" stroke="white" strokeWidth="1.2" fill="none"/>
          <path d="M13 7 Q16 5.5 19 7" stroke="white" strokeWidth="1.2" fill="none"/>
        </svg>
      );
    
    case 'Facebook':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <path 
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" 
            fill="#1877F2"
          />
          <path 
            d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.633H7.078v3.47h3.047v8.385a12.118 12.118 0 003.75 0v-8.385h2.796z" 
            fill="white"
          />
        </svg>
      );
    
    default:
      return null;
  }
};

export default PlatformIcon;
