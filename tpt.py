# -*- coding: utf-8 -*-

import numpy as np
import scipy.sparse

from msmbuilder.utils import deprecated

import logging
logger = logging.getLogger(__name__)



def _ensure_iterable(arg):
    if not hasattr(arg, '__iter__'):
        arg = list([int(arg)])
        logger.debug("Passed object was not iterable,"
                     " converted it to: %s" % str(arg))
    assert hasattr(arg, '__iter__')
    return arg


def _check_sources_sinks(sources, sinks):
    sources = _ensure_iterable(sources)
    sinks = _ensure_iterable(sinks)
    if np.any(sources == sinks):
        raise ValueError("Sets `sources` and `sinks` must be disjoint "
                         "to find paths between them")
    return sources, sinks

def find_top_paths(sources, sinks, tprob, num_paths=10, node_wipe=False, net_flux=None):
    
    sources, sinks = _check_sources_sinks(sources, sinks)

    if not net_flux:
        net_flux = calculate_net_fluxes(sources, sinks, tprob)

    # initialize objects
    paths = []
    fluxes = []
    bottlenecks = []

    if scipy.sparse.issparse(net_flux):
        net_flux = net_flux.tolil()

    # run the initial Dijkstra pass
    pi, b = Dijkstra(sources, sinks, net_flux)

    logger.info("Path Num | Path | Bottleneck | Flux")

    i = 1
    done = False
    while not done:

        # First find the highest flux pathway
        (path, (b1, b2), flux) = _backtrack(sinks, b, pi, net_flux)

        # Add each result to a Paths, Bottlenecks, Fluxes list
        if flux == 0:
            logger.info("Only %d possible pathways found. Stopping backtrack.", i)
            break
        paths.append(path)
        bottlenecks.append((b1, b2))
        fluxes.append(flux)
        logger.info("%s | %s | %s | %s ", i, path, (b1, b2), flux)

        # Cut the bottleneck, start relaxing from B side of the cut
        if node_wipe:
            net_flux[:, b2] = 0
            logger.info("Wiped node: %s", b2)
        else:
            net_flux[b1, b2] = 0

        G = scipy.sparse.find(net_flux)
        Q = [b2]
        b, pi, net_flux = _back_relax(b2, b, pi, net_flux)

        # Then relax the graph and repeat
        # But only if we still need to
        if i != num_paths - 1:
            while len(Q) > 0:
                w = Q.pop()
                for v in G[1][np.where(G[0] == w)]:
                    if pi[v] == w:
                        b, pi, net_flux = _back_relax(v, b, pi, net_flux)
                        Q.append(v)
                Q = sorted(Q, key=lambda v: b[v])

        i += 1
        if i == num_paths + 1:
            done = True
        if flux == 0:
            logger.info("Only %d possible pathways found. Stopping backtrack.", i)
            done = True

    return paths, bottlenecks, fluxes
def Dijkstra(sources, sinks, net_flux):

    sources, sinks = _check_sources_sinks(sources, sinks)

    # initialize data structures
    if scipy.sparse.issparse(net_flux):
        net_flux = net_flux.tolil()
    else:
        net_flux = scipy.sparse.lil_matrix(net_flux)

    G = scipy.sparse.find(net_flux)
    N = net_flux.shape[0]
    b = np.zeros(N)
    b[sources] = 1000
    pi = np.zeros(N, dtype=int)
    pi[sources] = -1
    U = []

    Q = sorted(range(N), key=lambda v: b[v])
    for v in sinks:
        Q.remove(v)

    # run the Dijkstra algorithm
    while len(Q) > 0:
        w = Q.pop()
        U.append(w)

        # relax
        for v in G[1][np.where(G[0] == w)]:
            if b[v] < min(b[w], net_flux[w, v]):
                b[v] = min(b[w], net_flux[w, v])
                pi[v] = w

        Q = sorted(Q, key=lambda v: b[v])

    logger.info("Searched %s nodes", len(U) + len(sinks))

    return pi, b
    
def _back_relax(s, b, pi, NFlux):

    G = scipy.sparse.find(NFlux)
    if len(G[0][np.where(G[1] == s)]) > 0:

        # For all nodes connected upstream to the node `s` in question,
        # Re-source that node from the best option (lowest cost) one level lower
        # Notation: j is node one level below, s is the one being considered

        b[s] = 0                                 # set the cost to zero
        for j in G[0][np.where(G[1] == s)]:    # for each upstream node
            if b[s] < min(b[j], NFlux[j, s]):   # if that node has a lower cost
                b[s] = min(b[j], NFlux[j, s])   # then set the cost to that node
                pi[s] = j                        # and the source comes from there

    # if there are no nodes connected to this one, then we need to go one
    # level up and work there first
    else:
        for sprime in G[1][np.where(G[0] == s)]:
            NFlux[s, sprime] = 0
            b, pi, NFlux = _back_relax(sprime, b, pi, NFlux)

    return b, pi, NFlux


def _backtrack(B, b, pi, NFlux):
    
    # Select starting location
    bestflux = 0
    for Bnode in B:
        path = [Bnode]
        NotDone = True
        while NotDone:
            if pi[path[-1]] == -1:
                break
            else:
                path.append(pi[path[-1]])
        path.reverse()

        bottleneck, flux = find_path_bottleneck(path, NFlux)

        logger.debug('In Backtrack: Flux %s, bestflux %s', flux, bestflux)

        if flux > bestflux:
            bestpath = path
            bestbottleneck = bottleneck
            bestflux = flux

    if flux == 0:
        bestpath = []
        bottleneck = (np.nan, np.nan)
        bestflux = 0

    return (bestpath, bestbottleneck, bestflux)


def find_path_bottleneck(path, net_flux):
    
    if scipy.sparse.issparse(net_flux):
        net_flux = net_flux.tolil()

    flux = 100000.  # initialize as large value

    for i in range(len(path) - 1):
        if net_flux[path[i], path[i + 1]] < flux:
            flux = net_flux[path[i], path[i + 1]]
            b1 = path[i]
            b2 = path[i + 1]

    return (b1, b2), flux


def calculate_fluxes(sources, sinks, tprob, populations=None, committors=None):
 
    sources, sinks = _check_sources_sinks(sources, sinks)


    if scipy.sparse.issparse(tprob):
        dense = False
    else:
        dense = True

    # check if we got the populations
    if populations is None:
        eigens = sparse.linalg.eigs(sparse.coo_matrix.transpose(M))[1][:,-1]
        if np.count_nonzero(np.imag(eigens[1][:, 0])) != 0:
            raise ValueError('First eigenvector has imaginary components')
        populations = np.real(eigens[1][:, 0])

    # check if we got the committors
    if committors is None:
        committors = calculate_committors(sources, sinks, tprob)

    # perform the flux computation
    Indx, Indy = tprob.nonzero()

    n = tprob.shape[0]

    if dense:
        X = np.zeros((n, n))
        Y = np.zeros((n, n))
        X[(np.arange(n), np.arange(n))] = populations * (1.0 - committors)
        Y[(np.arange(n), np.arange(n))] = committors
    else:
        X = scipy.sparse.lil_matrix((n, n))
        Y = scipy.sparse.lil_matrix((n, n))
        X.setdiag(populations * (1.0 - committors))
        Y.setdiag(committors)

    if dense:
        fluxes = np.dot(np.dot(X, tprob), Y)
        fluxes[(np.arange(n), np.arange(n))] = np.zeros(n)
    else:
        fluxes = (X.tocsr().dot(tprob.tocsr())).dot(Y.tocsr())
        # This should be the same as below, but it's a bit messy...
        #fluxes = np.dot(np.dot(X.tocsr(), tprob.tocsr()), Y.tocsr())
        fluxes = fluxes.tolil()
        fluxes.setdiag(np.zeros(n))

    return fluxes


def calculate_net_fluxes(sources, sinks, tprob, populations=None, committors=None):

    sources, sinks = _check_sources_sinks(sources, sinks)

    if scipy.sparse.issparse(tprob):
        dense = False
    else:
        dense = True

    n = tprob.shape[0]

    flux = calculate_fluxes(sources, sinks, tprob, populations, committors)
    ind = flux.nonzero()

    if dense:
        net_flux = np.zeros((n, n))
    else:
        net_flux = scipy.sparse.lil_matrix((n, n))

    for k in range(len(ind[0])):
        i, j = ind[0][k], ind[1][k]
        forward = flux[i, j]
        reverse = flux[j, i]
        net_flux[i, j] = max(0, forward - reverse)

    return net_flux

