const mysql = require('mysql');
//connection config
var pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1992zwh123',
    database: 'zwhdb'
});




module.exports = {
    select: function (sql) {
        var promise = new Promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                // 使用连接
                connection.query(sql, function (err, rows) {
                    if (err) {
                        // console.log("err");
                        reject(err);
                    } else {
                        // console.log("yes");
                        if (rows.length > 0) {
                            resolve({
                                status: 99,
                                data:rows
                            });
                        } else {
                            resolve({
                                status: 0
                            });
                        }
                    }

                    connection.release();
                    //连接不再使用，返回到连接池
                });
            });
        })
        return promise;
    }
};