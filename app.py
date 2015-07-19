# encoding: UTF-8

# Author: Carlos Xavier Hernández <cxh@stanford.edu>
# Contributors: Robert McGibbon <rmcgibbo@gmail.com>
# Copyright (c) 2014, Stanford University
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#   Redistributions of source code must retain the above copyright notice,
#   this list of conditions and the following disclaimer.
#
#   Redistributions in binary form must reproduce the above copyright
#   notice, this list of conditions and the following disclaimer in the
#   documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
# IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
# TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
# PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
# TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
# PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
# LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
# NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

# -----------------------------------------------------------------------------
# IMPORTS
# -----------------------------------------------------------------------------

import os
import optparse
import uuid
import time
import tornado
import scipy.io as sio
import scipy.sparse as sparse
from msmbuilder import tpt
from msmbuilder.msm import MarkovStateModel
from msmbuilder.msm._markovstatemodel import _transmat_mle_prinz
import networkx as nx
from networkx.readwrite import json_graph
from StringIO import StringIO
from pymongo import Connection
import newrelic.agent
import tornado.ioloop
from tornado.web import (RequestHandler, StaticFileHandler)
from tornado.httpclient import AsyncHTTPClient

# Set up NEWRELIC
newrelic.agent.initialize('newrelic.ini')

# Set up MONGO CLIENT
__DB__ = 'MONGOHQ_URL'

# Dict of Available Network Metrics
resize = {
    'pagerank': lambda x, y, z:
    nx.pagerank_scipy(x),
    '1st eigenvector': lambda x, y, z:
    dict(zip(range(z.shape[0]), y.populations_)),
    '2nd eigenvector': lambda x, y, z:
    dict(zip(range(z.shape[0]), y.left_eigenvectors_[:, 1])),
    'closeness centrality': lambda x, y, z:
    nx.closeness_centrality(x),
    'flow betweenness': lambda x, y, z:
    nx.approximate_current_flow_betweenness_centrality(x)
    }

# Declare async
HTTP_CLIENT = AsyncHTTPClient()

# -----------------------------------------------------------------------------
# TASKS
# -----------------------------------------------------------------------------


# Connect to MONGODB
def connect_to_mongo():
    if __DB__ in os.environ:
        c = Connection(os.environ[__DB__])
    else:
        print "if youre developing locally, you need to get the MONGOLAB_URI"
        print 'env variable. run "heroku config" at the command line and'
        print 'it should give you the right string'
        c = Connection()
    # THIS IS APP SPECIFIC. PLEASE CHANGE APPLICATION ID.
    return c.app22870053


# MAKES MSM GRAPH AND RETURNS JSON
def make_json_graph(msm, request):
    c = float(request.get_argument('cutoff'))
    e = str(request.get_argument('resize'))
    t = sparse.csr_matrix(msm.transmat_.copy())
    t.data[t.data < c] = 0.0
    t.eliminate_zeros()
    G = nx.from_scipy_sparse_matrix(t, create_using=nx.DiGraph())
    metric = resize[e](G, msm, t)
    nx.set_node_attributes(G, 'size', metric)
    G.remove_nodes_from(nx.isolates(G))
    return json_graph.node_link_data(G)


# MAKES TRANSITIONS PATHWAYS AND RETURNS JSON
def make_json_paths(msm, request):
    sources = map(int,
                  request.get_argument('sources').replace(" ", "").split(","))
    sinks = map(int, request.get_argument('sinks').replace(" ", "").split(","))
    n = int(request.get_argument('num_paths'))
    net_flux = tpt.net_fluxes(sources, sinks, msm)
    paths = tpt.paths(sources, sinks, net_flux, num_paths=n)
    G = nx.DiGraph()
    for j, i in enumerate(paths[0][::-1]):
        G.add_node(i[0], type="source")
        for k in range(1, len(i)):
            G.add_node(i[k], type="none")
            G.add_edge(i[k-1], i[k], weight=paths[1][::-1][j])
        G.add_node(i[-1], type="sink")
    return json_graph.node_link_data(G)

DATABASE = connect_to_mongo()
print DATABASE.collection_names()


# GET USER OPTIONS
def parse_cmdln():
    parser = optparse.OptionParser()
    parser.add_option('-p', '--port', dest='port', type='int', default=5000)
    (options, args) = parser.parse_args()
    return (options, args)


# CREATES HOST SESSION AND LOGS USER IP INFO
class Session(object):
    """REALLLY CRAPPY SESSIONS FOR TORNADO VIA MONGODB
    """
    collection = DATABASE.sessions

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


# PREVENTS FREQUENT REQUESTS
class RunHandler(RequestHandler):
    # how often should we allow execution
    max_request_frequency = 10  # seconds

    def log(self, msg):
        print msg

    def get(self):
        if self.validate_request_frequency():
            request_id = str(uuid.uuid4())
            HTTP_CLIENT.fetch('localhost', method='POST', callback=self.log)
            self.write(request_id)

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


# COUNTS REQUESTS
class IndexHandler(StaticFileHandler):
    def get(self):
        session = Session(self.request)
        session.put('indexcounts', session.get('indexcounts', 0) + 1)
        return super(IndexHandler, self).get('index.html')


# HANDLES UPLOADED CONTENT
class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        io = StringIO(self.get_argument('matrix'))
        w = sio.mmread(io)
        msm = MarkovStateModel()
        msm.transmat_, msm.populations_ = _transmat_mle_prinz(w)
        msm.n_states_ = msm.populations_.shape[0]
        if bool(int(self.get_argument('mode'))):
            self.write(make_json_paths(msm, self))  # TP
        else:
            self.write(make_json_graph(msm, self))  # MSM

# -----------------------------------------------------------------------------
# STATIC CONTENT DECLARATIONS
# -----------------------------------------------------------------------------
application = tornado.web.Application([
    (r'/run', RunHandler),
    (r"/process", UploadHandler),
    (r'/', IndexHandler, {'path': 'public'}),
    (r'/js/(.*)', StaticFileHandler, {'path': 'public/js'}),
    (r'/css/(.*)', StaticFileHandler, {'path': 'public/css'}),
    (r'/images/(.*)', StaticFileHandler, {'path': 'public/images'}),
    (r'/help/(.*)', StaticFileHandler, {'path': 'public/help'}),
    ], debug=True)

# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    (options, args) = parse_cmdln()
    port = int(os.environ.get('PORT', options.port))
    application.listen(port)
    print "MSMExplorer is starting on port %s" % options.port
    tornado.ioloop.IOLoop.instance().start()
