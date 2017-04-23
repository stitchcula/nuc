"use strict";
const Router=require('koa-router');

const router=new Router();


router.all(/.*/,async (ctx,next)=>{
    console.log("hello user");
    await next;
});

module.exports = router;