var circle, path, text;

var	width = 900,
    height = 550,
	r = 12;

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([height, 0]);

var force = d3.layout.force()
	    .charge(-400)
		.gravity(0.1)
	    .linkDistance(40)
	    .size([width,height]);
		
var zoom = d3.behavior.zoom().x(x).y(y).scaleExtent([0.5, 5]).on("zoom", redraw);
		
var svg = d3.select("#viewer").append("svg:svg")
	  	.attr("viewBox", "0 0 " + width + " " + height)
      	.attr("preserveAspectRatio", "XminYmin meet")
		.attr("pointer-events", "all")
		.call(zoom);
		
var vis = svg.append("g");
var defs = vis.append("g:defs");
		  	
// Use elliptical arc path segments to doubly-encode directionality.
force.on('tick', function() {
  path.attr("d", linkArc);
  circle.attr("transform", transform);
  text.attr("transform", transform);
});

function linkArc(d) {
  	  x = (d.target.x);
      y = (d.target.y);
      dx = x - d.source.x;
      dy = y - d.source.y;
      dr = Math.sqrt(dx * dx + dy * dy);
  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + x + "," + y;
}

function transform(d) {
  return "translate(" + d.x + "," + d.y + ")";
}

function redraw() {
   var tx = d3.event.translate[0];
   var ty = d3.event.translate[1];
   tx = Math.min(tx, 1.1*d3.event.scale*width);
   tx = Math.max(tx, -1.1*d3.event.scale*width);
   ty = Math.min(ty, 1.1*d3.event.scale*width);
   ty = Math.max(ty, -1.1*d3.event.scale*width);
	vis.attr("transform", "translate(" + [tx, ty] + ")" + " scale(" + d3.event.scale + ")");
}

function createGraph(data){
	
		var maxflux = 0,
			maxrank = 0;
		if (data.directed) {
			defs.selectAll("marker")
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
		}

		data.links.forEach(function(l) {
		  l.source = data.nodes[l.source] || (data.nodes[l.source] = {name: l.source});
		  l.target = data.nodes[l.target] || (data.nodes[l.target] = {name: l.target});
		  if (l.weight > maxflux) {maxflux = l.weight;}
		});
		
		data.nodes.forEach(function(n) {
			if (n.size != null) {
				if (n.size > maxrank) {maxrank = n.size;}
			}
		});
		
		path = vis.append("g:g").selectAll("path")
		    .data(data.links)
		  .enter().append("path")
		    .attr("class", "link")
			.attr("marker-end", function(d) { return "url(#" + "suit" + ")"; })
			.attr("stroke-width", function(d) { return 3*Math.exp(d.weight/maxflux - 1) + "px"; });

		circle = vis.append("g:g").selectAll("circle")
		    .data(data.nodes)
		  .enter().append("circle")
		    .attr("r", function(d) {if (d.size != null) { return Math.max(1.7*r*d.size/maxrank,4.5);} return r;})
			.attr("class", function(d) { if (d.type != null) {return "circle " + d.type;} return "circle none";})
			.attr("id",function(d) {$('#control-state_id').append('<option>'+d.id+'</option>');return "state-" + d.id;})
		    .call(force.drag);

		text = vis.append("g:g").selectAll("text")
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
			
		vis.style("opacity", 1e-6)
		   .transition()
		   .duration(1000)
		   .style("opacity", 1);
}

function updateGraph(data){
	clearGraph();
	createGraph(data);
}

function clearGraph() {
	$('#control-state_id').children('option').remove();
	$("circle").parent().remove();
	$("path").parent().remove();
	$("text").parent().remove();
}