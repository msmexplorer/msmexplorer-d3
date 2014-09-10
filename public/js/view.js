// Author: Carlos Xavier Hernández <cxh@stanford.edu>
// Contributors: 
// Copyright (c) 2014, Stanford University
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
// 
//   Redistributions of source code must retain the above copyright notice,
//   this list of conditions and the following disclaimer.
// 
//   Redistributions in binary form must reproduce the above copyright
//   notice, this list of conditions and the following disclaimer in the
//   documentation and/or other materials provided with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
// IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
// PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
// TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
// LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Declare global d3.js variables
var circle, path, text;

var width = 900, // Default viewer width
    height = 550, // Default viewer height
    r = 12; // Default node size
	
// Linear scaling of x-axis while zooming
var x = d3.scale.linear()
    		.domain([0, width])
    		.range([0, width]);

// Linear scaling of x-axis while zooming
var y = d3.scale.linear()
    		.domain([0, height])
    		.range([height, 0]);

// Declare Force-Directed Graph Properties
var force = d3.layout.force()
	    		.charge(-800) // Repulsion
				.gravity(0.1) // Attraction to center
	    		.linkDistance(50) // Edge length
	    		.size([width,height]);

// Add Zoom behavior
var zoom = d3.behavior.zoom().x(x).y(y).scaleExtent([.5, 5]).on("zoom", redraw);
		
// Create SVG
var svg = d3.select("#viewer").append("svg:svg")
	  	.attr("viewBox", "0 0 " + width + " " + height)
      	.attr("preserveAspectRatio", "xminYmin meet")
		.attr("pointer-events", "all")
		.call(zoom);

// 	Create Graphical Content
var vis = svg.append("g");

// Initialize Graphical Definitions
var defs = vis.append("g:defs");
		  	
// Declare Tranformation Rules
force.on('tick', function() {
  path.attr("d", linkArc);
  circle.attr("transform", transform);
  text.attr("transform", transform);
});

// Define Arcs and Arrowheads
function linkArc(d) {
  	  x = (d.target.x);
      y = (d.target.y);
      dx = x - d.source.x;
      dy = y - d.source.y;
      dr = Math.sqrt(dx * dx + dy * dy);
	  offsetx=(dx * d.target.radius) / dr;
	  if (isNaN(offsetx)) {offsetx=0;}
	  offsety=(dy * d.target.radius) / dr;
	  if (isNaN(offsety)) {offsety=0;}
	  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr+ " 0 0,1 " + (x - offsetx) + "," + (y - offsety);
}

// Definite Object Translation
function transform(d) {
  return "translate(" + d.x + "," + d.y + ")";
}

// Define redrawing of graph after Zoom or Pan
function redraw() {
   var tx = d3.event.translate[0];
   var ty = d3.event.translate[1];
   tx = Math.min(tx, 1.1*d3.event.scale*width);
   tx = Math.max(tx, -1.1*d3.event.scale*width);
   ty = Math.min(ty, 1.1*d3.event.scale*width);
   ty = Math.max(ty, -1.1*d3.event.scale*width);
	vis.attr("transform", "translate(" + [tx, ty] + ")" + " scale(" + d3.event.scale + ")");
}

// Define how to create Network
function createGraph(data){
		// Initialize max network properties
		var maxflux = 0,
			maxrank = 0;
		
	    // Check if network is directed
		if (data.directed) {
			defs.selectAll("marker")
			    .data(["trans"])
			  .enter().append("marker")
			    .attr("id", function(d) { return d; })
			    .attr("viewBox", "0 -5 10 10")
			    .attr("refX", 9)
			    .attr("refY", 0)
			    .attr("markerWidth", 6)
			    .attr("markerHeight", 6)
			    .attr("orient", "auto")
			  .append("path")
			    .attr("d", "M0,-5L10,0L0,5");
		}
		
		// Define Sources and Targets
		data.links.forEach(function(l) {
		  l.source = data.nodes[l.source] || (data.nodes[l.source] = {name: l.source});
		  l.target = data.nodes[l.target] || (data.nodes[l.target] = {name: l.target});
		  //Search for max edge weight
		  if (l.weight > maxflux) {maxflux = l.weight;}
		});
		
		// Search for the largest metric value
		data.nodes.forEach(function(n) {
			if (n.size != null) {
				if (n.size > maxrank) {maxrank = n.size;}
			}
		});
		
		// Create Arcs
		path = vis.append("g:g").selectAll("path")
		    .data(data.links)
		  .enter().append("path")
		    .attr("class", "link")
			.attr("marker-end", function(d) { return "url(#" + "trans" + ")"; })
			.attr("stroke-width", function(d) { return 3*Math.exp(d.weight/maxflux - 1) + "px"; });
		
		// Create Nodes
		circle = vis.append("g:g").selectAll("circle")
		    .data(data.nodes)
		  .enter().append("circle")
		    .attr("r", function(d) {if (d.size != null) { d.radius = Math.max(1.7*r*d.size/maxrank,4.5);} else { d.radius = r; } return d.radius;})
			.attr("class", function(d) { if (d.type != null) {return "circle " + d.type;} return "circle none";})
			.attr("id",function(d) {$('#control-state_id').append('<option>'+d.id+'</option>');return "state-" + d.id;})
		    .call(force.drag);

		// Create Node Labels
		text = vis.append("g:g").selectAll("text")
		    .data(data.nodes)
		  .enter().append("text")
		    .attr("x", 0)
		    .attr("y", 4)
			.attr("class","id")
		    .text(function(d) { return d.id; });

	    // Add Forces
	    force
	        .nodes( data.nodes )
	        .links( data.links )
	        .start();
		
		// Add Fade-In Intro
		vis.style("opacity", 1e-6)
		   .transition()
		   .duration(1000)
		   .style("opacity", 1);
}

// Update view with new data
function updateGraph(data){
	clearGraph();
	createGraph(data);
}

// Destroy view
function clearGraph() {
	$('#control-state_id').children('option').remove();
	$("circle").parent().remove();
	$("path").parent().remove();
	$("text").parent().remove();
}
