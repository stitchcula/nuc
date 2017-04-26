const TYPE_USER=0;
const TYPE_GUEST=1;
const TYPE_TIMEOUT_USER=2;

module.exports = async (ctx,next)=>{
    if(ctx.session&&ctx.session.uin&&ctx.session.UniquenessCheck){
        const user=await ctx.mongo.collection("u")
            .findOne({uin: ctx.session.uin}, {_id: 0, password: 0 });
        if(!user)
            throw "乱填的吧oAo";

        if(user.UniquenessCheck===ctx.session.UniquenessCheck)
            ctx.state.type=TYPE_USER;
        else
            ctx.state.type=TYPE_TIMEOUT_USER;
        ctx.state.user=user;
        ctx.state.role=await ctx.mongo.collection("u_auth")
            .findOne({user: user.uin, app: "000000000000000000000000"});
    }else{
        ctx.state.type=TYPE_GUEST;
        ctx.state.role={
            app:"000000000000000000000000",
            role:"000000000000000000000000"
        };
    }

    /*
     const rules=[];
     let role=ctx.status.role.role,tmp;
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
     ctx.state.rules=rules;
     */

    if(ctx.method==="HEAD"){
        if(ctx.state.type===TYPE_USER)
            return ctx.status = 204;
        else
            return ctx.status = 401;
    }
};