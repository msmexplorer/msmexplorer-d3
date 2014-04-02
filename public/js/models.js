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

$(function() {
/*
    * Expected behavior of the Backone.Model subclasses
    * -------------------------------------------------
    *
    * javascript doesn't support the kind of class-based OO that I'm familiar
    * with, so we can't just extend Backbone.Model to make a base class, and
    * then extend that further.
    *
    * So I'll just write the API for our models here, as a comment:
    *
    * el : string
    *     a jquery selector for the DOM element where this model should be
    *     rendered, as a form.
    * name : string
    *     a string giving the name of the class. this is used by the "view" to
    *     create the script, in views.js
    * schema : dict
    *     schema for the model, i.e. what fields it has, what type they, are, etc
    *     this information is directly interpreted by Backbone.Forms, and its
    *     format is described here: https://github.com/powmedia/backbone-forms.
    *     the keys in this schema should be called the model's "attributes".
    *     They're not the only methods defined on the model class, but they _ARE_
    *     the things that get directly displayed to the user in the forms.
    * visibility : dict
    *     a dict of functions -- the keys in this dict should be the model's
    *     attributes. the functions take a single argument, which is a dict of
    *     the model's current attributes (mapping to their current values)
    *     and returns a bool, specifying whether this attribute should be
    *     shown or hidden to the user inside of the form.
    * defaults : dict
    *     a dict giving the default value for each of the attributes in the schema
    */

Collection = Backbone.Collection.extend({
  model: Backbone.Model
});

// https://github.com/powmedia/backbone-forms
TP = Backbone.Model.extend({
  el: '#sidepane-tp',
  name: 'tp',
  schema: {
	 sources:   {type: 'Text', title: 'Input source states:',
	             	validators: ['required', /[0-9]+(,[0-9]+)*$/]},
	 sinks: {type: 'Text', title: 'Input sink states:',
					validators: ['required', /[0-9]+(,[0-9]+)*$/]},
	 n_paths: {type: 'Select', title: 'Number of top paths:', options: [1,2,3,4,5,6,7,8,9,10]
 					},
  },
  

  defaults: {
     sources: '',
     sinks: '',
	 n_paths: 5,
  },
});

MSM = Backbone.Model.extend({
  el: '#sidepane-msm',
  name: 'msm',
  schema: {
 	 cutoff:   {type: 'Text', title: 'Probability cutoff:',
 	             	validators: ['required', /^0.([0-9]+)*$/]},
	 resize: 		{type: 'Select', title: 'Resize nodes by:', options: ['pagerank','closeness centrality','1st eigenvector','2nd eigenvector']
 					}, 
  },

  defaults: {
	  cutoff: '0.0',
	  resize: 'first eigenvector'
  },
});
STRUCT = Backbone.Model.extend({
  el: '#sidepane-struct',
  name: 'struct',
  schema: {
	  state_id: {type: 'Select', title: 'State:', options: []
  		}
  },

  defaults: {
  },
});
});