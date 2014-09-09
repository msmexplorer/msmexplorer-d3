# encoding: UTF-8

# Copyright 2011 Stanford University
#
# MSMBuilder is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

import sys
import numpy as np
import scipy.sparse
import scipy.sparse.linalg
import scipy
import warnings
import multiprocessing

import logging
logger = logging.getLogger(__name__)

DisableErrorChecking = False

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

    Q = sorted(list(range(N)), key=lambda v: b[v])
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
        eigens = get_eigenvectors(tprob, 1)
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

def calculate_committors(sources, sinks, tprob):

    sources, sinks = _check_sources_sinks(sources, sinks)

    if scipy.sparse.issparse(tprob):
        dense = False
        tprob = tprob.tolil()
    else:
        dense = True

    # construct the committor problem
    n = tprob.shape[0]

    if dense:
        T = np.eye(n) - tprob
    else:
        T = scipy.sparse.eye(n, n, 0, format='lil') - tprob
        T = T.tolil()

    for a in sources:
        T[a, :] = 0.0  # np.zeros(n)
        T[:, a] = 0.0
        T[a, a] = 1.0

    for b in sinks:
        T[b, :] = 0.0  # np.zeros(n)
        T[:, b] = 0.0
        T[b, b] = 1.0

    IdB = np.zeros(n)
    IdB[sinks] = 1.0

    if dense:
        RHS = np.dot(tprob, IdB)
    else:
        RHS = tprob.dot(IdB)
        # This should be the same as below
        #RHS = tprob * IdB

    RHS[sources] = 0.0
    RHS[sinks] = 1.0

    # solve for the committors
    if dense == False:
        Q = scipy.sparse.linalg.spsolve(T.tocsr(), RHS)
    else:
        Q = np.linalg.solve(T, RHS)

    epsilon = 0.001
    assert np.all(Q <= 1.0 + epsilon)
    assert np.all(Q >= 0.0 - epsilon)

    return Q

def flatten(*args):
    for x in args:
        if hasattr(x, '__iter__'):
            for y in flatten(*x):
                yield y
        else:
            yield x

def is_transition_matrix(t_matrix, epsilon=.00001):
    n = t_matrix.shape[0]
    row_sums = np.array(t_matrix.sum(1)).flatten()
    if scipy.linalg.norm(row_sums - np.ones(n)) < epsilon:
        return True
    return False

def are_all_dimensions_same(*args):
    m = len(args)
    dim_list = []
    for i in range(m):
        dims = scipy.shape(args[i])
        dim_list.append(dims)
    return len(np.unique(flatten(dim_list))) == 1

def check_dimensions(*args):
    if are_all_dimensions_same(*args) == False:
        raise RuntimeError("All dimensions are not the same")

def check_transition(t_matrix, epsilon=0.00001):

    if not DisableErrorChecking and not is_transition_matrix(t_matrix, epsilon):
        logger.critical(t_matrix)
        logger.critical("Transition matrix is not a row normalized"
                        " stocastic matrix. This is often caused by "
                        "either numerical inaccuracies or by having "
                        "states with zero counts.")

def check_for_bad_eigenvalues(eigenvalues, decimal=5, cutoff_value=0.999999):

    if abs(eigenvalues[0] - 1) > 1 - cutoff_value:
        warnings.warn(("WARNING: the largest eigenvalue is not 1, "
            "suggesting numerical error.  Try using 64 or 128 bit precision."))

        if eigenvalues[1] > cutoff_value:
            warnings.warn(("WARNING: the second largest eigenvalue (x) is close "
            " to 1, suggesting numerical error or nonergodicity.  Try using 64 "
            "or 128 bit precision.  Your data may also be disconnected, in "
            "which case you cannot simultaneously model both disconnected "
            "components.  Try collecting more data or trimming the "
            " disconnected pieces."))


def get_eigenvectors(t_matrix, n_eigs, epsilon=.001, dense_cutoff=50, right=False, tol=1E-30):

    check_transition(t_matrix, epsilon)
    check_dimensions(t_matrix)
    n = t_matrix.shape[0]
    if n_eigs > n:
        logger.warning("You cannot calculate %d Eigenvectors from a %d x %d matrix." % (n_eigs, n, n))
        n_eigs = n
        logger.warning("Instead, calculating %d Eigenvectors." % n_eigs)
    if n < dense_cutoff and scipy.sparse.issparse(t_matrix):
        t_matrix = t_matrix.toarray()
    elif n_eigs >= n - 1  and scipy.sparse.issparse(t_matrix):
        logger.warning("ARPACK cannot calculate %d Eigenvectors from a %d x %d matrix." % (n_eigs, n, n))
        n_eigs = n - 2
        logger.warning("Instead, calculating %d Eigenvectors." % n_eigs)

    # if we want the left eigenvectors, take the transpose
    if not right:
        t_matrix = t_matrix.transpose()

    if scipy.sparse.issparse(t_matrix):
        try:
            values, vectors = scipy.sparse.linalg.eigs(t_matrix.tocsr(), n_eigs, which="LR", maxiter=100000,tol=tol)
        except:
            values, vectors = scipy.sparse.linalg.eigs(t_matrix)
    else:
        values, vectors = scipy.linalg.eig(t_matrix)

    order = np.argsort(-np.real(values))
    e_lambda = values[order]
    e_vectors = vectors[:, order]

    check_for_bad_eigenvalues(e_lambda, cutoff_value=1 - epsilon)  # this is bad IMO --TJL

    # normalize the first eigenvector (populations)
    e_vectors[:, 0] /= sum(e_vectors[:, 0])

    e_lambda = np.real(e_lambda[0: n_eigs])
    e_vectors = np.real(e_vectors[:, 0: n_eigs])

    return e_lambda, e_vectors
