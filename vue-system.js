// 初始化 expressn
const express = require('express')
const app = express();
const query = require('./query.js')
const bodyParser = require('body-parser');
const fs = require("fs");
const qiniu = require("qiniu")

const router = express.Router();
// create application/json parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json({
    type: "application/json"
}))
app.use(bodyParser.raw({
    type: "multipart/form-data"
}));

//增加请求头 实现跨域访问
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
// 错误处理
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
app.get('/', (req, res) => {
    res.send('ok');

})
/**
 * 注册 
 * @param account:账号 password：密码 vCode：验证码
 */
app.post('/register', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    var isnext = null;


    query.select("SELECT account FROM `user` WHERE isDelete =0").then((data) => {
        if (data.status < 50) {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        isnext = data.data.some((ele) => {
            return req.body.account == ele.account;
        })
        if (isnext) {
            resObj.code = 6003;
            resObj.msg = "此账号已注册过，请换其他账号"
            res.send(resObj)
        } else {
            let sql = "INSERT INTO `user` (ACCOUNT,PASSWORD,ROLEID,CREATETIME,isDelete) VALUES ('" + req.body.account + "','" + req.body.password + "',0," + Date.now() + ",0)"
            query.update(sql).then((data) => {
                if (data.status < 50) {
                    resObj.code = 5000;
                    resObj.msg = 'error'
                }
                res.send(resObj)
            });
        }
    });


})

/**
 * 登录
 * @param account:账号 password：密码
 */
app.post('/login', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    query.select('SELECT account,password,id FROM user WHERE isDelete!=1').then(function (data) {
        if (data.status > 50) {
            var isAccount = data.data.some((element) => {
                return element.account == req.body.account
            })
            if (isAccount) {
                var ispassword = data.data.some((element) => {
                    return element.password == req.body.password
                })
                if (ispassword) {
                    data.data.forEach((element) => {
                        if (element.account == req.body.account) {
                            resObj.data = {
                                account: element.account,
                                id: element.id,
                            }
                        }

                    })
                } else {
                    resObj.code = 6002;
                    resObj.msg = '密码错误！'
                }
            } else {
                resObj.code = 6001;
                resObj.msg = '该账号未注册，请先去注册！'
            }
        } else {
            resObj.code = 5000;
            resObj.msg = 'error'
        }

        res.send(resObj);
    });
})
/**
 * 获取用户个人信息接口
 * @param id:用户id
 */
app.post('/getUserInfo', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    query.select('SELECT age,gender,nickname,realname,headPic,idNumber,roleId FROM user WHERE isDelete!=1 AND id=' + req.body.id).then((rows) => {
        if (rows.status > 50) {
            resObj.data = rows.data[0];
        } else {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj);
    })
})
/**
 * 更新个人信息
 * @param id：用户id ,userinfo:个人信息对象
 */
app.post('/updateUserInfo', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    var ui = req.body.userinfo;
    var sql = "UPDATE  `user` SET nickname='" + ui.nickname + "',gender='" + ui.gender + "',realname='" + ui.realname + "',headPic='" + ui.headPic + "' WHERE  id= " + req.body.id
    query.update(sql).then((data) => {
        if (data.status < 50) {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj)

    });
})


/*
 *获取单条入住评估记录
 * @param id:记录id
 */
app.post('/getCheckinAssessItem', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    query.select('SELECT * FROM checkinassess WHERE id=' + req.body.id).then((data) => {
        if (data.status > 50) {
            resObj.data = {
                name: data.data[0].name,
                gender: data.data[0].gender,
                age: data.data[0].age,
                idNumber: data.data[0].idNumber,
                reservateTime: data.data[0].reservationTime,
                contactPerson: data.data[0].contactPerson,
                phoneNum: data.data[0].contactMobile,
            }
        } else {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj);
    })
})
/*
 *新增或修改入住评估
 *@param type:1或0（0新增1修改）id:记录id(修改有，新增没有) formdata:修改信息对象
 */
app.post('/updateCheckinAssessItem', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    var fd = req.body.formdata;
    if (req.body.type == 0) { //新增
        let key = 'name,gender,age,idNumber,reservationTime,contactPerson,contactMobile,lastModifiedTime,isDelete';
        let val = '"' + fd.name + '","' + fd.gender + '",' + fd.age + ',"' + fd.idNumber + '","' + fd.reservateTime + '","' + fd.contactPerson + '","' + fd.phoneNum + '",' + new Date().getTime() + ',0'
        let sql = 'INSERT INTO checkinassess (' + key + ') VALUES (' + val + ')'
        query.update(sql).then((data) => {
            if (data.status < 50) {
                resObj.code = 5000;
                resObj.msg = 'error'
            }
            res.send(resObj)

        });

    } else if (req.body.type == 1) { //修改
        let sql = "UPDATE checkinassess SET name = '" + fd.name + "',gender = '" + fd.gender + "',age=" + fd.age + ",idNumber='" + fd.idNumber + "',reservationTime='" + fd.reservateTime + "',contactPerson='" + fd.contactPerson + "',contactMobile='" + fd.phoneNum + "',lastModifiedTime='" + new Date().getTime() + "' WHERE  id = " + req.body.id
        query.update(sql).then((data) => {
            console.log(data.data);
            res.send(resObj)
        });
    }

})
/**
 * 获取入住评估列表
 * @param currentPage:当前页，pageSize:每页条数,filterName:姓名筛选，filterNum:身份证号筛选
 */
app.post('/checkinAssessList', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    query.select('SELECT id,name,gender,age,idNumber,reservationTime,contactPerson,contactMobile FROM CheckinAssess WHERE isDelete!=1').then((rows) => {
        if (rows.status > 50) {
            resObj.data.list = [];
            resObj.data.totalCount = rows.data.length;
            let arr = [];
            rows.data.forEach((ele, index) => {
                if (req.body.filterName) {
                    if (ele.name.indexOf(req.body.filterName) == -1) {
                        return false;
                    }
                }
                if (req.body.filterNum) {
                    if (ele.idNumber.indexOf(req.body.filterNum) == -1) {
                        return false;
                    }
                }
                arr.push(ele);
            })
            arr.forEach((ele, index) => {
                if ((req.body.currentPage - 1) * req.body.pageSize <= index && index < req.body.currentPage * req.body.pageSize) {
                    resObj.data.list.push(ele);
                }
            })


        } else {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj);
    })

})
/**
 * 删除入住评估单条数据
 * @param id:数据id 
 */
app.post('/deleteCheckAssessItem', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    query.update("UPDATE CheckinAssess SET isDelete = 1 WHERE id = " + req.body.id).then((rows) => {
        if (rows.status < 50) {
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj)
    })
})
/**
 * 获取购物车商品列表
 */
app.post('/shoppingCartGoodsList', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {
            goodsList: [{
                id: 1,
                goodsName: "黑凤梨 20寸PC膜拉链登机箱",
                imgUrl: "http://yanxuan.nosdn.127.net/541c41e152ba5ce4772dc0977a48412b.png?quality=90&thumbnail=200x200&imageView",
                type: "钢琴白",
                price: 22800,
                num: 2,
                isChecked: false,
                active: ""
            }, {
                id: 2,
                goodsName: "日式和风声波式电动牙刷",
                imgUrl: "http://yanxuan.nosdn.127.net/9e3ef5c57fdffd8500aeb9f7c1c73710.png?quality=90&thumbnail=200x200&imageView",
                type: "静雅黑机身+一个刷头",
                price: 12900,
                num: 1,
                isChecked: true,
                active: ""
            }, {
                id: 3,
                goodsName: "2件装 海洋水彩汤盘 20.3cm",
                imgUrl: "http://yanxuan.nosdn.127.net/0c6f4a642b37afb41d4e00d7c1b08abc.png?quality=90&thumbnail=200x200&imageView",
                type: "2只装",
                price: 5948,
                num: 5,
                isChecked: true,
                active: ""
            }]
        }
    }
    res.send(resObj)

})

/**
 * 猜你喜欢
 */
app.post('/guessLike', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {
            guessLikeBaseUrl:["http://yanxuan.nosdn.127.net/","?imageView&quality=95&thumbnail=210x210"],
            guessLike: [{
                name: "跳色牛皮防水工装男靴",
                imgUrl: "d3affef4e9cf20002e241171085379ef.png",
                price: 45900,
                imgTag: "",
                prdtTags: ""

            }, {
                name: "经典海魂衫（女童）",
                imgUrl: "e3818b70274df103af254991d28b05f0.png",
                price: 4900,
                imgTag: "3色可选",
                prdtTags: ""

            }, {
                name: "棉双层纱波点娃娃裙（婴童）",
                imgUrl: "e5266a5dd11f8cf57a28cdd84321eeb8.png",
                price: 9900,
                imgTag: "",
                prdtTags: ""

            }, {
                name: "格纹棉质衬衫（婴童）",
                imgUrl: "fbbe08edbc745ca90fb7b535b614607a.png",
                price: 13900,
                imgTag: "",
                prdtTags: ""

            }, {
                name: "女童短袖polo衫",
                imgUrl: "36d7f8b70d45a3904e0be1ab0bc9bf3b.png",
                price: 4900,
                imgTag: "4色可选",
                prdtTags: "N元任选"

            }, {
                name: "日本制造 花花公子香氛蜡烛",
                imgUrl: "550e3ef5944660a1f299fea6748ca11e.png",
                price: 12900,
                imgTag: "日本制造",
                prdtTags: "满赠"

            }, {
                name: "粒面牛皮防水工装男靴",
                imgUrl: "c1a824d4edbd23e5d5d4816067f90a99.png",
                price: 45900,
                imgTag: "2色可选",
                prdtTags: ""

            }, {
                name: "太平猴魁礼盒 100克",
                imgUrl: "7010c51dfbd89590ed2799c509c159a3.png",
                price: 32800,
                imgTag: "",
                prdtTags: ""

            }, {
                name: "黑锋椴树蜜 418克",
                imgUrl: "3508a1332eb00b6707b8b58d52293963.png",
                price: 2800,
                imgTag: "",
                prdtTags: ""

            }, {
                name: "纯牛奶 12盒*2提",
                imgUrl: "d7b552bcbbcd5b99d46ba98516b219bd.png",
                price: 7990,
                imgTag: "",
                prdtTags: "限时福利价"

            }]
        }
    }
    res.send(resObj)

})

//获取七牛云上传凭证
var accessKey = 'Rbfxo7gz15zUtWCUq5pBvdSfws_oLEpR2As2gbEm';
var secretKey = '2NQSGLQNbjAu0UllGvFJ5_JFUpebREvvZCeIL5Q0';
var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
app.post("/getQiniuToken", (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    var bucket = "vue-system";
    var options = {
        scope: bucket
    }
    var putPolicy = new qiniu.rs.PutPolicy(options);
    var uploadToken = putPolicy.uploadToken(mac);

    resObj.data.uploadToken = uploadToken;
    res.send(resObj);
})



var server = app.listen(3001, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Express app listening at http://%s:%s', host, port);
});