const app = require('./App.js');
const user = require('./User.js');

module.exports = async (ctx,next)=>{
    //访问类型判断
    if(ctx.query.secret)
        await app(ctx,next);
    else
        await user(ctx,next);
    await next;
};
