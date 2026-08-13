const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('node', ['server.js']);

const out = fs.createWriteStream('startup_error.log');

child.stdout.pipe(out);
child.stderr.pipe(out);

setTimeout(() => {
    child.kill();
    console.log("Finished capturing");
}, 2000);
