const fs = require('fs');
const content = fs.readFileSync('c:/Users/dedih/Desktop/stokerpsistemi/web-app/src/components/MegaMenu/megaMenuData.jsx', 'utf-8');

// The file has JSX, so we can't easily require it without babel.
// But we can check if there are any columns missing "links:" using a regex or simple parse.

let lines = content.split('\n');
let missing = false;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('title:') || lines[i].includes('title :')) {
    // Check next few lines for links:
    let foundLinks = false;
    for(let j=i; j<i+5; j++) {
      if (lines[j] && lines[j].includes('links:')) {
        foundLinks = true;
        break;
      }
    }
    if (!foundLinks) {
      console.log('Missing links around line ' + i + ':\n' + lines.slice(i, i+3).join('\n'));
      missing = true;
    }
  }
}
if (!missing) console.log("All columns seem to have links.");
