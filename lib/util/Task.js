"use strict";

const MongoClient = require('mongodb').MongoClient;
const MONGO_URL=`mongodb://${process.env["MONGO_HOST"]}:${process.env["MONGO_PORT"]}/cat`;
const schedule= require("node-schedule");
const Spider=require('./Spider.js');

class Task{
    constructor(){
        this.rule=new schedule.RecurrenceRule();
        this.rule.minute=40;
        global.cat_task_isRunning=false;
    }
    run(){
        return schedule.scheduleJob(this.rule,async ()=>{
            if(global.cat_task_isRunning)
                return null;

            global.cat_task_isRunning=true;
            try {
                console.log(`[${new Date()}] Task : started`);
                const mongo=await MongoClient.connect(MONGO_URL);
                const spider=new Spider(mongo);
                await spider.grabAll();
                await mongo.close();
            }catch (e){
                console.log(`[${new Date()}] Task : some error -->`);
                console.error(e);
            }
            global.cat_task_isRunning=false;
        })
    }
}

module.exports = Task;

