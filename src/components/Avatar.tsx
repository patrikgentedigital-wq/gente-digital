import React, { useEffect, useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  teamColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  className?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Preto sobre cores claras, branco sobre escuras (as cores das equipes vêm do cadastro). */
function readableInk(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#000000';
  const n = parseInt(m[1], 16);
  const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.55 ? '#000000' : '#ffffff';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  teamColor,
  size = 'md',
  shape = 'square',
  className = '',
  referrerPolicy = 'no-referrer',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const sizeClass = SIZE_CLASSES[size];

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy={referrerPolicy}
        onError={() => setHasError(true)}
        className={`${sizeClass} ${shapeClass} object-cover border border-line bg-app ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} ${shapeClass} flex items-center justify-center font-display font-bold select-none ${className}`}
      style={{ backgroundColor: teamColor || '#ffe708', color: readableInk(teamColor || '#ffe708') }}
      title={name}
    >
      {getInitials(name) || '?'}
    </div>
  );
};