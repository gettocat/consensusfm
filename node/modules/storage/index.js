const Storage = require('./storage');
const Index = require('./index.entity');

class StorageFactory {
    constructor(app) {

        let net = app.network == 'main' ? '' : (app.network + "net");

        this.chain = new Storage(app, net + 'chain.dat');
        this.keystore = new Storage(app, net + 'keystore.dat', true);//todo: encrypt data
        this.Index = Index;

    }
    init() {
        return Promise.all([
            this.chain.init(),
        ])
    }
    getConnection(type) {
        if (!type || type == 'chain')
            return this.chain.getConnection();
        if (type == 'keystore')
            return this.keystore.getConnection();
    }
    getCollection(name, type) {
        let db = null;
        if (!type || type == 'chain')
            db = this.chain;
        if (type == 'keystore')
            db = this.keystore;

        return db.getCollection(name);
    }
}

module.exports = StorageFactory;