require('dotenv').config();

const fs = require('fs');
const ProxyChain = require('proxy-chain');

const DEFAULT_BYPASS_REGEX = new RegExp(
    fs.readFileSync('bypass.txt', 'utf8').split(/\r?\n/).filter((p) => p).join('|').replace(/\./g, '\\.')
);

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
    BYPASS_REGEX: new RegExp(
        (process.env.BYPASS || "").split(/,/).filter((p) => p).join('|').replace(/\./g, '\\.')
    ),
    TIME: new Date().getTime(),
};

function isByPass(hostname) {
    if (CONFIG.BYPASS_REGEX.test(hostname))
        return true;
    return DEFAULT_BYPASS_REGEX.test(hostname);
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
        console.log(`Proxy server is listening on port ${server.port}`);
    });

    server.on('requestFailed', ({request, error}) => {
        console.log(`Request ${request.url} failed`);
        console.error(error);
    });
});
