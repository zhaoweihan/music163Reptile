// 初始化 expressn
const express = require('express')
const app = express();
const query = require('./query.js')
const bodyParser = require('body-parser');
var router = express.Router();
// create application/json parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

//增加请求头 实现跨域访问
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
// 错误处理
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
app.get('/', (req, res) => {
    res.send('ok');

})

// 登录
app.post('/login', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    console.log(req.body);
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


app.post('/tableList', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    resObj.data.list = [{
        num: "1",
        name: "赵日天",
        gender: "男",
        age: "18",
        idNumber: "110105199211010416",
        reservateTime: "2017-15-09",
        contactPerson: "zwh",
        phoneNum: "15011385817",
        operating: "操作"
    }]
    res.send(resObj);
})
var server = app.listen(3001, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Express app listening at http://%s:%s', host, port);
});