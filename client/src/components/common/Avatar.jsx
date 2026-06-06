import { useState } from 'react';

const Avatar = ({
  src,
  name = '',
  size = 32,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // Fallback to initials when:
  // 1. No image provided
  // 2. Image fails to load
  if (!src || imageError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setImageError(true)}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    />
  );
};

export default Avatar;