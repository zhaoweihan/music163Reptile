// 初始化 expressn
const app = require('express')();
// 初始化 superagent 模块
const request = require('superagent');
// 加载 cheerio 模块
const cheerio = require('cheerio');


function checkId(id){
    return /^[0-9]+$/.test(id);
}
//增加请求头 实现跨域访问
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

/**
 * 开启路由
 * 第一个参数指定路由地址,当前指向的是 localhost:3000/
 * 如果需要其他路由,可以这样定义,比如 需要我们的获取推荐歌单的路由 /recommendLst
 * app.get('/recommendList', function(req, res){});
 */
// 获得网易云音乐主页banner
app.get('/banner_list', function (req, res) {

    var requestUrl = 'http://music.163.com/discover';
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: {}
    };

    request.get(requestUrl)
        .end(function (err, _response) {

            if (!err) {

                // 成功返回 HTML
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 获得歌单 dom
                var bannerScript = $('script').eq(2);
                var bannerString = bannerScript.html().replace(/(^\s+)|(\s+$)/g, "").replace(/[\r\n]/g, "");
                bannerString = bannerString.substr(bannerString.indexOf("["), bannerString.length - 2);
                bannerString = eval(bannerString);

                for (var i = 0; i < bannerString.length; i++) {
                    if (bannerString[i].url.indexOf("http") != 0) {
                        bannerString[i].url = "http://music.163.com" + bannerString[i].url;
                    }
                }

                resObj.data = bannerString;

            } else {
                resObj.code = 404;
                resObj.message = "获取API出现问题";
                console.error('Get data error!');
            }

            res.send(resObj);

        });

});


//获取 推荐歌单列表
app.get('/recommendList', function (req, res) {
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
                    var cvrLink = $(element).find('.dec').find('a');
                    // 获得 cover 歌单封面
                    var cover = $(element).find('.u-cover').find('img').attr('src');
                    var num = $(element).find('.u-cover').find('span.nb').text();
                    // 组织单个推荐歌单对象结构
                    var recommendItem = {
                        id: cvrLink.attr('data-res-id'),
                        title: cvrLink.attr('title'),
                        href: 'http://music.163.com' + cvrLink.attr('href'),
                        type: cvrLink.attr('data-res-type'),
                        cover: cover,
                        num: num
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


// 定义根据歌单id获得歌单详细信息的API
app.get('/playlist/:playlistId', function (req, res) {

    var playlistId = req.params.playlistId;
    // 定义返回对象
    var resObj = {
        code: 200,
        data: {}
    };

    /**
     * 使用 superagent 请求
     * 在这里我们为什么要请求 http://music.163.com/playlist?id=${playlistId}
     * 简友们应该还记得 网易云音乐首页的 iframe
     * 应该还记得去打开 调试面板的 Sources 选项卡
     * 那么就可以看到在歌单页面 iframe 到底加载了什么 url
     */
    request.get(`http://music.163.com/playlist?id=${playlistId}`)
        .end(function (err, _response) {

            if (!err) {
                // 定义歌单对象
                var playlist = {
                    id: playlistId
                };

                // 成功返回 HTML, decodeEntities 指定不把中文字符转为 unicode 字符
                // 如果不指定 decodeEntities 为 false , 例如 " 会解析为 "
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 获得歌单 dom
                var dom = $('#m-playlist');
                // 歌单标题
                playlist.title = dom.find('.tit').text();
                //歌单封面
                playlist.cover = dom.find(".cover img").attr("data-src");
                // 歌单拥有者
                playlist.owner = dom.find('.user').find('.name').text();
                //歌单拥有者头像
                playlist.ownerPic = dom.find('.user img').attr('src');
                // 创建时间
                playlist.create_time = dom.find('.user').find('.time').text();
                // 歌单被收藏数量
                playlist.collection_count = dom.find('#content-operation').find('.u-btni-fav').attr('data-count');
                // 分享数量
                playlist.share_count = dom.find('#content-operation').find('.u-btni-share').attr('data-count');
                // 评论数量
                playlist.comment_count = dom.find('#content-operation').find('#cnt_comment_count').html();
                // 标签
                playlist.tags = [];
                dom.find('.tags').eq(0).find('.u-tag').each(function (index, element) {
                    playlist.tags.push($(element).text());
                });
                // 歌单描述
                playlist.desc = dom.find('#album-desc-more').html();
                // 歌曲总数量
                playlist.song_count = dom.find('#playlist-track-count').text();
                // 播放总数量
                playlist.play_count = dom.find('#play-count').text();

                resObj.data = playlist;

            } else {
                resObj.code = 404;
                console.log('Get data error!');
            }

            res.send(resObj);

        });
});

// 定义根据歌单id获得歌单所有歌曲列表的API
app.get('/song_list/:playlistId', function (req, res) {

    // 获得歌单ID
    var playlistId = req.params.playlistId;
    // 定义返回对象
    var resObj = {
        code: 200,
        data: []
    };

    request.get(`http://music.163.com/playlist?id=${playlistId}`)
        .end(function (err, _response) {

            if (!err) {

                // 成功返回 HTML
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 获得歌单 dom
                var dom = $('#m-playlist');

                resObj.data = JSON.parse(dom.find('#song-list-pre-cache').find('textarea').html());

            } else {
                resObj.code = 404;
                console.log('Get data error!');
            }

            res.send(resObj);

        });


});
//获取最新音乐列表
app.get('/latestMusicList', function (req, res) {
    // 初始化返回对象
    var resObj = {
        code: 200,
        data: []
    };
    request.get('http://music.163.com/discover')
        .end(function (err, _response) {
            if (!err) {
                var dom = _response.text;
                var $ = cheerio.load(dom);
                var latestMusicList = [];
                $("#album-roller ul").eq(0).find("li").each(function (index, element) {
                    latestMusicList.push({
                        picUrl: $(element).find('img').attr('data-src').replace("?param=100y100", ""),
                        albumName: $(element).find("a.tit").attr("title"),
                        albumUrl: "http://music.163.com" + $(element).find("a.tit").attr("href"),
                        singerName: $(element).find("p.tit.f-thide").attr("title"),
                        singerUrl: "http://music.163.com" + $(element).find("p.f-thide a").attr("href"),
                    })
                });
                var lastli = $("#album-roller ul").eq(1).find("li").eq(0);
                latestMusicList.push({
                    picUrl: lastli.find('img').attr('data-src').replace("?param=100y100", ""),
                    albumName: lastli.find("a.tit").attr("title"),
                    albumUrl: "http://music.163.com" + lastli.find("a.tit").attr("href"),
                    singerName: lastli.find("p.tit.f-thide").attr("title"),
                    singerUrl: "http://music.163.com" + lastli.find("p.f-thide a").attr("href"),
                });
                resObj.data = latestMusicList;
            } else {
                resObj.code = 404;
                console.log('Get data error!');
            }

            res.send(resObj);
        });
});
// 获取网易云音乐排行榜
app.get('/top_list', function (req, res) {

    var requestUrl = 'http://music.163.com/discover/toplist';
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: {}
    };

    request.get(requestUrl)
        .end(function (err, _response) {

            if (!err) {

                // 成功返回 HTML
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 定义返回对象
                var topList = [];

                var topListDom = $('#toplist').find('.n-minelst');

                // 分析云音乐特色榜
                var topListItem0 = {
                    title: topListDom.find('h2').eq(0).text(),
                    items: []
                };
                var topListItem0Ul = topListDom.find('ul').eq(0).find('li');
                topListItem0Ul.each(function (index, element) {
                    var item = {
                        cover: $(element).find('img').attr('src'),
                        name: $(element).find('.name').text(),
                        href: 'http://music.163.com' + $(element).find('.avatar').attr('href'),
                        update_time: $(element).find('.s-fc4').text()
                    };
                    topListItem0.items.push(item);
                });

                // 分析云音乐全球媒体榜
                var topListItem1 = {
                    title: topListDom.find('h2').eq(1).text(),
                    items: []
                };
                var topListItem1Ul = topListDom.find('ul').eq(1).find('li');
                topListItem1Ul.each(function (index, element) {
                    var item = {
                        cover: $(element).find('img').attr('src'),
                        name: $(element).find('.name').text(),
                        href: 'http://music.163.com' + $(element).find('.avatar').attr('href'),
                        update_time: $(element).find('.s-fc4').text()
                    };
                    topListItem1.items.push(item);
                });

                topList.push(topListItem0);
                topList.push(topListItem1);
                // 获得歌单 dom
                resObj.data = topList;

            } else {
                resObj.code = 404;
                resObj.message = "获取API出现问题";
                console.error('Get data error!');
            }

            res.send(resObj);

        });

});
//根据排行榜id 获取 歌曲列表
// 获取网易云音乐排行榜
app.get('/topSongList/:topid', function (req, res) {
    var requestUrl = 'http://music.163.com/discover/toplist?id='+req.params.topid;
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: []
    };

    request.get(requestUrl)
        .end(function (err, _response) {

            if (!err) {

                // 成功返回 HTML
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 定义返回对象
                var topsonglist = [];
                topsonglist = JSON.parse($("#song-list-pre-cache textarea").text());
                resObj.data = topsonglist.splice(0, 3);

            } else {
                resObj.code = 404;
                resObj.message = "获取API出现问题";
                console.error('Get data error!');
            }

            res.send(resObj);

        });

});
/*
获取全部歌单列表
*/
app.get('/allsonglist', function (req, res) {
    var requestUrl = 'http://music.163.com/discover/playlist';
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: []
    };

    request.get(requestUrl)
        .end(function (err, _response) {

            if (!err) {

                // 成功返回 HTML
                var $ = cheerio.load(_response.text, {
                    decodeEntities: false
                });
                // 定义返回对象
                var allsonglist = [];
                allsonglistText =$("#m-pl-container").find("li");
                allsonglistText.each(function(index,item){
                    var $item=$(item);
                    allsonglist.push({
                        id:$item.find('.bottom a').attr('data-res-id'),
                        type:$item.find('.bottom a').attr('data-res-type'),
                        picUrl:$item.find("img").attr('src').split('?param=')[0],
                        listName:$item.find("p.dec a").attr("title"),
                        listenNum:$item.find('.bottom .nb').text(),
                        auther:$item.find('a.f-thide.s-fc3').attr('title'),
                        isStar:$item.find('a.f-thide.s-fc3').next().length
                    })
                })
                resObj.data=allsonglist;

            } else {
                resObj.code = 404;
                resObj.message = "获取API出现问题";
                console.error('Get data error!');
            }

            res.send(resObj);

        });

});
// 根据歌曲 ID 获取歌曲详细信息
app.get('/song/:songId', function(req, res){

    // 获得歌曲ID
    var songId = req.params.songId;
    // 定义请求 url
    var requestUrl = 'http://music.163.com/api/song/detail/?id=' + songId + '&ids=[' + songId + ']';
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: {}
    };

    if (checkId(songId)) {
        request.get(requestUrl)
            .end(function(err, _response){

                if (!err) {

                    // 返回所有内容
                    resObj.data = JSON.parse(_response.text).songs;

                } else {
                    resObj.code = 404 ;
                    resObj.message = "获取API出现问题";
                    console.error('Get data error!');
                }

                res.send( resObj );

            });
    } else {
        resObj.code = 404 ;
        resObj.message = "参数异常";
        res.send( resObj );
    }

});
// 根据歌曲ID获得歌曲歌词

app.get('/lrc/:songId', function(req, res){

    // 获得歌曲ID
    var songId = req.params.songId;
    // 定义请求 url
    var requestUrl = 'http://music.163.com/api/song/lyric?os=pc&id=' + songId + '&lv=-1&kv=-1&tv=-1';
    // 定义返回对象
    var resObj = {
        code: 200,
        message: "加载成功",
        data: {}
    };

    if (checkId(songId)) {
        request.get(requestUrl)
            .end(function(err, _response){

                if (!err) {

                    // 返回所有内容
                    var wyres = JSON.parse(_response.text);
                    if (wyres.code === 200) {
                        delete wyres.code;
                        resObj.data = wyres;
                    } else {
                        resObj.code = wyres.code;
                        resObj.message = "获取API出现问题";
                    }

                } else {
                    resObj.code = 404 ;
                    resObj.message = "获取API出现问题";
                    console.error('Get data error!');
                }

                res.send( resObj );

            });
    } else {
        resObj.code = 404 ;
        resObj.message = "参数异常";
        res.send( resObj );
    }

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