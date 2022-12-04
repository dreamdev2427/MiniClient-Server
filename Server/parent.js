const { parentPort } = require("worker_threads");
const data = new Map();

parentPort.on("message", (contents) => {
    switch (contents.action) {
        case 'STORE':
            data.set(contents.key, contents.body);
            break;
        case 'LOGIN':
            if (contents.base64key && data.get(contents.base64key)) {
                parentPort.postMessage({
                    status: true,
                    result: data.get(contents.base64key)
                })
            } else {
                parentPort.postMessage({
                    status: false,
                    result: "wrong_key"
                })
            }
            break;
        default:
            break;
    }
})