import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  schema?: Record<string, any>;
  image?: string;
}

export function useSEO({ title, description, type = 'website', schema, image }: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // 1. Update Title
    const siteName = 'RealtyNow';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // 2. Update Description
    const metaDesc = document.querySelector('meta[name="description"]');
    const descText = description || 'Premium real estate properties for sale and rent in India.';
    if (metaDesc) {
      metaDesc.setAttribute('content', descText);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = descText;
      document.head.appendChild(meta);
    }

    // 3. Update Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    const url = `https://realtynow.in${location.pathname}${location.search}`;
    if (canonical) {
      canonical.setAttribute('href', url);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', url);
      document.head.appendChild(canonical);
    }

    // 4. Update Open Graph
    const updateOG = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    updateOG('og:title', fullTitle);
    updateOG('og:description', descText);
    updateOG('og:url', url);
    updateOG('og:type', type);
    if (image) updateOG('og:image', image);

    // 5. Update JSON-LD Schema
    let script = document.querySelector('#seo-schema');
    if (schema) {
      if (!script) {
        script = document.createElement('script');
        script.id = 'seo-schema';
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    } else if (script) {
      script.remove();
    }
  }, [title, description, type, schema, image, location.pathname, location.search]);
}
