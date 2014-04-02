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

$(function () {
  // pull down the helptext for each of the options.
  $.ajax('help/help.html', {
        dataType: 'html', async: false, success: function (data) {
          $(data).hide().appendTo($('body'));
        }
  });
  
  var label = $('#drop');
  
  // move the labels innerhtml into a <a> tag inside, so that
  // users can see that there will be popover text, since its an a
  label.append('<a class="sidebar-label"> upload</a>');
  label.append('<input type="file" id="upload" onchange="handleInput()" multiple/>');
  
  var $help_el = $('#drop-help');
  if ($help_el.length > 0) {
    label.popover({content: $help_el.html(),
                   placement: 'bottom',
                   delay: { show: 300, hide: 100 },
                   trigger: 'hover'});
  }
  
  
  Backbone.Form.editors.List.Modal.ModalAdapter = Backbone.BootstrapModal;
  //Backbone.Form.helpers.keyToTitle = function (key) {return key};

  var ModelsClasses = [TP, MSM, STRUCT];
  var collection = new Collection([]);

  for (var i in ModelsClasses) {
      model = new ModelsClasses[i]();
      var form = new Backbone.Form({
          idPrefix: 'control-',
          model : model,
      }).render();

      // make the form revalidate when anything is changed
      form.on('change', function(form) {
          form.commit({validate: true});
          
      });

      //add the form to the dom, and to our collection
      $(model.el).append(form.el);
      collection.add(model);

      // trigger the change event at the very beginning, to run the
      // visibility code
      form.trigger('change', form);

      // install the popover help text
      for (var key in model.schema) {
          label = $('label[for="' + form.options.idPrefix + key + '"]');

          // move the labels innerhtml into a <a> tag inside, so that
          // users can see that there will be popover text, since its an a
          var name = label[0].innerHTML;
          $(label).html('');
          label.append('<a class="sidebar-label">' + name +'</a>');

          $help_el = $('#' + model.name + '-' + key + '-help');
          if ($help_el.length > 0) {
            label.popover({content: $help_el.html(),
                           placement: 'bottom',
                           delay: { show: 300, hide: 100 },
                           trigger: 'hover'});
          }
      }

     // remove the help-block installed by Backbone.Form, since we're
     // using the popover
     $(form.el).find('.help-block').remove();
  }

});


// activate the tab system in the sidebar
$(function () {
  $('#sidebar-tab a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });
});