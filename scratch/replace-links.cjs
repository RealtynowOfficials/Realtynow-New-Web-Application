const fs = require('fs');

const filesToUpdate = [
  'src/pages/portal/portal.tsx',
  'src/pages/portal/my-properties.tsx',
  'src/components/public-layout.tsx',
  'src/components/post-property-banner.tsx',
  'src/pages/public/search.tsx',
  'src/pages/public/home.tsx',
  'src/components/listing-promo-banner.tsx',
  'src/pages/portal/sections.tsx'
];

filesToUpdate.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;
  
  if (file === 'src/pages/portal/sections.tsx') {
    // In sections.tsx, it exports the array. We don't replace Link here, we replace it where sections are rendered.
    // Wait, let's see how sections is used.
    // Actually, sections is rendered in PortalLayout and Sidebar.
    // Let's modify those files instead.
    return;
  }
  
  // Add import if we're replacing
  if (content.includes('to="/portal/list-property"')) {
    if (!content.includes('PostPropertyLink')) {
      const importStatement = "import { PostPropertyLink } from '@/components/post-property-link';\n";
      // Find a good place to insert. E.g. after the last import.
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex > -1) {
        const endOfImport = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfImport + 1) + importStatement + content.substring(endOfImport + 1);
      } else {
        content = importStatement + content;
      }
    }
    
    // Replace <Link to="/portal/list-property" with <PostPropertyLink to="/portal/list-property"
    content = content.replace(/<Link\s+to="\/portal\/list-property"/g, '<PostPropertyLink to="/portal/list-property"');
    
    // Replace closing tags
    // This is tricky because we don't know which </Link> belongs to it.
    // But we can do a regex replacement.
    // <Link to="/portal/list-property"> ... </Link>
    content = content.replace(/<Link\s+to="\/portal\/list-property"([^>]*)>([\s\S]*?)<\/Link>/g, '<PostPropertyLink to="/portal/list-property"$1>$2</PostPropertyLink>');
    
    // Same for list-property/new
    content = content.replace(/<Link\s+to="\/portal\/list-property\/new"([^>]*)>([\s\S]*?)<\/Link>/g, '<PostPropertyLink to="/portal/list-property/new"$1>$2</PostPropertyLink>');
    
    // Same with query params like draft_id or edit
    content = content.replace(/<Link\s+to=\{`\/portal\/list-property\?([^`]+)`\}([^>]*)>([\s\S]*?)<\/Link>/g, '<PostPropertyLink to={`/portal/list-property?$1`}$2>$3</PostPropertyLink>');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

// For sections, they are rendered in PortalLayout. Let's update PortalLayout.
const portalLayoutPath = 'src/components/portal-layout.tsx';
if (fs.existsSync(portalLayoutPath)) {
  let content = fs.readFileSync(portalLayoutPath, 'utf-8');
  if (!content.includes('PostPropertyLink')) {
    const importStatement = "import { PostPropertyLink } from '@/components/post-property-link';\n";
    content = importStatement + content;
  }
  
  // They are likely rendered via NavLink.
  content = content.replace(/<NavLink\s+to="\/portal\/list-property"([^>]*)>([\s\S]*?)<\/NavLink>/g, '<PostPropertyLink to="/portal/list-property"$1>$2</PostPropertyLink>');
  fs.writeFileSync(portalLayoutPath, content);
}

