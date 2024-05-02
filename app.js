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
    TIME: new Date().getTime(),
};

CONFIG.PORTS.forEach(cport => {
    const server = new ProxyChain.Server({
        port: cport,
        verbose: CONFIG.VERBOSE,
        prepareRequestFunction: ({username, password}) => {
            let upstreamProxyUrl = CONFIG.UPSTREAM;
            if (upstreamProxyUrl) {
                upstreamProxyUrl = upstreamProxyUrl.replace(/<cport>/, cport);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<ctime>/, CONFIG.TIME);
                upstreamProxyUrl = upstreamProxyUrl.replace(/<random>/, String(Math.random()));
                upstreamProxyUrl = upstreamProxyUrl.replace(/<username>/, username);
            }
            return {
                upstreamProxyUrl: upstreamProxyUrl
            };
        },
    });

    server.listen(() => {
        console.log(`Proxy server is listening on port ${server.port}`);
    });

    // Emitted when HTTP connection is closed
    server.on('connectionClosed', ({connectionId, stats}) => {
        console.log(`Connection ${connectionId} closed`);
        console.dir(stats);
    });

    // Emitted when HTTP request fails
    server.on('requestFailed', ({request, error}) => {
        console.log(`Request ${request.url} failed`);
        console.error(error);
    });
});
