"use strict";
const Router=require('koa-router');

const router=new Router();

router.get("/test",async ctx=>{
    ctx.body="hello user";
});

module.exports = router;