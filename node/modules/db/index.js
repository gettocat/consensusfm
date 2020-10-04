const { Sequelize } = require('sequelize');
class Db {
    constructor(app) {
        this.app = app;
        this.connection = new Sequelize(app.cnf('db').database, app.cnf('db').username, app.cnf('db').password, {
            host: app.cnf('db').host,
            dialect: app.cnf('db').algo,
            logging: app.cnf('db').debug,
            pool: {
                max: 500,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        });

        this.BLOCK = require('./block')(app, this.connection);
    }
    init() {
        this.app.debug("info", "db", "init");
        return this.connection.authenticate()
            .then(() => {
                return this.connection.sync({ force: false });
            })
            .then(() => {
                return Promise.resolve(this.connection);
            })
    }
    getConnection() {
        return this.connection;
    }

}

module.exports = Db;