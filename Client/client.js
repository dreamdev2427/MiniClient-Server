const http = require('http')
const querystring = require('querystring');
const { spawn } = require('child_process');
const exec = require('child_process').exec;

var isServerAlive = false;
var timeoutSpan = 100;

const randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    const buff = new Buffer.from(result);
    const base64data = buff.toString('base64');
    // console.log("base64data = ", base64data, base64data.length );
    return base64data;
}

async function post(url, data) {
    const postData = querystring.stringify(data);

    const options1 = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    }

    return new Promise((resolve, reject) => {
        const req = http.request(url, options1, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Did not get an OK from the server. Code: ${res.statusCode}`);
                res.resume();
                return "";
            }

            let body = "";
            res.on('data', (chunk) => {
                // console.log("on [data] chunk = ", chunk)
                body += chunk;
            })
            res.on('close', () => {
                // console.log("on [close] body = ", body);
            })
            res.on('end', () => {
                const resString = body;
                // console.log("on [end]", resString)
                resolve(resString);
                return resString;
            })
        })

        req.on('error', (err) => {
            console.error(`Encountered an error trying to make a request: ${err.message}`);
            reject(err)
        })

        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request time out'))
        })

        req.write(postData)
        req.end()
    })
}


const wait = async (ms) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    console.log('waited ' + ms + 'ms');
}

const testServerIsalive = async (HOST, PORT) => {    
    try{
        const response = await post(`http://${HOST}:${PORT}/`, 
            "isAlive"
        );
        if(response === "wrong_query") isServerAlive  = true;
        }
    catch(error)
    {
        console.log(error.errno, error.code);
    }
}


const main = async () => {
       
    
    //get arguments from command line
    const mainArgs = process.argv.slice(2);
    console.log('mainArgs: ', mainArgs);
    if(mainArgs && mainArgs.length<2) 
    {
        console.log("Invlid arguments.");
        return;
    }
    const HOST = mainArgs[0];
    const PORT = mainArgs[1];
    const UNIQUE_ID = mainArgs[2] || null;
    if (process.env.process_restarting) {
        delete process.env.process_restarting;
        // Give old process one second to shut down before continuing ...
        setTimeout(main, 1000);
        return;
    }

    let waitMs = 95;
    while(1){
        waitMs += 5;
        testServerIsalive(HOST, PORT);
        if (isServerAlive){
            break;
        }
        await wait(waitMs);
    }
    

    try {
        var serverPid = "";
       
        //do ask_key post first
        let uniqueId = UNIQUE_ID === null ? randomString(64): UNIQUE_ID;
        console.log("uniqueId = ", uniqueId);
        console.log("ask a key ");
        const returnedKey = await post(`http://${HOST}:${PORT}/`, {
            ask_key: uniqueId
        })
        console.log("received BASE64_KEY = ", returnedKey);
        console.log("do log in");
        //do login post
        const returnedUniqueId = await post(`http://${HOST}:${PORT}/`, {
            login: returnedKey
        })
        console.log("uniqueId = " + uniqueId);
        exec(`sudo lsof -i -P -n | grep ${HOST}:${PORT}`,
        function (error, stdout, stderr) {
            serverPid = stdout.split('    ')[1]

            if (error !== null) {
                console.log('exec error: ' + error);
            }
            
            if (uniqueId.toString() !== returnedUniqueId.toString()){
                //kill server
                cmd ='sudo kill -9 '+ serverPid;
                console.log("cmd: " + cmd);
                exec('sudo kill -9 '+ serverPid);
            }else{
               // Restart process ...               
                console.log("Restart client, UNIQUE_ID = ", returnedUniqueId);
                spawn(process.argv[0], [process.argv[1], process.argv[2], process.argv[3], returnedUniqueId], {
                    env: { process_restarting: 1 },
                    stdio: 'ignore',
                }).unref();
            }
        });
    } catch (error) {
        console.log(error.errno, error.code);
    }
}

main("127.0.0.2", 9999);
