var glmol01 = new GLmol('glmol01', true);
//var query = window.location.search.substring(1);
//if (query == '') 
//download('pdb:2POR');
//else download(query);

function getStyleRuleValue(style, selector, sheet) {
    var sheets = typeof sheet !== 'undefined' ? [sheet] : document.styleSheets;
    for (var i = 0, l = sheets.length; i < l; i++) {
        var sheet = sheets[i];
        if( !sheet.cssRules ) { continue; }
        for (var j = 0, k = sheet.cssRules.length; j < k; j++) {
            var rule = sheet.cssRules[j];
            if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) {
                return rule.style[style];
            }
        }
    }
    return null;
}


function loadFile() {
   var file = $('#glmol01_file').get(0);
   $('#control-state_id').change(function() {loadFile()});
   if (file) file = file.files;
   if (!file || !window.FileReader || !file[0]) {
      bootbox.alert('Aw shucks! No file was selected or your browser does not support this feature.<br><img style="height: 150px; position: center" src="http://www.decalbin.com/catalog/images/sad_panda.png"/>');
      return;
   }
   $('#loading').show();
   var reader = new FileReader();
   reader.onload = function() {
      glmol01.loadMoleculeStr(false,reader.result);
      $('#loading').hide();
   };
   reader.readAsText(file[0]);
}

function saveImage() {
  glmol01.show();
  var imageURI = glmol01.renderer.domElement.toDataURL("image/png");
   //window.open(imageURI);
  var i = $('#control-state_id').val();
  var r = $('#state-' + i).attr("r");
  $('pattern.item'+i).remove();
  defs.append('svg:pattern')
  	  .attr('class','item'+i)
      .attr('id', 'image-' + i)
      .attr('width', '1')
      .attr('height', '1')
      .append('svg:image')
      .attr('xlink:href', imageURI)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 2*r)
      .attr('height', 2*r);
   
   $('#state-'+i).css('fill','url(#image-' + i + ')');
   $('text.id').filter(function(index) { return $(this).text() === i; }).remove();
}

$('#glmol01_reload').click(function(ev) {
   glmol01.defineRepresentation = defineRepFromController;
   glmol01.rebuildScene();
   glmol01.show();
});

function defineRepFromController() {
   var idHeader = "#" + this.id + '_';

var time = new Date();
   var all = this.getAllAtoms();
   if ($(idHeader + 'biomt').attr('checked') && this.protein.biomtChains != "") all = this.getChain(all, this.protein.biomtChains);
   var allHet = this.getHetatms(all);
   var hetatm = this.removeSolvents(allHet);

console.log("selection " + (+new Date() - time)); time = new Date();

    this.colorByAtom(all, 0x4682b4);  
   // var colorMode = $(idHeader + 'color').val();
   // if (colorMode == 'ss') {
   //    this.colorByStructure(all, 0xcc00cc, 0x00cccc);
   // } else if (colorMode == 'chain') {
   //    this.colorByChain(all);
   // } else if (colorMode == 'chainbow') {
   //    this.colorChainbow(all);
   // } else if (colorMode == 'b') {
   //    this.colorByBFactor(all);
   // } else if (colorMode == 'polarity') {
   //    this.colorByPolarity(all, 0xcc0000, 0xcccccc);
   // }
   var 	color,
   		i = $('#control-state_id').val(),
   	  	node_class = $('#state-'+i).attr('class');
   if (node_class != undefined){
   		color = getStyleRuleValue('fill', '.'+ node_class.replace(' ','.'));
	}
   console.log(color);
   if (color == undefined) {
	   this.colorByUserColors(all, ["0x9932CC","0x4682b4"]);
   } else {
	   console.log(color);
   	   this.colorByUserColors(all, ["0x9932CC","0x" + color.replace('#','')]);
	   //this.colorByStructure(all, 0xff0000 , 0xff0000 );
   }
   
console.log("color " + (+new Date() - time)); time = new Date();

   var asu = new THREE.Object3D();
   // var mainchainMode = $(idHeader + 'mainchain').val();
   // var doNotSmoothen = ($(idHeader + 'doNotSmoothen').attr('checked') == 'checked');
   // if ($(idHeader + 'showMainchain').attr('checked')) {
   //    if (mainchainMode == 'ribbon') {
   //       this.drawCartoon(asu, all, doNotSmoothen);
   //       this.drawCartoonNucleicAcid(asu, all);
   //    } else if (mainchainMode == 'thickRibbon') {
   //       this.drawCartoon(asu, all, doNotSmoothen, this.thickness);
   //       this.drawCartoonNucleicAcid(asu, all, null, this.thickness);
   //    } else if (mainchainMode == 'strand') {
   //       this.drawStrand(asu, all, null, null, null, null, null, doNotSmoothen);
   //       this.drawStrandNucleicAcid(asu, all);
   //    } else if (mainchainMode == 'chain') {
   //       this.drawMainchainCurve(asu, all, this.curveWidth, 'CA', 1);
   //       this.drawMainchainCurve(asu, all, this.curveWidth, 'O3\'', 1);
   //    } else if (mainchainMode == 'cylinderHelix') {
   //       this.drawHelixAsCylinder(asu, all, 1.6);
   //       this.drawCartoonNucleicAcid(asu, all);
   //    } else if (mainchainMode == 'tube') {
   //       this.drawMainchainTube(asu, all, 'CA');
   //       this.drawMainchainTube(asu, all, 'O3\''); // FIXME: 5' end problem!
   //    } else if (mainchainMode == 'bonds') {
   //       this.drawBondsAsLine(asu, all, this.lineWidth);
   //    }
   // }
   this.drawCartoon(asu, all, false, this.thickness);
   this.drawCartoonNucleicAcid(asu, all,null, this.thickness);

   //if ($(idHeader + 'line').attr('checked')) {
    //  this.drawBondsAsLine(this.modelGroup, this.getSidechains(all), this.lineWidth);
   //}
console.log("mainchain " + (+new Date() - time)); time = new Date();


   var target = this.modelGroup;



   this.drawBondsAsStick(target, hetatm, this.cylinderRadius / 2.0, this.cylinderRadius, true, false, 0.3);
console.log("hetatms " + (+new Date() - time)); time = new Date();

   this.camera = this.perspectiveCamera;
  
   this.setBackground(parseInt("0xf5f5f5"));

   this.modelGroup.add(asu);
};

glmol01.defineRepresentation = defineRepFromController;