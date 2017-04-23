"use strict";

class CORS{
    static allow(host){
        return async (ctx,next)=>{
            ctx.set("Access-Control-Allow-Origin", host);
            ctx.set("Access-Control-Allow-Methods",ctx.get("Access-Control-Request-Method"));
            ctx.set("Access-Control-Allow-Headers",ctx.get("Access-Control-Request-Headers"));
            ctx.set("Access-Control-Allow-Credentials","true");
            await next();
        }
    }
}

module.exports = CORS;