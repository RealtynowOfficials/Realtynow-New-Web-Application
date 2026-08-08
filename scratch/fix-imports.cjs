const fs = require('fs');
const files = {
  'src/components/listing-promo-banner.tsx': './post-property-link',
  'src/components/post-property-banner.tsx': './post-property-link',
  'src/components/public-layout.tsx': './post-property-link',
  'src/components/portal-layout.tsx': './post-property-link',
  'src/pages/portal/my-properties.tsx': '../../components/post-property-link',
  'src/pages/portal/portal.tsx': '../../components/post-property-link',
  'src/pages/public/home.tsx': '../../components/post-property-link',
  'src/pages/public/search.tsx': '../../components/post-property-link'
};

for (const [file, path] of Object.entries(files)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/import \{ PostPropertyLink \} from '@\/components\/post-property-link';/g, `import { PostPropertyLink } from '${path}';`);
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed imports');
