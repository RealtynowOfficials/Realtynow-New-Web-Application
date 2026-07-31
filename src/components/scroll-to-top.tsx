import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  useLocation();
  window.scrollTo({ top: 0, behavior: 'instant' });
  return null;
}
