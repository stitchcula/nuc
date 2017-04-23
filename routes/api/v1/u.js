/*
    用户
 */

"use strict";
const Router=require('koa-router');
const Crypto=require('../../../lib/util/Crypto.js');
const vld=require('../../../lib/util/Validator.js');
const body = require('koa-json-body');

const router=new Router();

router.put("/",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["username"]).notnull().string();
    vld.chk(ctx.request.body["password"]).notnull().string();

    const bean={
        password:ctx.request.body["password"]
    };
    if(/@/.test(ctx.request.body["username"]))
        bean.email=ctx.request.body["username"];
    else
        bean.nickname=ctx.request.body["username"];

    const user=await ctx.mongo.collection("u")
        .findOne(bean,{_id:0,password:0});
    if(!user)
        throw "账户或密码错误。";

    user.roles=await ctx.mongo.collection("u_auth")
        .find({user:user.uin}).project({_id:0,user:0}).toArray();
    user.timestamp=new Date().getTime();
    user.token=Crypto.sha256(user.timestamp+user.uin+"nicaiya");

    ctx.body={result:200,user};
});

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
            nickname:Crypto.toString(res.nickname),
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

router.post("/:uin/app",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["name"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["secret"]).notnull().string();
    vld.chk(ctx.request.body["description"]).string();

    const bean={
        uin:Crypto.createUin(),
        name:Crypto.toBase64(ctx.request.body["name"]),
        secret:ctx.request.body["secret"],
        description:Crypto.toBase64(ctx.request.body["description"]),
        timestamp:new Date().getTime(),
        owner:ctx.params["uin"]
    };

    await ctx.mongo.collection("p")
        .insertOne(bean);

    ctx.body={result:200,uin:bean.uin}
});

router.get("/:uin/app/:app",async ctx=>{
    const res=await ctx.mongo.collection("p")
        .findOne({owner:ctx.params["uin"],uin:ctx.params["app"]});

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

router.put("/:uin/app/:app",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["name"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["secret"]).notnull().string();
    vld.chk(ctx.request.body["description"]).string();

    const bean={
        name:Crypto.toBase64(ctx.request.body["name"]),
        secret:ctx.request.body["secret"],
        description:Crypto.toBase64(ctx.request.body["description"])
    };

    const res=await ctx.mongo.collection("p")
        .updateOne({owner:ctx.params["uin"],uin:ctx.params["app"]},{"$set":bean},{upsert:true});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.del("/:uin/app/:app",async ctx=>{
    const res=await ctx.mongo.collection("p")
        .deleteOne({owner:ctx.params["uin"],uin:ctx.params["app"]});
    //todo:删除app名下所有user和role

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