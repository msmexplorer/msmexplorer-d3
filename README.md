MSMExplorer-d3.js
=================

A d3-based webapp that allows for analysis and interactive visualizations of transition state pathways (TPTs).

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

In the future, the thought is that you will be able to just drag and drop files (JSON,csv,mtx,etc) into the webapp, and have the graph visualization dynamically update. You will also be able to add a metric to stratify the pathways for more meaningful analysis.

Thanks
----------------

- [d3.js](http://d3js.org/)
- [tornado](http://www.tornadoweb.org/en/stable/)
- [mongodb](http://www.mongodb.org/)
- [@rmcgibbo](https://github.com/rmcgibbo)
