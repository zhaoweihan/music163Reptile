// 初始化 expressn
const app = require('express')();
//增加请求头 实现跨域访问
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.get('/', (req, res) => {
    res.send("hello world!");
})
app.post('/tableList', (req, res) => {
    var resObj = {
        code: 200,
        msg: "ok",
        data: {}
    }
    resObj.data.list = [{
        num:"1",
        name:"赵日天",
        gender:"男",
        age:"18",
        idNumber:"110105199211010416",
        reservateTime:"2017-15-09",
        contactPerson:"zwh",
        phoneNum:"15011385817",
        operating:"操作"
    }]
    res.send(resObj);
})
var server = app.listen(3001, function () {
    // 如果 express 开启成功,则会执行这个方法
    var port = server.address().port;
    console.log(`Express app listening at http://localhost:${port}`);
});