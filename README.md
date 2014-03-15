MSMExplorer-d3
=================

A d3.js-based webapp powered by tornado that allows for analysis and interactive visualizations of transition state pathways (TPs).

![MSMExplorer](https://raw.github.com/cxhernandez/msmexplorer-d3/master/images/example.png)

Before You Begin
----------------
Before using MSMExplorer-d3.js, you will need to install ``mongodb``, ``pymongo``, ``tornado``, ``heroku-toolbelt``, ``msmbuilder``,``newrelic``, ``networkx``, and their respective requirements.


Starting up the MSMExplorer-d3 on ``localhost``
----------------
Just enter the following into your terminal (while in the ``msmexplorer-d3`` trajectory):

````
$> mongod &
$> python app.py
````

Now you can fire up your favorite javascript-enabled browser and go to ``localhost:5000`` to see the app in action.

Use for Analysis
----------------
Once you've built your MSM using MSMBuilder, you can just drag and drop ``tProb.mtx`` into the webapp, and start visualizing the graph immediately. You can also go to the ``Transition Paths`` tab to generate the N-most-likely paths from source states to sink states. Please note that pathway generation can take a few seconds to process.

Todo
---------------

In the future, I hope to provide additional functionalities:

+ Upload a metric to stratify the pathways for more meaningful analysis.
+ Save results to a JSON file

Shoutouts
----------------

- [d3.js](http://d3js.org/)
- [backbone.js](http://backbonejs.org/)
- [bootbox.js](http://bootboxjs.com/)
- [tornado](http://www.tornadoweb.org/en/stable/)
- [mongodb](http://www.mongodb.org/)
- [Heroku buildpack for sklearn](https://github.com/dbrgn/heroku-buildpack-python-sklearn)
- [msmbuilder](http://msmbuilder.org/)
- [@rmcgibbo](https://github.com/rmcgibbo)
- [Pande Group](http://pande.stanford.edu/)
