const mailer=require('nodemailer');
const transporter=mailer.createTransport({
    host: 'smtp.mxhichina.com',
    port: 25,
    auth: {
        user: process.env["MAILER_USER"],
        pass: process.env["MAILER_PASS"]
    }
});

class Mailer {
    static TPL_NEW_USER=0;

    static to(somebody){
        return new Mailer(somebody);
    }

    constructor(somebody){
        this.somebody=somebody;
    }

    tpl(_tpl){
        switch(_tpl){
            case this.TPL_NEW_USER :
                this.subject='【GT】已注册的用户信息提示'
                this.html=`<p>新用户您好，您的账号信息如下：</p>`+
                    `<p style='margin-left: 2rem'>用户名： ${this.args[0]}</p>`+
                    `<p style='margin-left: 2rem'>初始密码： ${this.args[1]}</p>`;
                break;
        }
    }

    params(...args){
        this.args=args;
    }

    async send(){
        return transporter.sendMail({
            from: `Guilmon Tech<${process.env["MAILER_USER"]}>`,
            to: this.somebody,
            subject: this.subject,
            html: this.html
        })
    }
}

