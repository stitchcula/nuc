/*
    用户
 */

"use strict";
const Router=require('koa-router');
const userAuth=require('../../../lib/middleware/auth/User.js');
const Crypto=require('../../../lib/util/Crypto.js');
const vld=require('../../../lib/util/Validator.js');
const body = require('koa-json-body');

const router=new Router();

router.use(userAuth);

router.head("/",async ctx=>{
    if(ctx.state.type===TYPE_USER)
        return ctx.status = 204;
    else
        return ctx.status = 401;
});

router.get("/",async ctx=>{
   return ctx.redirect(`/api/v1/u/${ctx.state.user.uin}`);
});

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
    if(!user){
        ctx.status = 401 ;
        throw "账户或密码错误。";
    }

    //非关键字段
    user.LoginTime=user.LoginTime?user.LoginTime+1:1;
    user.LastLoginTime=new Date().getTime();
    user.LastLoginIp=ctx.ip;
    user.UniquenessCheck=Crypto.sha256(user.LastLoginTime+user.uin+"nicaiya");

    const res=await ctx.mongo.collection("u")
        .updateOne(bean,{"$set":user},{upsert:true});
    if(res.result.n!==1||res.result.ok!==1)
        throw {code:500,msg:"数据库错误"};

    ctx.session={uin:user.uin,UniquenessCheck:user.UniquenessCheck};

    ctx.body={result:200,uin:user.uin};
});

router.post("/",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["email"]).notnull().string();
    vld.chk(ctx.request.body["password"]).notnull().string();

    if(await ctx.mongo.collection("u")
            .findOne({nickname:ctx.request.body["nickname"]}))
        return ctx.body={result:595,key:'nickname'};
    if(await ctx.mongo.collection("u")
            .findOne({email:ctx.request.body["email"]}))
        return ctx.body={result:595,key:'email'};

    const bean={
        uin:Crypto.createUin(),
        nickname:ctx.request.body["nickname"],
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

router.del("/",async ctx=>{
    const res=await ctx.mongo.collection("u")
        .updateOne({uin:ctx.state.user.uin},{"$set":{UniquenessCheck:""}},{upsert:true});
    ctx.session={};

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:500};
});

router.get("/:uin",async ctx=>{
    const user=ctx.state.user;
    user.roles=await ctx.mongo.collection("u_auth")
        .find({user:user.uin}).project({_id:0,user:0}).toArray();
    delete user.UniquenessCheck;

    ctx.body={result:200,data:user};
});

router.put("/:uin",body({ limit: '10kb'}),async ctx=>{
    if(ctx.query["nickname"]||ctx.query["email"]){
        if(ctx.query["nickname"]&&await ctx.mongo.collection("u")
                .findOne({nickname:ctx.query["nickname"]}))
            return ctx.body={result:595};
        else if(ctx.query["email"]&&await ctx.mongo.collection("u")
                .findOne({email:ctx.query["email"]}))
            return ctx.body={result:595};
        else
            return ctx.body={result:404};
    }

    if(!ctx.request.body["password"]) {
        vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
        vld.chk(ctx.request.body["email"]).notnull().string();

        if (await ctx.mongo.collection("u")
                .findOne({"$or": [{email: ctx.query["email"]}, {nickname: ctx.query["nickname"]}]}))
            return ctx.body = {result: 595};

        const bean = {
            nickname: ctx.request.body["nickname"],
            email: ctx.request.body["email"]
        };

        const res = await ctx.mongo.collection("u")
            .updateOne({uin: ctx.params["uin"]}, {"$set": bean}, {upsert: true});

        ctx.body = {result: (res.result.n === 1 && res.result.ok === 1) ? 200 : 404};
    }else{
        vld.chk(ctx.request.body["new_password"]).notnull().string();

        const res = await ctx.mongo.collection("u")
            .updateOne({uin: ctx.params["uin"],password: ctx.request.body["password"]},
                {"$set": {password: ctx.request.body["new_password"]}}, {upsert: true});
        ctx.body = {result: (res.result.n === 1 && res.result.ok === 1) ? 200 : 404};
    }
});

router.del("/:uin",async ctx=>{
    const res=await ctx.mongo.collection("u")
        .deleteOne({uin:ctx.params["uin"]});
    await ctx.mongo.collection("u_auth")
        .deleteMany({user:ctx.params["uin"]});
    //todo: 删除user名下的所有app

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.post("/:uin/app",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["name"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["secret"]).notnull().string();
    vld.chk(ctx.request.body["description"]).string();

    const bean={
        uin:Crypto.createUin(),
        name:ctx.request.body["name"],
        secret:ctx.request.body["secret"],
        description:ctx.request.body["description"],
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
            name:res.name,
            description:res.description,
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
        name:ctx.request.body["name"],
        secret:ctx.request.body["secret"],
        description:ctx.request.body["description"]
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