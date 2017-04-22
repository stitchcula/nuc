/*
    用户
 */

"use strict";
const Router=require('koa-router');
const Crypto=require('../../../lib/util/Crypto.js');
const vld=require('../../../lib/util/Validator.js');
const body = require('koa-json-body');

const router=new Router();

router.post("/",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["email"]).notnull().string();
    vld.chk(ctx.request.body["password"]).notnull().string();

    const bean={
        uin:Crypto.createUin(),
        nickname:Crypto.toBase64(ctx.request.body["nickname"]),
        email:ctx.request.body["email"],
        password:ctx.request.body["password"],
        timestamp:new Date().getTime()
    };

    await ctx.mongo.collection("u")
        .insertOne(bean);

    const auth={
        user:bean.uin,
        app:"000000000000000000000000",
        role:"000000000000000000000000",
        timestamp:new Date().getTime()
    };

    await ctx.mongo.collection("u_auth")
        .insertOne(auth);

    ctx.body={result:200,uin:bean.uin}
});

router.get("/:uin",async ctx=>{
    const res=await ctx.mongo.collection("u")
        .findOne({uin:ctx.params["uin"]});

    if(res) {
        ctx.body = {
            result: 200,
            uin:res.uin,
            nickname:Crypto.toString(res.name),
            email:res.email,
            timestamp:res.timestamp,
        };
    }else
        ctx.body={result:404};
});

router.put("/:uin",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["email"]).notnull().string();
    vld.chk(ctx.request.body["password"]).notnull().string();

    const bean={
        nickname:Crypto.toBase64(ctx.request.body["nickname"]),
        email:ctx.request.body["email"],
        password:ctx.request.body["password"]
    };

    const res=await ctx.mongo.collection("u")
        .updateOne({uin:ctx.params["uin"]},{"$set":bean},{upsert:true});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.del("/:uin",async ctx=>{
    const res=await ctx.mongo.collection("u")
        .deleteOne({uin:ctx.params["uin"]});
    //todo: 删除user名下的所有app

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.post("/:uin/auth/:app",async ctx=>{
    if(!await ctx.mongo.collection("p")
        .findOne({uin:ctx.params["app"]}))
        throw "不存在的应用";

    const bean={
        user:ctx.params["uin"],
        app:ctx.params["app"],
        role:"000000000000000000000000",
        timestamp:new Date().getTime()
    };

    await ctx.mongo.collection("u_auth")
        .insertOne(bean);

    ctx.body={result:200}
});

router.del("/:uin/auth/:app",async ctx=>{
    const res=await ctx.mongo.collection("u_auth")
        .deleteOne({user:ctx.params["uin"],app:ctx.params["app"]});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

module.exports = router;