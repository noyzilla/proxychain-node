require('dotenv').config();
const ProxyChain = require('proxy-chain');

const CONFIG = {
    PORT: process.env.PORT || 8000,
    UPSTREAM: process.env.UPSTREAM || null,
    VERBOSE: process.env.VERBOSE || false
};

const server = new ProxyChain.Server({
    port: CONFIG.PORT,
    verbose: CONFIG.VERBOSE,
    prepareRequestFunction: ({username, password}) => {
        let upstreamProxyUrl = CONFIG.UPSTREAM;
        if (upstreamProxyUrl) {
            upstreamProxyUrl = upstreamProxyUrl.replace(/<username>/, username);
            upstreamProxyUrl = upstreamProxyUrl.replace(/<random>/, String(Math.random()));
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