const http = require('http')
const { Worker } = require('worker_threads');
const querystring = require('querystring');
const data = new Map();

const worker = new Worker('./worker.js', {
    workerData: {
        PORT: 9999,
        HOST: "127.0.0.2"
    }
});

  worker.on("message", (contents) => {
    console.log("[server.js] on message event, contnets = ", contents)
    switch (contents.action) {
        case 'STORE':
            data.set(contents.key, contents.body);
            break;
        case 'LOGIN':
            if (contents.base64key && data.get(contents.base64key)) {
                worker.postMessage({
                    status: true,
                    result: data.get(contents.base64key)
                })
            } else {
                worker.postMessage({
                    status: false,
                    result: "wrong_key"
                })
            }
            break;
        default:
            break;
    }
  });
  worker.on("error", (msg) => {
    console.log(`An error occurred: ${msg}`);
  });
  worker.on('exit', (code) => {
    if (code !== 0)
      reject(new Error(`Worker stopped with exit code ${code}`));
  });