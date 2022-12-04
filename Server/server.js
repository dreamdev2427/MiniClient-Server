const http = require('http')
const { Worker } = require('worker_threads');
const querystring = require('querystring');

const parent = new Worker('./parent.js');

const convertParams = (chunks) => {
    // joining all the chunks received
    const data = Buffer.concat(chunks);
    // data.toString() converts Buffer data to querystring format
    const querystring = data.toString();
    // URLSearchParams: takes querystring
    // & returns a URLSearchParams object instance.
    const parsedData = new URLSearchParams(querystring);
    const dataObj = {};
    // entries() method returns an iterator
    // allowing iteration through all key/value pairs
    for (var pair of parsedData.entries()) {
        dataObj[pair[0]] = pair[1];
    }
    return dataObj;
}

const randomString = (length) => {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const postHandler = (request, response) => {
    let chunks = [];
    // 'data' event is emitted on every chunk received
    request.on("data", (chunk) => {
        // collecting the chunks in array
        chunks.push(chunk);
    });

    // when all chunks are received, 'end' event is emitted.
    request.on("end", () => {
        const data = convertParams(chunks);
        response.writeHead(200, {"Content-Type": "application/json"});
        if (data.ask_key) {
            //check whether the key is on the Map or not

            const random64data = randomString(64);
            const buff = new Buffer.from(random64data);
            const base64data = buff.toString('base64');
    
            console.log(data, " converted to Base64 is ", base64data);
            parent.postMessage({
                action: 'STORE',
                key: base64data,
                body: data.ask_key
            });
            response.write(base64data);
            response.end();
        }
        if (data.login) {
            parent.postMessage({
                action: 'LOGIN',
                base64key: data.login
            });
            parent.on('message', (result) => {
                // console.log(result);
                response.write(JSON.stringify(result.result));
                response.end();
            })
        }        
    });
};

const server = http.createServer((request, response) => {
    const reqURL = request.url;
    const reqMethod = request.method;
    console.log('[ReqURL] : ', reqURL);
    console.log('[ReqMethod] : ', reqMethod);
    switch (reqMethod) {
        case "POST": {
            postHandler(request, response);
            break;
        }
    }
});

const port = 9999
const host = '127.0.0.2'
server.listen(port, host)
console.log(`Listening at http://${host}:${port}`)