const fs = require('fs');

const files = ['src/pages/auth/agent-register.tsx', 'src/pages/auth/builder-register.tsx'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix the root container for the main layout
  content = content.replace(
    'className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800"',
    'className="min-h-screen bg-navy-50"'
  );
  
  // Fix the left panel to retain the dark gradient
  content = content.replace(
    'className="hidden lg:flex flex-col justify-between bg-white/5 backdrop-blur-sm border-r border-white/10 p-10"',
    'className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-r border-navy-800 p-10 relative overflow-hidden z-10"'
  );

  // Fix the submitted screen to light theme
  content = content.replace(
    'className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center px-4"',
    'className="min-h-screen bg-navy-50 flex items-center justify-center px-4"'
  );

  // Now process the submitted screen and the right panel
  const parts = content.split('if (submitted) {');
  if (parts.length === 2) {
    let secondHalf = parts[1];
    
    // Light theme replacements
    secondHalf = secondHalf.replace(/text-white/g, 'text-navy-900');
    secondHalf = secondHalf.replace(/text-navy-300/g, 'text-navy-500');
    secondHalf = secondHalf.replace(/text-navy-200/g, 'text-navy-600');
    secondHalf = secondHalf.replace(/text-navy-400/g, 'text-navy-500');
    
    // Inputs and boxes
    secondHalf = secondHalf.replace(/bg-white\/10/g, 'bg-white shadow-sm');
    secondHalf = secondHalf.replace(/border-white\/20/g, 'border-navy-200');
    secondHalf = secondHalf.replace(/border-white\/10/g, 'border-navy-200');
    secondHalf = secondHalf.replace(/bg-white\/5/g, 'bg-navy-50/50');
    secondHalf = secondHalf.replace(/bg-navy-800/g, 'bg-white shadow-sm');
    
    // Errors and accents
    secondHalf = secondHalf.replace(/text-error-400/g, 'text-error-600');
    secondHalf = secondHalf.replace(/text-gold-400/g, 'text-gold-600');
    secondHalf = secondHalf.replace(/bg-gold-400/g, 'bg-gold-500');
    secondHalf = secondHalf.replace(/bg-gold-400\/5/g, 'bg-gold-50');
    secondHalf = secondHalf.replace(/border-gold-400\/20/g, 'border-gold-200');
    secondHalf = secondHalf.replace(/hover:border-gold-400\/60/g, 'hover:border-gold-400');
    secondHalf = secondHalf.replace(/focus:border-gold-400/g, 'focus:border-gold-500');
    secondHalf = secondHalf.replace(/focus:ring-gold-400\/30/g, 'focus:ring-gold-500\/30');
    
    // File upload area label text
    secondHalf = secondHalf.replace(/text-sm font-medium text-navy-900 mb-1\.5/g, 'text-sm font-medium text-navy-900 mb-1.5'); // Replaced text-white to text-navy-900 earlier

    content = parts[0] + 'if (submitted) {' + secondHalf;
  }
  
  fs.writeFileSync(file, content);
});

console.log("Done");
