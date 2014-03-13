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
        alert('Your browser is not supported')
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
        alert('Please upload a file before continuing')
    } 
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
    var file = e.target.result,
        results;
    if (file && file.length) {
        results = file.split("\n");
	  try{
	  	updateGraph(JSON.parse(results))
	  } catch (err) {
	  	bootbox.alert('Aw shucks! MSMExplorer-d3 requires a JSON file as input.<br><img style="height: 150px; position: center" src="http://www.decalbin.com/catalog/images/sad_panda.png"/>');
		$('#upload').val('');
	  }
    }
}

// Setup the dnd listeners.
var dropZone = document.getElementById('sidepane-tp');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);