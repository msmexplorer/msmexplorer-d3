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