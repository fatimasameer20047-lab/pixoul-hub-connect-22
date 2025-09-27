import React from 'react';

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function UserAvatar({ name, size = 'md', color = '#6366F1' }: UserAvatarProps) {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium`}
      style={{ backgroundColor: color }}
    >
      {getInitials(name || 'User')}
    </div>
  );
}