interface IconProps {
  icon: IconType;

  // The optional class name.
  className?: string;

  // The size. Defaults to 24px.
  size?: number;
}

type IconType =
  | 'alert'
  | 'arrow-up'
  | 'bird'
  | 'check'
  | 'clipboard'
  | 'close'
  | 'edit'
  | 'external-link'
  | 'filter'
  | 'more-horizontal'
  | 'more-vertical'
  | 'plus'
  | 'refresh'
  | 'reset'
  | 'search'
  | 'terminal'
  | 'thumb-down'
  | 'thumb-up'
  | 'trash'
  | 'user'
  | 'collapse-down'
  | 'collapse-up';

/**
 *  @deprecated Use tabler icons instead for a more consisten look
 */
export function Icon(props: IconProps) {
  const { className, icon, size } = props;

  const actualSize = size || 24;

  switch (icon) {
    case 'alert':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      );
    case 'arrow-up':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      );
    case 'bird':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 388.59 270.164"
        >
          <path d="M182.422 0c-6.008 0-10.879 8.119-10.879 18.133 0 4.082.818 7.835 2.184 10.865a123.297 123.297 0 0 0-87.405 117.871 123.297 123.297 0 0 0 .196 2.725l-61.067-9.906c-3.422-.556-6.908-1.11-10.342-.627-3.433.483-6.87 2.172-8.62 5.166a8.651 8.651 0 0 0 5.884 12.808c-2.659.037-5.296.344-7.629 1.559-3.29 1.713-5.62 5.876-4.015 9.22a8.277 8.277 0 0 0 1.92 2.428 17.606 17.606 0 0 0 18.521 3.143c-2.5 3.586-7.462 4.117-11.754 4.947-4.292.83-9.252 3.258-9.412 7.627-.18 4.909 5.661 7.518 10.47 8.518a137.417 137.417 0 0 0 76.823-6.262 30.98 30.98 0 0 0 5.512-2.61 123.297 123.297 0 0 0 116.81 84.56 123.297 123.297 0 0 0 110.424-68.907l13.705 26.076c1.613 3.07 3.263 6.189 5.713 8.643 2.45 2.453 5.866 4.185 9.31 3.785a8.6 8.6 0 0 0 6.78-12.3 16.643 16.643 0 0 0 5.752 5.06c3.346 1.6 8.074.961 9.783-2.33a8.275 8.275 0 0 0 .787-2.995 17.606 17.606 0 0 0-8.62-16.693c4.368-.157 7.776 3.49 11.019 6.422 3.243 2.931 8.164 5.437 11.752 2.94 4.03-2.808 2.607-9.045.515-13.489a137.419 137.419 0 0 0-51.174-57.637 30.975 30.975 0 0 0-2.48-1.433 123.297 123.297 0 0 0 .031-.438A123.297 123.297 0 0 0 221.033 24.117c-1.83-5.717-5.441-9.611-9.601-9.611-3.383 0-6.368 2.627-8.364 6.664-1.758-6.07-5.452-10.291-9.767-10.291a6.563 6.563 0 0 0-.871.146C190.77 4.545 186.916 0 182.422 0Zm-31.379 85.96a41.087 41.087 0 0 1 28.094 70.806 36.967 36.967 0 0 0-56.742 0c-.46-.44-.91-.888-1.348-1.348a41.087 41.087 0 0 1 21.92-68.711 41.087 41.087 0 0 1 8.076-.746zm110.936 0a41.087 41.087 0 0 1 28.093 70.806 36.967 36.967 0 0 0-56.742 0c-.46-.44-.909-.888-1.347-1.348a41.087 41.087 0 0 1 21.92-68.711 41.087 41.087 0 0 1 8.076-.746zm-55.143 59.831 18.248 53.94-45.625 33.708z" />
          <circle cx="136.75" cy="113.055" r="14.134" />
          <circle cx="247.682" cy="113.055" r="14.134" />
        </svg>
      );
    case 'check':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      );
    case 'clipboard':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      );
    case 'close':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      );
    case 'edit':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      );
    case 'external-link':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      );
    case 'filter':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      );
    case 'more-horizontal':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
      );
    case 'more-vertical':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      );
    case 'plus':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      );
    case 'refresh':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1 4 1 10 7 10"></polyline>
          <polyline points="23 20 23 14 17 14"></polyline>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
        </svg>
      );
    case 'reset':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" />
        </svg>
      );

    case 'search':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      );
    case 'terminal':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      );
    case 'thumb-down':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
        </svg>
      );
    case 'thumb-up':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      );
    case 'trash':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      );
    case 'user':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      );
    case 'collapse-down':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case 'collapse-up':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={actualSize}
          height={actualSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      );
  }
}
