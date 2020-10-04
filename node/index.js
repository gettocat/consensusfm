const EventEmitter = require('events');
const path = require('path');
const appError = require('./error').createAppError;

class app extends EventEmitter {
    constructor(config, network, initConfig) {
        super();

        if (!network)
            network = 'main';

        if (!config)
            config = {};

        this.cwd = "./";
        if (config.cwd)
            this.cwd = config.cwd + "/node/";

        config.network = network;
        this.firstRun = initConfig;//create prompt for password ask, and secure keystore and create hash for ui. 
        this.network = network;
        this.f_noconflict = false;
        this.fisReadySended = false;
        this.appstate = '';
        this.prevappstate = '';
        this.miningstate = '';
        this.syncstate = '';
        this.skiplist = [];
        this.logModules = ['config', 'crypto', 'tools', 'db', 'storage', 'index', 'app', 'network', 'error'];
        this.logLevels = ['info', 'debug', 'error', 'warn'];

        process.on('unhandledRejection', (reason, p) => {
            console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
        });

        this.loadModule('config')
            .then(() => {
                this.loadConfig(config);

                //load system modules
                return Promise.all([
                    this.loadToolset('crypto'),
                    this.loadToolset('tools'),
                    this.loadModule('db'),
                ])
            })
            .then(() => {
                this.logModules = this.cnf('logs').modules;
                this.logLevels = this.cnf('logs').levels;
                this.emit("beforeinit");
                this.emit("_caninit");
            })

    }
    debug(level, module_name, text) {

        var arr = [
        ];
        for (var i in arguments) {
            if (i < 2)
                continue
            arr.push(arguments[i]);
        }

        this.emit("app.debug", {
            level: level,
            module: module_name,
            text: arr,
        });
    }
    skipModules(skiplist) {
        this.skiplist = skiplist;
    }
    //skip settings and modules for start 2 or more instances, must invoke before init()
    noConflict(cb) {
        this.f_noconflict = cb;
    }
    init(modules) {

        return new Promise((res) => {

            this.on("_caninit", () => {
                if (!modules)
                    modules = this.cnf('modules');

                if (this.f_noconflict instanceof Function)
                    this.f_noconflict.apply(this, ['beforeload']);

                return this.loadModules(modules)
                    .then((results) => {
                        this.debug('info', "app", 'loaded all modules; sending init event');

                        if (this.f_noconflict instanceof Function)
                            this.f_noconflict.apply(this, ['beforeinit']);

                        this.emit("init", results);
                        res(results);
                    })
                    .catch((e) => {
                        throw e;
                    })
            });

            this.emit('_caninit')
        });

    }
    throwErrorByCode(module, code) {
        let err = this[module]['errors'][code];
        this.throwError(err[1], err[0], err[2]);
    }
    throwError(message, code, details) {
        throw (
            appError({
                message: message,
                extendedInfo: details || "",
                code: code,
            })
        );
    }
    loadModules(arr) {

        let prevState = false;
        for (let i = 0; i < arr.length; i++) {
            if (this.skiplist.indexOf(arr[i]) >= 0)
                continue;
            if (arr[i] instanceof Array)
                prevState = this.loadModule(arr[i][0], arr[i][1], prevState)
            else
                prevState = this.loadModule(arr[i], false, prevState)
        }

        return prevState;
    }
    loadModule(name, modulepath, prevState) {
        let filepath = path.resolve(name);
        if (!modulepath) {
            filepath = this.cwd + "modules/" + name;
        } else {
            filepath = modulepath;
        }

        if (!(prevState instanceof Promise))
            prevState = Promise.resolve();

        let rs = prevState.then(() => {
            let res = null;
            let cls = require(filepath + '/index');
            this[name] = new cls(this, name);
            if (this[name].init instanceof Function)
                res = this[name].init();

            let rs;
            if (res instanceof Promise)
                rs = res;
            else
                rs = Promise.resolve(res);

            return rs;
        });

        return rs.then((RES) => {
            this.debug('info', name, 'loaded');
            this.emit("module.loaded", {
                module: name,
                object: this[name]
            });

            return Promise.resolve(RES);
        });
    }
    loadToolset(name, modulepath) {
        let filepath = path.resolve(name);
        if (!modulepath) {
            filepath = "./modules/" + name;
        } else {
            filepath = modulepath;
        }

        this[name] = require(filepath + '/index');
        if (this[name].init instanceof Function)
            this[name].init(this);
        this.debug('info', name, 'loaded');
        this.emit("module.loaded", {
            module: name,
            object: this[name],
            toolset: true,//static library (no object with constructor, just set of some tool-functions)
        });

        return Promise.resolve(this[name]);
    }
    loadConfig(optionsOrFile) {
        this.debug("info", "config", 'load config file')
        this.emit("config.load", optionsOrFile);
    }
    cnf(argument) {

        if (argument && argument != this.config.arg.network) {
            if (['tests', 'network', 'agent'].indexOf(argument) >= 0)
                return this.config.arg[argument];
            else
                return this.config.arg[this.config.arg.network][argument];
        } else if (argument && argument == this.config.arg.network)
            return this.config.arg[this.config.arg.network];//get network settings only

        return this.config.arg;//get all config
    }
    connect(peers) {
        for (let i in peers) {
            //this.network.protocol.initNode(peers[i].split(":").join("//"));
        }
    }
    logIsEnabled(module, level) {
        if (this.logModules.indexOf(module) != -1) {
            if (this.logLevels.indexOf(level) != -1) {
                return true;
            }
        }

        return false;
    }
    excludeLogModules(blacklist) {
        for (let i in blacklist) {
            let index = this.logModules.indexOf(blacklist[i]);
            if (index == -1)
                continue;
            this.logModules.splice(index, 1);
        }

        return true;
    }
    includeLogModules(list) {
        let a = this.logModules.concat(list);
        return this.logModules = a.filter(function (item, pos) {
            return a.indexOf(item) == pos;
        })
    }
    setLogModules(list) {
        return this.logModules = list;
    }
    getDefaultConfig() {
        return {
            "port": 19841,
            "magic": "aa3a2b2f",
            "nodes": [
                "127.0.0.1//19841",
            ],
            "modules": [
                "storage",
            ],
            "ui": {
                "port": "3000",
                "host": "127.0.0.1"
            },
            "logs": {
                "modules": ['config', 'crypto', 'tools', 'db', 'storage', 'index', 'app', 'network', 'error'],
                "levels": ['info', 'debug', 'error', 'warn'],
            }
        }
    }
    getAgentName() {
        return {
            "name": "fridayjs",
            "version": 0.1
        }
    }
}


app.cli = require('./cli.js');
module.exports = app;