const fs = require("fs");
const {shell} = require("electron");

module.exports = {
    /**
     * 是否数组
     * @param obj
     * @returns {boolean}
     */
    isArray(obj) {
        return typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == '[object array]' && typeof obj.length == "number";
    },

    /**
     * 是否数组对象
     * @param obj
     * @returns {boolean}
     */
    isJson(obj) {
        return typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && typeof obj.length == "undefined";
    },

    /**
     * 将一个 JSON 字符串转换为对象（已try）
     * @param str
     * @param defaultVal
     * @returns {*}
     */
    jsonParse(str, defaultVal = undefined) {
        if (str === null) {
            return defaultVal ? defaultVal : {};
        }
        if (typeof str === "object") {
            return str;
        }
        try {
            return JSON.parse(str.replace(/\n/g,"\\n").replace(/\r/g,"\\r"));
        } catch (e) {
            return defaultVal ? defaultVal : {};
        }
    },

    /**
     * 将 JavaScript 值转换为 JSON 字符串（已try）
     * @param json
     * @param defaultVal
     * @returns {string}
     */
    jsonStringify(json, defaultVal = undefined) {
        if (typeof json !== 'object') {
            return json;
        }
        try{
            return JSON.stringify(json);
        }catch (e) {
            return defaultVal ? defaultVal : "";
        }
    },

    /**
     * 随机数字
     * @param str
     * @param fixed
     * @returns {number}
     */
    runNum(str, fixed = null) {
        let _s = Number(str);
        if (_s + "" === "NaN") {
            _s = 0;
        }
        if (fixed && /^[0-9]*[1-9][0-9]*$/.test(fixed)) {
            _s = _s.toFixed(fixed);
            let rs = _s.indexOf('.');
            if (rs < 0) {
                _s += ".";
                for (let i = 0; i < fixed; i++) {
                    _s += "0";
                }
            }
        }
        return _s;
    },

    /**
     * 随机字符串
     * @param len
     * @returns {string}
     */
    randomString(len) {
        len = len || 32;
        let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678oOLl9gqVvUuI1';
        let maxPos = $chars.length;
        let pwd = '';
        for (let i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    },

    /**
     * 字符串是否包含
     * @param string
     * @param find
     * @param lower
     * @returns {boolean}
     */
    strExists(string, find, lower = false) {
        string += "";
        find += "";
        if (lower !== true) {
            string = string.toLowerCase();
            find = find.toLowerCase();
        }
        return (string.indexOf(find) !== -1);
    },

    /**
     * 字符串是否左边包含
     * @param string
     * @param find
     * @param lower
     * @returns {boolean}
     */
    leftExists(string, find, lower = false) {
        string += "";
        find += "";
        if (lower !== true) {
            string = string.toLowerCase();
            find = find.toLowerCase();
        }
        return (string.substring(0, find.length) === find);
    },

    /**
     * 删除左边字符串
     * @param string
     * @param find
     * @param lower
     * @returns {string}
     */
    leftDelete(string, find, lower = false) {
        string += "";
        find += "";
        if (this.leftExists(string, find, lower)) {
            string = string.substring(find.length)
        }
        return string ? string : '';
    },

    /**
     * 字符串是否右边包含
     * @param string
     * @param find
     * @param lower
     * @returns {boolean}
     */
    rightExists(string, find, lower = false) {
        string += "";
        find += "";
        if (lower !== true) {
            string = string.toLowerCase();
            find = find.toLowerCase();
        }
        return (string.substring(string.length - find.length) === find);
    },

    /**
     * 打开文件
     * @param path
     */
    openFile(path) {
        if (!fs.existsSync(path)) {
            return
        }
        shell.openPath(path).then(() => {
        })
    },

    /**
     * 删除文件夹及文件
     * @param path
     */
    deleteFile(path) {
        let files = [];
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path);
            files.forEach(function (file, index) {
                let curPath = path + "/" + file;
                if (fs.statSync(curPath).isDirectory()) {
                    deleteFile(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    },

    /**
     * 复制文件
     * @param srcPath
     * @param tarPath
     * @param cb
     */
    copyFile(srcPath, tarPath, cb) {
        let rs = fs.createReadStream(srcPath)
        rs.on('error', function (err) {
            if (err) {
                console.log('read error', srcPath)
            }
            cb && cb(err)
        })
        let ws = fs.createWriteStream(tarPath)
        ws.on('error', function (err) {
            if (err) {
                console.log('write error', tarPath)
            }
            cb && cb(err)
        })
        ws.on('close', function (ex) {
            cb && cb(ex)
        })
        rs.pipe(ws)
    },

    /**
     * 给地址加上前后
     * @param str
     * @returns {string}
     */
    formatUrl(str) {
        let url;
        if (str.substring(0, 7) === "http://" ||
            str.substring(0, 8) === "https://") {
            url = str.trim();
        } else {
            url = "http://" + str.trim();
        }
        if (url.substring(url.length - 1) != "/") {
            url += "/"
        }
        return url;
    },

    /**
     * 正则提取域名
     * @param weburl
     * @returns {string|string}
     */
    getDomain(weburl) {
        let urlReg = /http(s)?:\/\/([^\/]+)/i;
        let domain = (weburl + "").match(urlReg);
        return ((domain != null && domain.length > 0) ? domain[2] : "");
    },
}
