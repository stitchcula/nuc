"use strict";

const fs=require('fs');
const Router=require('koa-router');

class RoutesLoader{
    constructor(path,dir){
        if(!dir) {
            dir = path;
            path = __dirname;
        }

        if(dir[0]=="/"||dir[0]=="\\")
            dir=dir.substr(1);

        path = path+"/"+dir;

        this.router=new Router();

        const iterator=function(prefix,dir){
            const files=fs.readdirSync(path+prefix);
            for(let file of files){
                const info=fs.statSync(path+prefix+"/"+file);
                if(info.isDirectory())
                    iterator(prefix+"/"+file,file);
                else{
                    const arr=file.split(".");
                    if(arr[arr.length-1]=="js"){
                        if(arr[0]==dir)
                            arr[0]="";
                        console.log(`[${new Date()}] RoutesLoader : `+prefix+"/"+arr[0]+" --> "+path+prefix+"/"+file);
                        this.router.use(prefix+"/"+arr[0],require(path+prefix+"/"+file).routes());
                    }
                }
            }
        }.bind(this);

        iterator("",dir);

        return this.router;
    }
}

module.exports = RoutesLoader;