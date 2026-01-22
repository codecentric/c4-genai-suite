import { useEffect, useState } from 'react';
import { cn } from 'src/lib';

interface LogoProps {
  // The file to use.
  previewLogo?: File | string | null;

  url?: string;

  // The size in rem.
  size?: string | { width?: string; height?: string };

  className?: string;

  key?: number;
}

export function Logo(props: LogoProps) {
  const { url, key, className, previewLogo, size } = props;

  const [path, setPath] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Resetting state and creating object URL when props change is a valid effect pattern */
  useEffect(() => {
    setLoaded(false);

    if (!previewLogo) {
      if (url != null) {
        setPath(url);
      }
      return;
    }

    if (typeof previewLogo === 'string') {
      setPath(`data:image/svg+xml;utf8,${encodeURIComponent(previewLogo)}`);
      return;
    }

    setPath(window.URL.createObjectURL(previewLogo));
  }, [url, previewLogo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return path ? (
    <img
      key={key}
      data-testid="logo-preview"
      style={typeof size === 'string' ? { width: size, height: size } : size}
      className={cn('object-scale-down', { invisible: !loaded }, className)}
      src={path}
      onLoad={() => setLoaded(true)}
      alt={'Logo'}
    />
  ) : (
    <div style={typeof size === 'string' ? { width: size, height: size } : size}></div>
  );
}
