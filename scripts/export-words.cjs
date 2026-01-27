/**
 * Script to export WORD_DATABASE to JSON for remote hosting
 * Run: node scripts/export-words.cjs
 */

const fs = require('fs');
const path = require('path');

// Read the words.ts file
const wordsFilePath = path.join(__dirname, '..', 'src', 'words.ts');
const wordsContent = fs.readFileSync(wordsFilePath, 'utf-8');

// Extract the WORD_DATABASE object using regex
// Find the object starting from "export const DEFAULT_WORD_DATABASE" to the closing "};
const match = wordsContent.match(/export const DEFAULT_WORD_DATABASE[^=]*=\s*(\{[\s\S]*?\n\};)/);

if (!match) {
  console.error('Could not find DEFAULT_WORD_DATABASE in words.ts');
  process.exit(1);
}

// Clean up the TypeScript object to make it valid JSON
let objectStr = match[1];

// Remove the trailing semicolon
objectStr = objectStr.replace(/\};$/, '}');

// The arrays are already valid JSON format (double-quoted strings)
// We just need to convert the object keys to quoted strings
// And remove trailing commas

// Convert TypeScript object to JSON
// Replace unquoted keys with quoted keys
objectStr = objectStr.replace(/(\s+)(ru|en|es|ua|party|dirty|extreme):/g, '$1"$2":');

// Remove trailing commas before closing brackets/braces
objectStr = objectStr.replace(/,(\s*[\]}])/g, '$1');

try {
  // Parse to validate
  const data = JSON.parse(objectStr);
  
  // Write to remote-data folder
  const outputPath = path.join(__dirname, '..', 'remote-data', 'words.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log('Successfully exported words to remote-data/words.json');
  
  // Calculate size
  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
  
  // Count words per category
  for (const lang of Object.keys(data)) {
    let total = 0;
    for (const cat of Object.keys(data[lang])) {
      total += data[lang][cat].length;
    }
    console.log(`${lang}: ${total} words`);
  }
} catch (e) {
  console.error('Failed to parse/write JSON:', e.message);
  // Write the problematic string for debugging
  fs.writeFileSync('/tmp/debug-words.txt', objectStr);
  console.log('Debug output written to /tmp/debug-words.txt');
  process.exit(1);
}
