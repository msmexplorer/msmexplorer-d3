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

var upload_results;

// Handle file upload from file selector
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.

  // files is a FileList of File objects. List some properties.
  for (var i = 0, f; f = files[i]; i++) {
	var reader = new FileReader();
    reader.readAsText(f);
	$(reader).on('load', processFile);
	pushToHTML(f);
}
}

// Handle file upload from drag+drop
function handleInput() {
	var fileInput = $('#upload');
    if (!window.FileReader) {
        alert('Your browser is not supported');
    }
    var input = fileInput.get(0);

    // Create a reader object
    var reader = new FileReader();
    if (input.files.length) {
        var f = input.files[0];
        reader.readAsText(f);
        $(reader).on('load', processFile);
		pushToHTML(f);
    } else {
        alert('Please upload a file before continuing');
    } 
	$('#upload').val('');
}

// List the file name and type
function pushToHTML(f) {
	var output = [];
    output.push('<label><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ')',
                '</label>');
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

// Handle file dragging
function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Sends MSM file to Tornado Server to make network
function processFile(e) {
    var file = e.target.result;
    if (file && file.length) {
        upload_results = file.split("\n");
		post2tornado(0); // 0 means MSM
    }
}

// Asks Tornado server to generate TP
function generatePaths() {
	if (upload_results != null) {
		post2tornado(1); // 1 means TP
	} else {
    bootbox.alert('Aw shucks! You need to upload a Matrix Market before you can do this.<br><br><img style="height: 150px; position: center" src="./images/sad-panda.jpg"/>');
	}
}

// Creates POST to Tornado Server
function post2tornado(mode) {
	
	//Define Error Handling
	var wrong_type_msg = 'Aw shucks! MSMExplorer-d3 requires a Matrix Market file as input.<br><br><img style="height: 150px; position: center" src="./images/sad-panda.jpg"/>',
		we_did_bad ='Aw shucks! MSMExplorer-d3 did something wrong. We apologize.<br><br><img style="height: 150px; position: center" src="./images/sad-panda.jpg"/>',
		response,
		request;
		
	// Try REQUEST
	try{
		if (mode) {
      	  	request =  {mode: mode,matrix: upload_results.join("\n"),sources: $("#control-sources").val(),sinks: $("#control-sinks").val(),num_paths:$("#control-n_paths").val()}; // TP REQUEST
		} else {

			request = {mode: mode,matrix: upload_results.join("\n"),cutoff: $("#control-cutoff").val(),resize: $("#control-resize").val()}; // MSM REQUEST

		}
		load_screen_on()
		
		// Retrieve RESPONSE
		response = $.ajax({
			type: "POST",
			url: "/process",
			async: true,
			data: request,
			success: function (data) {load_screen_off();updateGraph(JSON.parse(data));},
			error: function () {$('.spinner').remove();bootbox.alert(wrong_type_msg);},
		});
		
  } catch (err) {
	  $('.spinner').remove();
      bootbox.alert(we_did_bad);
	  $('#upload').val('');
	}
}

// Prepares load screen
function load_screen_on() {
	clearGraph();
	$('#viewer').prepend('<div class="spinner"><div class="cube1"></div><div class="cube2"></div></div>')
}

// Destroys load screen
function load_screen_off() {
	$('.spinner').remove()
}

// Add drag+drop listeners
var dropZone = document.getElementById('dropzone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
