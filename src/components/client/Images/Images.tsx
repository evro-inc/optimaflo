'use client';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const BASE_BUTTON_CLASSES = 'rounded-md font-bold leading-none inline-block';

export const ImageIcon = ({ src, alt, width, height, ...props }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    if (resolvedTheme) {
      setThemeLoaded(true);
    }
  }, [resolvedTheme]);

  if (!themeLoaded) return null;

  return (
    <div
      className={`${BASE_BUTTON_CLASSES}`}
      {...props}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <div>
        <Image src={src} alt={alt} width={width} height={height} />
      </div>
    </div>
  );
};

export const Images = ({ src, alt, width, height }) => {
  return (
    <div className={`${BASE_BUTTON_CLASSES}`}>
      <Image src={src} alt={alt} width={width} height={height} className="rounded-xl" />
    </div>
  );
};

export const Logo = ({ src, alt, width, height }) => {
  return (
    <div className={`${BASE_BUTTON_CLASSES} w-12 h-12 md:w-24 md:h-24`}>
      <div>
        <Image src={src} alt={alt} width={width} height={height} />
      </div>
    </div>
  );
};
