const http = require('http')
const querystring = require('querystring');
const { spawn } = require('child_process');
const exec = require('child_process').exec;

const randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    // console.log("result = ", result);
    //convert this to abase64 and print    
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
                body += chunk;
            })
            res.on('close', () => {
                // console.log('Retrieved all data');
                // console.log(body);
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


const main = async () => {
    //get arguments from command line
    const mainArgs = process.argv.slice(2);
    console.log('mainArgs: ', mainArgs);
    if(mainArgs && mainArgs.length<2) 
    {
        console.log("Invlid arguments.");
        return;
    }
    const IP = mainArgs[0];
    const PORT = mainArgs[1];
    const UNIQUE_ID = mainArgs[2] || "";
    if (process.env.process_restarting) {
        delete process.env.process_restarting;
        // Give old process one second to shut down before continuing ...
        setTimeout(main, 1000);
        return;
      }
    

    try {
        var serverPid = "";
       
        //do ask_key post first
        let uniqueId = UNIQUE_ID ==="" ? randomString(64): UNIQUE_ID;
        console.log("uniqueId = ", uniqueId);
        const returnedKey = await post(`http://${IP}:${PORT}/`, {
            ask_key: uniqueId
        })
        // console.log("returnedKey = ", returnedKey);
        //do login post
        const returnedUniqueId = await post(`http://${IP}:${PORT}/`, {
            login: returnedKey
        })
        console.log("uniqueId and returned Id = " + uniqueId + ":" + returnedUniqueId);
        exec(`sudo lsof -i -P -n | grep ${IP}:${PORT}`,
        function (error, stdout, stderr) {
            // console.log('stdout: ' + stdout);
            serverPid = stdout.split('    ')[1]
            // console.log('PID: ' + serverPid);

            // stdout.split('\t')
            if (error !== null) {
                console.log('exec error: ' + error);
            }
            
            if (uniqueId.toString() !== returnedUniqueId.toString()){
                cmd ='sudo kill -9 '+ serverPid;
                console.log("cmd: " + cmd);
                exec('sudo kill -9 '+ serverPid);
            }else{
               // Restart process ...
               
                console.log("UNIQUE_ID = ", returnedUniqueId);
                spawn(process.argv[0], [process.argv[1], process.argv[2], process.argv[3], returnedUniqueId], {
                    env: { process_restarting: 1 },
                    stdio: 'ignore',
                }).unref();
            }
        });
    } catch (error) {

    }
}

main("127.0.0.2", 9999);