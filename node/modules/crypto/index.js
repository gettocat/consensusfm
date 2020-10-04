/*
* Orwell http://github.com/gettocat/orwell
* Platform for building decentralized applications
* MIT License
* Copyright (c) 2017 Nanocat <@orwellcat at twitter>
*/

let crypto = function (privk, public) {
    this.ec = new EC('secp256k1');
    if (privk)
        this.private = this.ec.keyFromPrivate(privk, 16);

    if (!public && this.private)
        this.public = this.private.getPublic(true, 'hex');
    else if (public && this.private)
        this.public = public;
}

crypto.prototype = {
    ec: null,
    init: function () {


        if (!this.private) {
            this.private = this.ec.genKeyPair();
            this.public = this.private.getPublic(true);
            return 1;
        }


    },
    ecdsa: function () {
        return this.ec;
    }

}

const EC = require('elliptic').ec;
const ec = new EC('secp256k1')
const cr = require('crypto');
const hash = require('hash.js');
const base58 = require('base-58');
const ecdsacsr = require('ecdsa-csr');
const keys = require('key-encoder').default;

module.exports = {
    createKeyPair: function () {
        var privateKey, publicKey;
        var cf = new crypto();
        if (status = cf.init()) {
            privateKey = cf.private.getPrivate('hex');
            publicKey = cf.private.getPublic(true, 'hex');
        }

        return {
            status: status,
            public: publicKey,
            private: privateKey
        }
    },
    getPublicByPrivate: function (priv) {
        var cf = new crypto(priv);
        return cf.private.getPublic(true, 'hex');
    },
    sign: function (priv, messageBinary) {
        let cf = ec.keyFromPrivate(Buffer.from(priv, 'hex').toString('hex'), 'hex'),
            sig = cf.sign(messageBinary, Buffer.from(priv, 'hex'));

        return Buffer.from(sig.toDER())
    },
    verify: function (public, sign, messageBinary) {
        let key = ec.keyFromPublic(public, 'hex');
        return key.verify(messageBinary, Buffer.from(sign, 'hex'));
    },
    createECDHsecret(exported_public, keystore) {
        let ec = new EC('secp256k1');
        let key = ec.keyFromPrivate(keystore.privateKey, 16);
        let key2 = ec.keyFromPublic(exported_public, 'hex');
        return key.derive(key2.getPublic()).toString(16);
    },
    encryptECDH(buffer, secret, algorithm) {
        if (!algorithm)
            algorithm = 'aes-256-ctr';

        secret = Buffer.from(secret, 'hex');
        const key = cr.scryptSync(secret, '5c4d018cdceb47b7051045c29d3130203b999f03d3c4200b7fe957ea99', secret.length);
        const iv = cr.randomBytes(16);
        let cipher = cr.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
        return Buffer.concat([iv, cipher.update(Buffer.from(buffer, 'hex')), cipher.final()]);
    },
    decryptECDH(buffer, secret, algorithm) {
        if (!algorithm)
            algorithm = 'aes-256-ctr';

        const iv = buffer.slice(0, 16);
        const payload = buffer.slice(16);
        secret = Buffer.from(secret, 'hex');
        const key = cr.scryptSync(secret, '5c4d018cdceb47b7051045c29d3130203b999f03d3c4200b7fe957ea99', secret.length);
        let decipher = cr.createDecipheriv(algorithm, key, iv);
        return Buffer.concat([decipher.update(payload), decipher.final()]);
    },
    createPEMfromPrivateKey(privateKey) {
        let keyEncoder = new keys({
            curveParameters: [1, 3, 132, 0, 10],
            privatePEMOptions: { label: 'EC PRIVATE KEY' },
            publicPEMOptions: { label: 'PUBLIC KEY' },
            curve: new EC('secp256k1')
        });

        return keyEncoder.encodePrivate(privateKey, 'raw', 'pem');
    },
    createCSRfromPEM(pem, domains) {
        return new Promise(resolve => {
            ecdsacsr({ key: pem, domains: domains }).then(function (csr) {
                resolve(csr);
            });
        })
    },
    createCSRfromPrivateKey(privateKey, domains) {
        return this.createCSRfromPEM(this.createPEMfromPrivateKey(privateKey), domains);
    },
    sha256: function (message, output) {
        if (!output)
            output = '';
        return cr.createHash('sha256').update(message).digest(output);
    },
    sha256d: function (message, output) {
        if (!output)
            output = '';
        return cr.createHash('sha256').update(message).update().digest(output);
    },
    ripemd160: function (message, output) {
        if (!output)
            output = '';
        return hash.ripemd160().update(message).digest(output)
    }
}