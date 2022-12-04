const http = require('http')
const querystring = require('querystring');

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
    const postData  = querystring.stringify(data);

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

        req.write(postData )
        req.end()
    })
}


const main = async () => {
    try{
        //do ask_key post first
        const uniqueId = randomString(64);
        console.log("uniqueId = ", uniqueId);
        const returnedKey = await post('http://127.0.0.2:9999/', {
            ask_key: uniqueId
        })
        console.log("returnedKey = ", returnedKey);
        //do login post
        const returnedUniqueId = await post('http://127.0.0.2:9999/', {
            login: returnedKey
        })
        console.log("returnedUniqueId = ", returnedUniqueId);

        //test for wrong key
        const returnedOfWrongkey = await post('http://127.0.0.2:9999/', {
            login: randomString(64)
        })
        console.log("returnedOfWrongkey = ", returnedOfWrongkey);
    }catch(error)
    {
        
    }
}

main();