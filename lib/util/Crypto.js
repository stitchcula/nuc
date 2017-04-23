"use strict";

const cpt=require('crypto');

class Crypto {
    static createUin(){
        return Math.random().toString(36).substr(2);
    }
    static createToken(){
        return Crypto.sha256(Crypto.createUin());
    }
    static toBase64(str){
        return new Buffer(str).toString('base64');
    }
    static toString(base64){
        return new Buffer(base64,'base64').toString();
    }
    static sha256(str){
        const hasher=cpt.createHash("sha256");
        hasher.update(str);
        return hasher.digest('hex');
    }
}

module.exports = Crypto;
