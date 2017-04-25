"use strict";

const Redis = require("ioredis");
const { randomBytes } = require('crypto');

class RedisStore {
    constructor() {
        this.sessions = new Map();
        this.__timer = new Map();
        this.redis = new Redis({
            port:process.env["REDIS_PORT"],
            host:process.env["REDIS_HOST"],
            password:process.env["REDIS_AUTH"]
        });
    }

    getID(length){
        return randomBytes(length).toString('hex');
    }

    async get(sid) {
        let data = await this.redis.get(`SESSION:${sid}`);
        return JSON.parse(data);
    }

    async set(session, opts) {
        if(!opts.sid) opts.sid = this.getID(24);
        if(!opts.maxAge) opts.maxAge=1000000;
        await this.redis.set(`SESSION:${opts.sid}`, JSON.stringify(session), 'EX', opts.maxAge / 1000);
        return opts.sid;
    }

    async destroy(sid) {
        return await this.redis.del(`SESSION:${sid}`);
    }
}

module.exports = RedisStore;