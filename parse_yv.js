const fs = require('fs');
const content = fs.readFileSync('/Users/maryow/.gemini/antigravity/brain/c5528870-69a7-4021-97ad-d80df68784b4/.system_generated/steps/324/content.md', 'utf8');

const regex = /id="get-a-passage-of-bible-text"(.*?)id="get-a-book-collection-for-a-bible"/s;
const match = content.match(regex);
if (match) {
  // Strip HTML tags
  const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(text.substring(0, 2000)); // Print first 2000 chars
} else {
  console.log("Not found");
}
