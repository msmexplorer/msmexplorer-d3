var upload_results;

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

function pushToHTML(f) {
	var output = [];
    output.push('<label><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ')',
                '</label>');
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function processFile(e) {
    var file = e.target.result;
    if (file && file.length) {
        upload_results = file.split("\n");
		post2tornado(0);
    }
}

function generatePaths() {
	if (upload_results != null) {
		post2tornado(1);
	} else {
    bootbox.alert('Aw shucks! You need to upload a Matrix Market before you can do this.<br><img style="height: 150px; position: center" src="http://www.decalbin.com/catalog/images/sad_panda.png"/>');
	}
}

function post2tornado(mode) {
	var wrong_type_msg = 'Aw shucks! MSMExplorer-d3 requires a Matrix Market file as input.<br><img style="height: 150px; position: center" src="http://www.decalbin.com/catalog/images/sad_panda.png"/>',
		we_did_bad ='Aw shucks! MSMExplorer-d3 did something wrong. We apologize.<br><img style="height: 150px; position: center" src="http://www.decalbin.com/catalog/images/sad_panda.png"/>',
		response,
		request;
	try{
		if (mode) {
      	  	request =  {mode: mode,matrix: upload_results.join("\n"),sources: $("#control-sources").val(),sinks: $("#control-sinks").val(),num_paths:$("#control-n_paths").val()};
		} else {

			request = {mode: mode,matrix: upload_results.join("\n"),cutoff: $("#control-cutoff").val(),resize: $("#control-resize").val()};

		}
		load_screen_on()
		response = $.ajax({
			type: "POST",
			url: "/process",
			async: true,
			data: request,
			success: function (data) {load_screen_off();updateGraph(JSON.parse(data));},
			error: function () {bootbox.alert(wrong_type_msg);},
		});
  } catch (err) {
      bootbox.alert(we_did_bad);
		$('#upload').val('');
	}
}

function load_screen_on() {
	clearGraph();
	$('#viewer').prepend('<div class="spinner"><div class="cube1"></div><div class="cube2"></div></div>')
}

function load_screen_off() {
	$('.spinner').remove()
}

// Setup the dnd listeners.
var dropZone = document.getElementById('dropzone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);