MSMExplorer-d3
=================

A d3.js-based webapp that allows for analysis and interactive visualizations of transition state pathways (TPTs).

![MSMExplorer](https://raw.github.com/cxhernandez/msmexplorer-d3/master/images/example.png)

Before You Begin
----------------
Before using MSMExplorer-d3.js, you will need to install MongoDb, pymongo, tornado, Heroku, and their respective requirements. MSMBuilder and NetworkX will eventually be needed to generate the graphs, but for now as long as you have a JSON formatted file with directed graph data this web application should work just fine.


Starting up the MSMExplorer-d3 on ``localhost``
----------------
Just enter the following into your terminal (while in the ``msmexplorer-d3`` trajectory):

````
$> mongod &
$> ./app.py -p 8000
````

Now you can fire up your favorite javascript-enabled browser and go to ``localhost:8000`` to see the app in action.

Use for Analysis
----------------
At the moment, the app is pretty much useless on its own (but it's pretty!). However, you can easily generate a JSON representation of your TPTs using the supplied iPython Notebook session in ``public/gen_json_graph.ipynb``.

Once you have a JSON-formatted network file, you can just drag and drop it into the webapp, and have the graph visualization dynamically update. 

Todo
---------------

In the future, I hope to provide additional functionalities:

+ Upload a metric to stratify the pathways for more meaningful analysis.
+ Upload transition matrix, sources, and sinks on the the fly and get a network,
+ Visualize whole MSM networks

Shoutouts
----------------

- [d3.js](http://d3js.org/)
- [tornado](http://www.tornadoweb.org/en/stable/)
- [mongodb](http://www.mongodb.org/)
- [jquery-file-upload](https://github.com/blueimp/jQuery-File-Upload)
- [@rmcgibbo](https://github.com/rmcgibbo)
