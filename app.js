require('dotenv').config();

const ProxyChain = require('proxy-chain');

const CONFIG = {
    PORTS: Array.from(
        new String(process.env.PORTS || "8000").split(/,/).map((p) => {
            if (p.indexOf('-') > 0) {
                const [start, end] = p.split(/-/).map((v) => parseInt(v));
                return Array.from({length: end - start + 1}, (v, k) => start + k);
            }
            return p;
        }).flat()
    ),
    UPSTREAM: process.env.UPSTREAM || null,
    VERBOSE: process.env.VERBOSE || false,
    BYPASS_REGEX: new RegExp(
        Array.from(
            new String(process.env.BYPASS || "").split(/,/).filter((p) => p)
        ).join('|').replace(/\./g, '\\.'),
    ),
    TIME: new Date().getTime(),
};

function isByPass(hostname) {
    return CONFIG.BYPASS_REGEX.test(hostname);
}

CONFIG.PORTS.forEach(cport => {
    const server = new ProxyChain.Server({
        port: cport,
        verbose: CONFIG.VERBOSE,
        prepareRequestFunction: ({username, password, hostname}) => {
            if (isByPass(hostname))
                return {};

            let upstreamProxyUrl = CONFIG.UPSTREAM;
            if (upstreamProxyUrl) {
                upstreamProxyUrl = upstreamProxyUrl.replace(/<cport>/g, cport);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<ctime>/g, CONFIG.TIME);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<random>/g, String(Math.random()));
                upstreamProxyUrl = upstreamProxyUrl.replace(/<username>/g, username);
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
