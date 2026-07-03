const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, 'src', 'App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.startsWith('const PrayingHandsIcon ='));
const endIndex = lines.findIndex(l => l.startsWith('function MainApp() {'));

if (startIndex !== -1 && endIndex !== -1) {
  const newImports = [
    "import PrayingHandsIcon from './components/Icons/PrayingHandsIcon';",
    "import NewPrayerModal from './components/Modals/NewPrayerModal';",
    "import NewMemberModal from './components/Modals/NewMemberModal';"
  ].join('\n');
  
  lines.splice(startIndex, endIndex - startIndex, newImports + '\n');
  fs.writeFileSync(appJsxPath, lines.join('\n'));
  console.log('App.jsx successfully refactored');
} else {
  console.error(`Error: Could not find bounds. startIndex: ${startIndex}, endIndex: ${endIndex}`);
}
