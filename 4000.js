// server.js
const http = require("http");

const server = http.createServer((req, res) => {
    const { url, method } = req;

    // JSON API
    if (url === "/api/user" && method === "GET") {
        res.writeHead(200, {
            "Content-Type": "application/json",
        });

        res.end(
            JSON.stringify({
                success: true,
                data: {
                    id: 1,
                    name: "张三",
                    time: Date.now(),
                },
            }),
        );

        return;
    }

    // HTML 页面
    if (url === "/admin" && method === "GET") {
        res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
        });

        res.end(`
<!doctype html>
<html>
<head>
	<title>4000 测试页面</title>
</head>
<body>
	<h1>这是 4000 端口返回的 HTML 页面</h1>
	<p>当前时间：${new Date().toLocaleString()}</p>
</body>
</html>
`);

        return;
    }

    // 默认 404
    res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Not Found"+req.url);
});

server.listen(4000, () => {
    console.log("测试服务启动：http://localhost:4000");
});