/*
    应用
 */

"use strict";
const Router=require('koa-router');
const Crypto=require('../../../lib/util/Crypto.js');
const Mailer=require('../../../lib/util/Mailer.js')
const vld=require('../../../lib/util/Validator.js');
const body = require('koa-json-body');
const { randomBytes } = require('crypto');

const router=new Router();

router.post("/:uin/role",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["role"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["parent"]).string().least(24).most(24);

    if(!ctx.request.body["parent"])
        ctx.request.body["parent"]="_";

    const bean={
        uin:Crypto.createUin(),
        role:ctx.request.body["role"],
        parent:ctx.request.body["parent"],
        owner:ctx.params["uin"],
        timestamp:new Date().getTime()
    };

    if(ctx.request.body["role"]==="guest")
        bean.uin="000000000000000000000000";

    await ctx.mongo.collection("m")
        .insertOne(bean);

    ctx.body={result:200,uin:bean.uin};
});

router.get("/:uin/role",async ctx=>{
    ctx.query["per"]=ctx.query["per"]||10;
    ctx.query["page"]=ctx.query["page"]||1;

    let bean={owner:ctx.params["uin"]};
    bean.role={"$regex":ctx.query["key"],"$options": 'i'};

    const roles = await ctx.mongo.collection("m")
        .find(bean)
        .project({_id:0})
        .skip(ctx.query["per"]*(ctx.query["page"]-1))
        .limit(ctx.query["per"])
        .sort({timestamp:0})
        .toArray();

    ctx.body={result:200,roles};
});

router.get("/:uin/role/:role",async ctx=>{
    const res=await ctx.mongo.collection("m")
        .findOne({owner:ctx.params["uin"],uin:ctx.params["role"]});

    if(res) {
        ctx.body = {
            result: 200,
            uin:res.uin,
            role:res.role,
            parent:res.parent,
            timestamp:res.timestamp,
        };
    }else
        ctx.body={result:404};
});

router.put("/:uin/role/:role",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["role"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["parent"]).string().least(24).most(24);

    const bean={
        role:ctx.request.body["role"],
        parent:ctx.request.body["parent"],
    };

    const res=await ctx.mongo.collection("m")
        .updateOne({owner:ctx.params["uin"],uin:ctx.params["role"]},{"$set":bean},{upsert:true});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.del("/:uin/role/:role",async ctx=>{
    const res=await ctx.mongo.collection("m")
        .deleteOne({owner:ctx.params["uin"],uin:ctx.params["role"]});
    //todo:删除role名下所有rule

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.get("/:uin/role/:role/rule",async ctx=>{
    const rules=[];
    let role=ctx.params["role"],tmp;
    while (true) {
        tmp=await ctx.mongo.collection("m_rule")
            .find({owner:role}).project({_id:0}).toArray();
        rules.push(...tmp);
        tmp=await ctx.mongo.collection("m")
            .findOne({owner:ctx.params["uin"],uin:ctx.params["role"]});
        if(!tmp||tmp["parent"]==="_")
            break;
        else
            role=tmp["parent"];
    }

    ctx.body={result:200,rules};
});

router.post("/:uin/role/:role/rule",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["target"]).notnull().string();
    vld.chk(ctx.request.body["method"]).notnull().string();
    vld.chk(ctx.request.body["weight"]).notnull().number().least(0).most(100);
    vld.chk(ctx.request.body["access"]).notnull().boolean();

    if(await ctx.mongo.collection("m_rule")
            .findOne({
                owner:ctx.params["role"],
                target:ctx.request.body["target"],
                method:ctx.request.body["method"],
            }))
        throw "规则重复";

    const bean={
        uin:Crypto.createUin(),
        target:ctx.request.body["target"],
        method:ctx.request.body["method"],
        weight:ctx.request.body["method"],
        access:ctx.request.body["access"],
        owner:ctx.params["role"],
        timestamp:new Date().getTime()
    };

    await ctx.mongo.collection("m_rule")
        .insertOne(bean);

    ctx.body={result:200}
});

router.put("/:uin/role/:role/rule/:rule",body({ limit: '10kb'}),async ctx=>{
    vld.chk(ctx.request.body["target"]).notnull().string();
    vld.chk(ctx.request.body["method"]).notnull().string();
    vld.chk(ctx.request.body["weight"]).notnull().number().least(0).most(100);
    vld.chk(ctx.request.body["access"]).notnull().boolean();

    if(await ctx.mongo.collection("m_rule")
            .findOne({
                owner:ctx.params["role"],
                target:ctx.request.body["target"],
                method:ctx.request.body["method"],
            }))
        throw "规则重复";

    const bean={
        target:ctx.request.body["target"],
        method:ctx.request.body["method"],
        weight:ctx.request.body["method"],
        access:ctx.request.body["access"],
    };

    const res=await ctx.mongo.collection("m_rule")
        .updateOne({owner:ctx.params["role"],uin:ctx.params["rule"]},{"$set":bean},{upsert:true});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.del("/:uin/role/:role/rule/:rule",async ctx=>{
    const res=await ctx.mongo.collection("m_rule")
        .deleteOne({owner:ctx.params["role"],uin:ctx.params["rule"]});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.get("/:uin/user",async ctx=>{
    //todo:获取app名下用户信息(含role)列表
    // 这个接口有严重缺陷，由于不支持联合查询，无法过滤用户的应用归属
    if(ctx.params["uin"]!=="000000000000000000000000")
        throw "该接口无法提供服务";

    ctx.query["per"]=ctx.query["per"]||10;
    ctx.query["page"]=ctx.query["page"]||1;
    ctx.query["by"]=ctx.query["by"]||"nickname";
    let users=[];

    if(ctx.query["by"]==="nickname"||ctx.query["by"]==="email"){
        let bean={};
        bean[ctx.query["by"]]={"$regex":ctx.query["key"],"$options": 'i'};
        users = await ctx.mongo.collection("u")
            .find(bean)
            .project({_id:0,password:0})
            .skip(ctx.query["per"]*(ctx.query["page"]-1))
            .limit(ctx.query["per"])
            .sort({timestamp:0})
            .toArray();
        for(let i in users){
            users[i].role=await ctx.mongo.collection("u_auth")
                .findOne({user:users[i].uin,app:ctx.params["uin"]});
        }
    }else if(ctx.query["by"]==="role"){
        let bean={owner:ctx.params["uin"]};
        bean[ctx.query["by"]]={"$regex":ctx.query["key"],"$options": 'i'};
        const role=await ctx.mongo.collection("m")
            .findOne(bean);
        const uins = await ctx.mongo.collection("u_auth")
            .find({role:role.uin,app:ctx.params["uin"]})
            .project({_id:0})
            .skip(ctx.query["per"]*(ctx.query["page"]-1))
            .limit(ctx.query["per"])
            .sort({timestamp:0})
            .toArray();
        for(let i in uins){
            const user=await ctx.mongo.collection("u")
                .findOne({uin: uins[i]},{_id:0,password:0});
            user.role={role:role.uin};
            users.push(user)
        }
    }else {
        throw "乱填啥";
    }

    ctx.body={result:200,users}
});

router.post("/:uin/user",async ctx=>{
    vld.chk(ctx.request.body["nickname"]).notnull().string().least(3).most(16);
    vld.chk(ctx.request.body["email"]).notnull().string();

    if(await ctx.mongo.collection("u")
            .findOne({nickname:ctx.request.body["nickname"]}))
        return ctx.body={result:595,key:'nickname'};
    if(await ctx.mongo.collection("u")
            .findOne({email:ctx.request.body["email"]}))
        return ctx.body={result:595,key:'email'};

    const password = randomBytes(6).toString('hex');

    const bean={
        uin:Crypto.createUin(),
        nickname:ctx.request.body["nickname"],
        email:ctx.request.body["email"],
        password:Crypto.sha256(password),
        timestamp:new Date().getTime()
    };

    await ctx.mongo.collection("u")
        .insertOne(bean);

    const auth={
        user:bean.uin,
        app:ctx.params["uin"],
        role:"000000000000000000000000",
        timestamp:new Date().getTime()
    };
    await ctx.mongo.collection("u_auth")
        .insertOne(auth);

    if(auth.app !== "000000000000000000000000"){
        auth.app = "000000000000000000000000";
        auth.role = "000000000000000000000000";
        await ctx.mongo.collection("u_auth")
            .insertOne(auth);
    }

    await Mailer.to(bean.email)
        .tpl(Mailer.TPL_NEW_USER)
        .params(bean.nickname,password)
        .send();

    ctx.body={result:200,uin:bean.uin}
});

router.get("/:uin/user/:user",async ctx=>{
    //todo:获取app名下用户信息(含role)
    const auth=await ctx.mongo.collection("u_auth")
        .findOne({user:ctx.params["user"],app:ctx.params["uin"]});
    if(!auth)
        throw "无权访问该用户信息";

    const user=await ctx.mongo.collection("u")
        .findOne({uin:ctx.params["user"]});
    user.role=auth.role;

    ctx.body={result:200,user};
});

router.post("/:uin/user/:user",async ctx=>{
    //todo:新增app名下用户信息，将会重定向到OAuth界面
    throw "请勿使用该接口";
});

router.del("/:uin/user/:user",async ctx=>{
    //todo:取消user对app的授权
    const res=await ctx.mongo.collection("u_auth")
        .deleteOne({user:ctx.params["user"],app:ctx.params["uin"]});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.put("/:uin/user/:user/role/:role",async ctx=>{
    //todo:修改user的role
    const res=await ctx.mongo.collection("u_auth")
        .updateOne({user:ctx.params["user"],app:ctx.params["uin"]},
            {"$set":{role:ctx.params["role"]}},{upsert:true});

    ctx.body={result:(res.result.n===1&&res.result.ok===1)?200:404};
});

router.get("/:uin/user/:user/access/:access",async ctx=>{
    //todo:是否有访问权限
});

module.exports = router;