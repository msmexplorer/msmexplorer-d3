MSMExplorer-d3
=================

A d3.js-based webapp powered by tornado that creates beautiful interactive visualizations of MSM data.

![MSMExplorer](https://raw.github.com/cxhernandez/msmexplorer-d3/master/images/example.png)

Before You Begin
----------------
Before running MSMExplorer-d3 locally for development, you should install ``numpy``,``scipy``,``mongodb``, ``pymongo``, ``tornado``, ``heroku-toolbelt``,``newrelic``, ``networkx``, and their respective requirements.

If you simply want to use the webapp for visualization purposes, [here](http://msmexplorer-d3.herokuapp.com) is the latest version of MSMExplorer-d3 running on Heroku.


Starting up MSMExplorer-d3 on ``localhost``
----------------
Just enter the following into your terminal (while in the ``msmexplorer-d3`` trajectory):

````
$> mongod &
$> python app.py
````

Now you can fire up your favorite javascript-enabled browser and go to ``localhost:5000`` to see the app in action.

Use for Analysis
----------------
Once you've built your MSM, you can just drag and drop a Matrix Market file (``mtx``) into the webapp, and start visualizing the graph immediately. You can choose different network metrics with which to resize nodes, zoom, and pan over the graph. You can also go to the ``Transition Paths`` tab to generate the N most-likely paths from source states to sink states. You can also upload and visualize PDB files, save a molecule logo to represent a node on the graph, and finally save the graph as an SVG.

Todo
---------------

In the future, I hope to provide additional functionalities:

+ Upload a metric to stratify the pathways for more meaningful analysis.
+ Save results to a JSON file.

Shoutouts
----------------

- [d3.js](http://d3js.org/)
- [backbone.js](http://backbonejs.org/)
- [bootbox.js](http://bootboxjs.com/)
- [crowbar.js](https://github.com/NYTimes/svg-crowbar)
- [tornado](http://www.tornadoweb.org/en/stable/)
- [mongodb](http://www.mongodb.org/)
- [Heroku buildpack for sklearn](https://github.com/dbrgn/heroku-buildpack-python-sklearn)
- [msmbuilder](http://msmbuilder.org/)
- [GLmol](https://github.com/biochem-fan/GLmol)
- [@rmcgibbo](https://github.com/rmcgibbo)
- [Pande Group](http://pande.stanford.edu/)
