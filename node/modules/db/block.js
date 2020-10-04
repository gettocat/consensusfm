const { Sequelize, Model, DataTypes } = require('sequelize');
const bitowl = require('bitowl');

module.exports = (app, db) => {
    class Block extends Model {
        pack(includeSign) {
            let d = {
                version: this.version,
                nonce: this.nonce,
                bits: this.bits,
                prev: this.prev,
                owner: this.owner,
                type: this.type,
                content: this.content,
                context: this.context,
                timestamp: this.timestamp
            };
            if (includeSign)
                d.sign = this.sign;
            return bitowl.data.pack(d);
        }
        getJSON() {
            return {
                version: this.version,
                hash: this.hash,
                nonce: this.nonce,
                bits: this.bits,
                prev: this.prev,
                owner: this.owner,
                type: this.type,
                content: this.content,
                context: this.context,
                timestamp: this.timestamp,
                sign: this.sign,
            }
        }
        getHash() {
            let buff = this.pack();
            return app.tools.sha256d(buff, 'hex');
        }
        static unpack(buffer) {
            let buff = Buffer.from(buffer, 'hex');
            return bitowl.data.unpack(buff);
        }
        static checkHash(hash, diff) {
            let uint128 = new BN(hash, 16);
            let m = uint128.mul(new BN(diff));
            let maxTarget = new BN(2).pow(new BN(250)).sub(new BN(1));
            return m.lt(maxTarget);
        }
        createNew(keystore, content, { context, type, prev }) {
            if (!prev)
                prev = this.app.chain.lastBlockId();

            let block = Block.build({
                version: app.cnf('version'),
                prev: prev,
                nonce: 0,
                bits: this.app.chain.getNetDifficult(),
                owner: keystore.public,
                type: type || Block.TYPE_TOPIC,
                content: content,
                context: context || '',
                timestamp: Date.now() / 1000
            });

            return block.sign(keystore)
                .then(() => {
                    return block.findNonce()
                })
                .then((nonce) => {
                    block.hash = this.getHash();
                    block.nonce = nonce;
                    return block.send();
                })
                .then(data => {
                    return Block.create(data);
                })
        }
        sign(keystore) {
            return new Promise((resolve, reject) => {
                let buff = this.pack();
                let der = this.app.crypto.sign(buff, keystore.private).toString('hex');
                this.sign = der;
                resolve(der);
            })
            //todo verify
        }
        findNonce() {
            return new Promise((resolve, reject) => {

                let i = 0;
                let diff = this.app.chain.getNetDifficult();
                let hash = this.getHash();
                while (!this.checkHash(hash, diff)) {
                    this.nonce = ++i;
                    hash = this.getHash();
                }

                resolve(i);

            })
        }
        send() {
            return this.app.send(this.getJSON())
        }
    }

    Block.TYPE_TOPIC = 0;
    Block.TYPE_VOTE = 1;
    Block.TYPE_COMMENT = 2;

    Block.beforeSave(block => {
        //check all fields to valid

    });

    Block.afterSave(block => {
        //broadcast?
    });

    Block.beforeUpdate(() => {
        throw app.createError();
    })

    Block.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        version: Sequelize.INTEGER,
        hash: Sequelize.STRING, //hash 
        nonce: Sequelize.INTEGER,//PoW only for flood control
        bits: Sequelize.INTEGER,
        prev: Sequelize.STRING, //hash of prev block
        owner: Sequelize.STRING, //public key 
        type: Sequelize.INTEGER, //0 topic, 1 vote, 2 comment
        content: Sequelize.TEXT, //json or wireblock of content
        context: Sequelize.STRING,//name of category this block (its for topic type)
        timestamp: Sequelize.INTEGER
    }, { sequelize: db, modelName: 'block', tableName: 'block' });

    return Block;
}