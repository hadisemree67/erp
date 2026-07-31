/*
 * ÖZET:
 * Bu script, log kayıtlarından App.jsx dosyasının tam içeriğini 
 * ayıklayarak (extract) txt dosyasına yazar.
 */
const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\dedih\\.gemini\\antigravity-ide\\brain\\88d24be5-1f17-454a-97a8-b151c4c3e3ae\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let bestContent = '';
  
  for await (const line of rl) {
    if (line.includes('File Path: `file:///c:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/App.jsx`') && line.includes('Total Lines: 245')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_responses) {
            for (const tr of obj.tool_responses) {
                if (tr.output && tr.output.includes('Total Lines: 245')) {
                    bestContent = tr.output;
                }
            }
        }
      } catch(e) {}
    }
  }
  
  fs.writeFileSync('C:\\Users\\dedih\\Desktop\\stokerpsistemi\\desktop-app\\app_jsx_log.txt', bestContent, 'utf8');
}
processLineByLine();
