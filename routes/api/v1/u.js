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
    //vld.chk(ctx.query["p"]).notnull().string();
    //vld.chk(ctx.query["s"]).notnull().string();
    vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["email"]).notnull().string();
    vld.chk(ctx.request.body["password"]).notnull().string();

    const bean={
        uin:Crypto.createUin(),
        nickname:Crypto.toBase64(ctx.request.body["nickname"]),
        email:ctx.request.body["email"],
        password:ctx.request.body["description"],
        timestamp:new Date().getTime(),
        app:"000000000000000000000000"
    };

    await ctx.mongo.collection("p")
        .insertOne(bean);

    ctx.body={result:200,uin:bean.uin}
});

router.get("/:uin",async ctx=>{
    const res=await ctx.mongo.collection("p")
        .findOne({uin:ctx.params["uin"]});

    if(res) {
        ctx.body = {
            result: 200,
            uin:res.uin,
            name:Crypto.toString(res.name),
            description:Crypto.toString(res.description),
            timestamp:res.timestamp,
            owner:res.owner
        };
    }else
        ctx.body={result:404};
});

router.put("/:uin",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["name"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["secret"]).notnull().string();
    vld.chk(ctx.request.body["description"]).string();

    const bean={
        name:Crypto.toBase64(ctx.request.body["name"]),
        secret:ctx.request.body["secret"],
        description:Crypto.toBase64(ctx.request.body["description"])
    };

    const res=await ctx.mongo.collection("p")
        .updateOne({uin:ctx.params["uin"]},{"$set":bean},{upsert:true});

    ctx.body=ctx.body={result:(res.n===1&&res.ok===1)?200:404};
});

router.del("/:uin",async ctx=>{
    const res=await ctx.mongo.collection("p")
        .deleteOne({uin:ctx.params["uin"]});

    ctx.body={result:(res.n===1&&res.ok===1)?200:404};
});

module.exports = router;