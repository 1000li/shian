"""本地预览服务器：多线程 + 禁缓存。
多线程解决浏览器并发请求被串行排队的问题；禁缓存保证改完刷新即可见。
用法： python serve.py [端口]   默认 8899
"""
import functools, http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8899

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with Server(('127.0.0.1', PORT), functools.partial(Handler, directory='.')) as httpd:
    print(f'serving http://127.0.0.1:{PORT}  (threaded, no-cache)')
    httpd.serve_forever()
