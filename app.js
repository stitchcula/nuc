"use strict";

const Koa=require('koa');
const session = require('./lib/util/Session.js');
const Loader = require('./lib/util/RoutesLoader.js');
const CORS = require('./lib/util/CORS.js');
const auth = require('./lib/middleware/auth');
//const Redis = require("ioredis");
const MongoClient = require('mongodb').MongoClient;
const MONGO_URL=`mongodb://${process.env["MONGO_HOST"]}:${process.env["MONGO_PORT"]}/nuc`;

const router=new Loader(__dirname,"/routes");

const app=new Koa();
app.proxy="nginx";
app.keys=["dou","toy"];
/*
app.context.redis=new Redis({
    port:process.env["REDIS_PORT"],
    host:process.env["REDIS_HOST"],
    password:process.env["REDIS_AUTH"]
});*/

app.use(require("koa-response-time")());
app.use(CORS.allow("http://localhost:8080"));
app.use(session({key:'token'}));

app.use(async (ctx,next) => {
    console.log(`[${new Date()}] ${ctx.ip} : ${ctx.method} ${ctx.path}${ctx.querystring?("?"+ctx.querystring):""}`);
    try {
        ctx.mongo=await MongoClient.connect(MONGO_URL);
        await next();
        await ctx.mongo.close();
    }catch (e){
        ctx.body={result:e.code||403,error:e.msg||e};
    }
});

app.use(auth);
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(8088,()=>{
    console.log(`[${new Date()}] NUC : listening at 8088`);
});


