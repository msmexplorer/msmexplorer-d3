#!/Users/cu3alibre/anaconda/bin/python

import os, optparse, uuid, urlparse, time
from threading import Lock
from urllib import urlencode
from pymongo import Connection
import tornado.ioloop
from tornado.web import (RequestHandler, StaticFileHandler, Application,asynchronous)
from tornado.websocket import WebSocketHandler
from tornado.httpclient import AsyncHTTPClient
 
__UPLOADS__ = "./public/uploads/"

HTTP_CLIENT = AsyncHTTPClient()
def urldecode(s):
    return dict(urlparse.parse_qsl(s))

def connect_to_mongo():
    if 'MONGOHQ_URL' in os.environ:
        c = Connection(os.environ['MONGOHQ_URL'])
    else:
        print "if youre developing locally, you ned to get the MONGOHQ_URL"
        print 'env variable. run "heroku config" at the command line and'
        print 'it should give you the right string'
        c = Connection()
    return c.app14240963
DATABASE = connect_to_mongo()
print DATABASE.collection_names()

def parse_cmdln():
    parser=optparse.OptionParser()
    parser.add_option('-p','--port',dest='port',type='int', default=8000)
    (options, args) = parser.parse_args()
    return (options, args)

class Session(object):
    """REALLLY CRAPPY SESSIONS FOR TORNADO VIA MONGODB
    """
    collection = DATABASE.sessions
    # mongo db database
    
    def __init__(self, request):
        data = {
            'ip_address': request.remote_ip,
            'user_agent':  request.headers.get('User-Agent')
        }
        result = self.collection.find_one(data)
        if result is None:
            # create new data
            self.collection.insert(data)
            self.data = data
        else:
            self.data = result

    def get(self, attr, default=None):
        return self.data.get(attr, default)
    
    def put(self, attr, value):
        self.collection.remove(self.data)
        self.data[attr] = value
        self.collection.insert(self.data)
    
    def __repr__(self):
        return str(self.data)
 
class RunHandler(RequestHandler):
    # how often should we allow execution
    max_request_frequency = 10  # seconds

    def log(self, msg):
        print msg
        
    def get(self):
        if self.validate_request_frequency():
            request_id = str(uuid.uuid4())
            HTTP_CLIENT.fetch('localhost', method='POST', callback=self.log)
            self.write()
            
    def validate_request_frequency(self):
        """Check that the user isn't requesting to run too often"""
        session = Session(self.request)
        last_run = session.get('last_run')
        if last_run is not None:
            if (time.time() - last_run) < self.max_request_frequency:
                self.write("You're being a little too eager, no?")
                return False
        session.put('last_run', time.time())

        return True
        
class IndexHandler(StaticFileHandler):
    def get(self):
        session = Session(self.request)
        session.put('indexcounts', session.get('indexcounts', 0) + 1)
        return super(IndexHandler, self).get('index.html')
 
class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        fileinfo = self.request.files['filearg'][0]
        fname = fileinfo['filename']
        extn = os.path.splitext(fname)[1]
        cname = str(uuid.uuid4()) + extn
        fh = open(__UPLOADS__ + cname, 'w')
        fh.write(fileinfo['body'])
        self.finish(cname + " has uploaded. Check %s folder" %__UPLOADS__)
 
 
application = tornado.web.Application([
        (r'/run', RunHandler),
        (r"/upload", UploadHandler),
        (r'/', IndexHandler, {'path': 'public'}),
        (r'/js/(.*)', StaticFileHandler, {'path': 'public/js'}),
        (r'/css/(.*)', StaticFileHandler, {'path': 'public/css'}),
        (r'/assets/(.*)', StaticFileHandler, {'path': 'public/assets'}),
        (r'/uploads/(.*)', StaticFileHandler, {'path': 'public/uploads'}),
        ], debug=True)
 
 
if __name__ == "__main__":
    (options,args)=parse_cmdln()
    port = int(os.environ.get('PORT', options.port))
    application.listen(port)
    print "MSMExplorer is starting on port %s" % options.port
    tornado.ioloop.IOLoop.instance().start()
