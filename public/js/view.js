var circle, path, text, myjson;

var	width = 900,
    height = 550;

var force = d3.layout.force()
	    .charge(-1500)
	    .gravity(0.05)
	    .linkDistance(20)
	    .size([width, height]);
		
var svg = d3.select("#tpt").append("svg")
      .attr("width", width)
      .attr("height", height)
	  .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "XminYmin meet");		

// Per-type markers, as they don't inherit styles.
svg.append("defs").selectAll("marker")
    .data(["suit"])
  .enter().append("marker")
    .attr("id", function(d) { return d; })
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
  .append("path")
    .attr("d", "M0,-5L10,0L0,5");

// Use elliptical arc path segments to doubly-encode directionality.
force.on('tick', function() {

  path.attr("d", linkArc);
  circle.attr("transform", transform);
  text.attr("transform", transform);
});

function linkArc(d) {
  var x = d.target.x-4,
      y = d.target.y-4,
      dx = x - d.source.x,
      dy = y - d.source.y,
      dr = Math.sqrt(dx * dx + dy * dy);
  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + x + "," + y;
}

function transform(d) {
  return "translate(" + d.x + "," + d.y + ")";
}


function createGraph(data){
	
	var fluxnorm = 0;

		data.links.forEach(function(l) {
		  l.source = data.nodes[l.source] || (data.nodes[l.source] = {name: l.source});
		  l.target = data.nodes[l.target] || (data.nodes[l.target] = {name: l.target});
		  fluxnorm+=Math.pow(l.weight,2)
		});

		path = svg.append("g").selectAll("path")
		    .data(data.links)
		  .enter().append("path")
		    .attr("class", function(d) { return "link " + "suit"; })
			.attr("marker-end", function(d) { return "url(#" + "suit" + ")"; })
			.attr("stroke-width", function(d) { return 3*Math.exp((d.weight/Math.sqrt(fluxnorm)-1)) + "px"; });

		circle = svg.append("g").selectAll("circle")
		    .data(data.nodes)
		  .enter().append("circle")
		    .attr("r", 12)
			.attr("class", function(d) { return "circle " + d.type; })
		    .call(force.drag);

		text = svg.append("g").selectAll("text")
		    .data(data.nodes)
		  .enter().append("text")
		    .attr("x", 0)
		    .attr("y", 4)
			.attr("class","id")
		    .text(function(d) { return d.id; });

	    force
	        .nodes( data.nodes )
	        .links( data.links )
	        .start();
	
}

function updateGraph(data){
	
	$("g").remove();
	createGraph(data);
	
}