// 初始化 express
var app = require('express')();
// 初始化 superagent 模块
var request = require('superagent');
// 加载 cheerio 模块
var cheerio = require('cheerio');
/**
 * 开启路由
 * 第一个参数指定路由地址,当前指向的是 localhost:3000/
 * 如果需要其他路由,可以这样定义,比如 需要我们的获取推荐歌单的路由 /recommendLst
 * app.get('/recommendLst', function(req, res){});
 */
app.get('/recommendLst', function (req, res) {
    // 初始化返回对象
    var resObj = {
        code: 200,
        data: []
    };

    // 使用 superagent 访问 discover 页面
    request.get('http://music.163.com/discover')
        .end(function (err, _response) {

            if (!err) {


                // 请求成功
                var dom = _response.text;

                // 使用 cheerio 加载 dom
                var $ = cheerio.load(dom);
                // 定义我们要返回的数组
                var recommendLst = [];
                // 获得 .m-cvrlst 的 ul 元素
                $('.m-cvrlst').eq(0).find('li').each(function (index, element) {

                    // 获得 a 链接
                    var cvrLink = $(element).find('.u-cover').find('a');
                    console.log(cvrLink.html());
                    // 获得 cover 歌单封面
                    var cover = $(element).find('.u-cover').find('img').attr('src');
                    var num=$(element).find('.u-cover').find('span.nb').text();
                    // 组织单个推荐歌单对象结构
                    var recommendItem = {
                        id: cvrLink.attr('data-res-id'),
                        title: cvrLink.attr('title'),
                        href: 'http://music.163.com' + cvrLink.attr('href'),
                        type: cvrLink.attr('data-res-type'),
                        cover: cover,
                        num:num
                    };
                    // 将单个对象放在数组中
                    recommendLst.push(recommendItem);

                });

                // 替换返回对象
                resObj.data = recommendLst;

            } else {
                resObj.code = 404;
                console.log('Get data error !');
            }
            // 响应数据
            res.send(resObj);

        });

});


/**
 * 开启express服务,监听本机3000端口
 * 第二个参数是开启成功后的回调函数
 */
var server = app.listen(3000, function () {
    // 如果 express 开启成功,则会执行这个方法
    var port = server.address().port;

    console.log(`Express app listening at http://localhost:${port}`);
});