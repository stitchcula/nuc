const Store = require('./Store.js');

module.exports = (opts = {}) => {
    const { key = "koa:sess", store = new Store() } = opts;

    return async (ctx, next) => {
        let id = ctx.get(key);

        if(!id) {
            ctx.session = {};
        } else {
            ctx.session = await store.get(id);
            // check session must be a no-null object
            if(typeof ctx.session !== "object" || ctx.session == null) {
                ctx.session = {};
            }
        }

        const old = JSON.stringify(ctx.session);

        await next();

        // if not changed
        if(old == JSON.stringify(ctx.session)){
            ctx.set(key, id);
            return;
        }

        // if is an empty object
        if(typeof ctx.session === 'object' && !Object.keys(ctx.session).length) {
            ctx.session = null;
        }

        // need clear old session
        if(id && !ctx.session) {
            await store.destroy(id);
            return;
        }

        // set/update session
        const sid = await store.set(ctx.session, Object.assign({}, opts, {sid: id}));
        ctx.set(key, sid);
    }
}

module.exports.Store = Store;