require('dotenv').config();

const fs = require('fs');
const ProxyChain = require('proxy-chain');
const NodeCache = require('node-cache');

const cache = new NodeCache({stdTTL: 600}); //10miniute

const CONFIG = {
    PORTS: Array.from(
        (process.env.PORTS || "8000").split(/,/).map((p) => {
            if (p.indexOf('-') > 0) {
                const [start, end] = p.split(/-/).map((v) => parseInt(v));
                return Array.from({length: end - start + 1}, (v, k) => start + k);
            }
            return p;
        }).flat()
    ),
    UPSTREAM: process.env.UPSTREAM || null,
    VERBOSE: process.env.VERBOSE || false,
    VERBOSE_UPSTREAM: process.env.VERBOSE_UPSTREAM || false,
    BYPASS_REGEX_LIST: (process.env.BYPASS || "").split(/,/).filter((p) => p).map((p) => {
        return new RegExp(p.trim().replace(/\./g, '\\.'))
    }),
    TIME: new Date().getTime(),
};

console.log('CONFIG:', CONFIG);

function isByPass(hostname) {
    const bypassKey = 'bypass';

    let bypassList = cache.get(bypassKey);
    if (!bypassList) {
        bypassList = CONFIG.BYPASS_REGEX_LIST || [];
        const bypassFromFileList = fs.readFileSync('bypass.txt', 'utf8').split(/\r?\n/).filter((p) => p).map((p) => {
            return new RegExp(p.trim().replace(/\./g, '\\.'))
        })
        bypassList = bypassList.concat(bypassFromFileList);
        cache.set(bypassKey, bypassList);
    }

    for (const regex of bypassList) {
        if (regex.test(hostname))
            return true;
    }
    return false;
}

CONFIG.PORTS.forEach(cport => {
    const server = new ProxyChain.Server({
        port: cport,
        verbose: CONFIG.VERBOSE,
        prepareRequestFunction: ({username, password, hostname, port}) => {
            if (isByPass(hostname))
                return {};

            let upstreamProxyUrl = CONFIG.UPSTREAM;
            if (upstreamProxyUrl) {
                upstreamProxyUrl = upstreamProxyUrl.replace(/<cport>/g, cport);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<ctime>/g, CONFIG.TIME);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<random>/g, String(Math.random()));
                upstreamProxyUrl = upstreamProxyUrl.replace(/<username>/g, username);

                if (CONFIG.VERBOSE_UPSTREAM) {
                    console.log(`ProxyServer[${cport}]: ${hostname}:${port} => ${upstreamProxyUrl}`);
                }
            }
            return {
                upstreamProxyUrl: upstreamProxyUrl
            };
        },
    });

    server.listen(() => {
        //console.log(`Proxy server is listening on port ${server.port}`);
    });

    server.on('requestFailed', ({request, error}) => {
        console.log(`Request ${request.url} failed`);
        console.error(error);
    });
});
