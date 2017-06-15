// 初始化 expressn
const express = require('express')
const app = express();
const query = require('./query.js')
const bodyParser = require('body-parser');
var router = express.Router();
// create application/json parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

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
app.use(function (err, req, res, next) {
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
    query.select('SELECT age,gender,nickname,realname,headPic,idNumber,roleId FROM user WHERE isDelete!=1 AND id='+req.body.id).then((rows)=>{
        if(rows.status>50){
            resObj.data=rows.data[0];
        }else{
            resObj.code = 5000;
            resObj.msg = 'error'
        }
        res.send(resObj);
    })
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


var server = app.listen(3001, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Express app listening at http://%s:%s', host, port);
});