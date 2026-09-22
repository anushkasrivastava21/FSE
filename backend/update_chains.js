const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('polygonAmoy')) {
    content = content.replace(/import\s+\{\s*polygonAmoy\s*\}\s+from\s+["']viem\/chains["'];\n?/g, '');
    content = content.replace(/chain:\s*polygonAmoy/g, 'chain: this.contracts.getChain()');
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
    else if (fullPath.endsWith('.ts')) replaceInFile(fullPath);
  }
}

walk('d:/Dev/FSE/FSE/backend/src');
