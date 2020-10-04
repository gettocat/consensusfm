const BN = require('bn.js');
class Chain {

    constructor(app) {
        this.app = app;
        this.genesis = this.cnf('genesis').hash;
        this.last = genesis;
        this.diff = 1;

        app.on("block", () => {

            this.updateLastId();
            this.updateLastDiff();

        })

    }
    init() {
        return Promise.all([
            this.updateLastId(),
            this.updateLastDiff()
        ])
    }

    lastBlockId() {
        return this.last;
    }

    getNetDifficult() {
        return this.diff;
    }

    updateLastId() {
        return new Promise(resolve => {
            this.app.db.BLOCK
                .findOne({
                    where: {
                        type: this.app.db.BLOCK.TYPE_TOPIC,
                    },
                    order: [
                        ['timestamp', 'DESC']
                    ]
                })
                .then((block) => {
                    if (block.hash)
                        this.last = block.hash
                    else {
                        this.last = genesis;
                        //save genesis block, try ask from another blocks
                    }

                    resolve();
                })
        })
    }

    updateLastDiff() {
        return new Promise(resolve => {
            this.getLastBlocks(12)
                .then((blocks) => {
                    this.diff = this.getAvgDifficulty(blocks);
                    resolve();
                })
        })
    }

    getLastBlocks(limit) {
        return this.app.db.BLOCK.findOne({
            where: {
                type: this.app.db.BLOCK.TYPE_TOPIC,
            },
            order: [
                ['timestamp', 'DESC']
            ],
            limit: limit
        })
    }

    getAvgDifficulty(blocks) {
        let target_seconds = 60;
        let timestamps = [];
        let diff_avg = 0;

        if (blocks.length < 6)
            return 1;

        for (let i in blocks) {
            diff_avg += blocks[i].bits;
            timestamps.push(blocks[i].timestamp);
        }

        timestamps.sort();
        let time_span = Math.abs(timestamps[timestamps.length - 1] - timestamps[0]);

        let res2 = new BN(diff_avg).mul(new BN(target_seconds))
        return res2.add(new BN(time_span)).sub(new BN(1)).div(new BN(time_span)).toNumber();
    }

    send(data) {
        return new Promise((resolve, reject) => {
            //broadcast data to all 
            this.app.on(data.hash, (status, message) => {
                if (status){
                    resolve(data)
                } else {//reject
                    reject(message)
                }
            })
        })
    }

    createBlock() {

    }

    createTopic() {

    }

    createVote() {

    }

    createComment() {

    }

}


module.exports = Chain;