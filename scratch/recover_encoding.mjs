import fs from 'fs';
const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';

// The file currently on disk is UTF-8 encoded text of the mangled characters.
const mangledText = fs.readFileSync(filePath, 'utf8');

// The mangled characters were created by interpreting the original UTF-8 bytes as UTF-16LE.
// So, we can get the original bytes by encoding the mangled string back to UTF-16LE.
const originalBytes = Buffer.from(mangledText, 'utf16le');

// Write the original bytes back to the file.
fs.writeFileSync(filePath, originalBytes);
console.log('Recovery attempted.');
