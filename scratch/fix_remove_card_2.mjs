import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Find the start of the card by looking for "IT'S FREE!"
const searchStr = "IT'S FREE!";
const index = code.indexOf(searchStr);

if (index !== -1) {
  // Let's find the nearest <motion.div> or <div className="hidden lg:block absolute bottom-12 right-12 z-20"> before it
  const beforeStr = code.substring(0, index);
  const startIdx = beforeStr.lastIndexOf('<motion.div');
  
  if (startIdx !== -1) {
    // Let's find the matching closing </motion.div>
    let openTags = 0;
    let endIdx = -1;
    let i = startIdx;
    while (i < code.length) {
      if (code.startsWith('<motion.div', i)) {
        openTags++;
      } else if (code.startsWith('</motion.div>', i)) {
        openTags--;
        if (openTags === 0) {
          endIdx = i + '</motion.div>'.length;
          break;
        }
      }
      i++;
    }

    if (endIdx !== -1) {
      const blockToRemove = code.substring(startIdx, endIdx);
      console.log('Removing block:');
      console.log(blockToRemove);
      
      code = code.replace(blockToRemove, '');
      fs.writeFileSync(filePath, code, 'utf8');
      console.log('Successfully removed the floating card.');
    } else {
      console.log('Could not find closing tag.');
    }
  } else {
    console.log('Could not find starting tag.');
  }
} else {
  console.log("Could not find the text IT'S FREE!");
}
