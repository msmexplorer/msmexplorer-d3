import os, optparse, uuid, urlparse, time, tornado, tpt
import scipy.io as sio
import scipy.sparse as sparse
import scipy.sparse.linalg as linalg
import networkx as nx
from networkx.readwrite import json_graph
from StringIO import StringIO
from threading import Lock
from urllib import urlencode
from pymongo import Connection
import newrelic.agent
import tornado.ioloop
from tornado.web import (RequestHandler, StaticFileHandler, Application,asynchronous)
from tornado.websocket import WebSocketHandler
from tornado.httpclient import AsyncHTTPClient


newrelic.agent.initialize('newrelic.ini') 
__UPLOADS__ = "./public/uploads/"
__DB__ = 'MONGOHQ_URL'
resize = {'1st eigenvector':-1,'2nd eigenvector':-2}

HTTP_CLIENT = AsyncHTTPClient()
def urldecode(s):
    return dict(urlparse.parse_qsl(s))

def connect_to_mongo():
    if __DB__ in os.environ:
        c = Connection(os.environ[__DB__])
    else:
        print "if youre developing locally, you need to get the MONGOLAB_URI"
        print 'env variable. run "heroku config" at the command line and'
        print 'it should give you the right string'
        c = Connection()
    return c.app22870053
    
def make_json_graph(M,request):
    c,e=float(request.get_argument('cutoff')),resize[str(request.get_argument('resize'))]
    t = M.copy()*(M > c)
    G = nx.from_scipy_sparse_matrix(t,create_using=nx.Graph())
    r=dict(zip(range(M.shape[0]),map(abs,linalg.eigs(sparse.coo_matrix.transpose(M))[1][:,e])))
    nx.set_node_attributes(G,'size',r)
    G.remove_nodes_from(nx.isolates(G))
    return str(json_graph.dumps(G))
    
def make_json_paths(M,request):
    sources,sinks,n = map(int,request.get_argument('sources').split(",")),map(int,request.get_argument('sinks').split(",")),int(request.get_argument('num_paths'))
    paths = tpt.find_top_paths(sources,sinks,tprob=M,num_paths=n)
    G = nx.DiGraph()
    for j,i in enumerate(paths[0][::-1]):
        G.add_node(i[0],type="source")
        for k in range(1,len(i)):
            G.add_node(i[k],type="none")
            G.add_edge(i[k-1],i[k],weight=paths[2][::-1][j])
        G.add_node(i[-1],type="sink")
    return str(json_graph.dumps(G))
    
DATABASE = connect_to_mongo()
print DATABASE.collection_names()

def parse_cmdln():
    parser=optparse.OptionParser()
    parser.add_option('-p','--port',dest='port',type='int', default=5000)
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
        io = StringIO(self.get_argument('matrix'))
        w = sio.mmread(io)
        if bool(int(self.get_argument('mode'))):
            self.write(make_json_paths(w,self))
        else:
            self.write(make_json_graph(w,self))
        
        
        
        # fileinfo = self.request.files['filearg'][0]
#         fname = fileinfo['filename']
#         extn = os.path.splitext(fname)[1]
#         cname = 'tpt.json'
#         if 'json' in extn:
#         # cname = str(uuid.uuid4())+ extn
#             print "Uploading %s to %s" % (cname,__UPLOADS__)
#             fh = open(__UPLOADS__ + extn, 'w')
#             fh.write(fileinfo['body'])
#         self.finish(cname + " has uploaded. Check %s folder" %__UPLOADS__)
 
 
application = tornado.web.Application([
        (r'/run', RunHandler),
        (r"/process", UploadHandler),
        (r'/', IndexHandler, {'path': 'public'}),
        (r'/js/(.*)', StaticFileHandler, {'path': 'public/js'}),
        (r'/css/(.*)', StaticFileHandler, {'path': 'public/css'}),
        (r'/images/(.*)', StaticFileHandler, {'path': 'public/images'}),
        (r'/help/(.*)', StaticFileHandler, {'path': 'public/help'}),
        ], debug=True)
 
 
if __name__ == "__main__":
    (options,args)=parse_cmdln()
    port = int(os.environ.get('PORT', options.port))
    application.listen(port)
    print "MSMExplorer is starting on port %s" % options.port
    tornado.ioloop.IOLoop.instance().start()
