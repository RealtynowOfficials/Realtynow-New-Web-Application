import { Link } from 'react-router-dom';

export function Logo({ to = '/', className = '', size = 165, src = '/1.png' }: { to?: string; className?: string; size?: number; src?: string }) {
  return (
    <Link to={to} className={`flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt="RealtyNow"
        style={{ width: size, height: 'auto', maxHeight: '42px', objectFit: 'contain' }}
      />
    </Link>
  );
}

export function LogoLight({
  to = '/',
  className = '',
  size = 165,
  src = '/1.png'
}: {
  to?: string;
  className?: string;
  size?: number;
  src?: string;
}) {
  return (
    <Link to={to} className={`flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt="RealtyNow"
        style={{ width: size, height: 'auto', maxHeight: '42px', objectFit: 'contain' }}
      />
    </Link>
  );
}
