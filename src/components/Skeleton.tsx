import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-surface-2/70 ${className}`}
  />
);