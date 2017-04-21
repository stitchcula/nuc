"use strict";

class Validator {
    constructor(value){
        this.value=value;
    }
    static chk(value){
        return new Validator(value);
    }
    string(){
        if(this.value&&typeof this.value!=="string")
            throw "不是字符串。";
        return this;
    }
    number(){
        if(this.value&&typeof this.value!=="number")
            throw "不是数字。";
        return this;
    }
    object(){
        if(this.value&&typeof this.value!=="object")
            throw "不是对象。";
        return this;
    }
    regex(reg){
        if(!reg.test(this.value))
            throw "不符合要求。";
        return this;
    }
    least(length){
        if(this.value.length<length)
            throw "太短了。";
        return this;
    }
    most(length){
        if(this.value.length>length)
            throw "太长了。";
        return this;
    }
    notnull(){
        if(!this.value)
            throw "不能为空。";
        return this;
    }
}

module.exports = Validator;