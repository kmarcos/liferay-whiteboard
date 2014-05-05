/**
 * Copyright (C) 2005-2014 Rivet Logic Corporation.
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; version 3 of the License.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */

YUI.add('whiteboard', function (Y, NAME) {
    
	var CONTAINER = 'container';
	var MENU = 'menu';
	var SELECTED_SHAPE = 'selectedShape';
	var CANVAS = 'canvas';
	var CLASS_SELECTED= 'selected';
	var CACHE = 'cache';
	var CLEANING = 'cleaning';
	var COUNT = 'count';
	var SELECTOR_BUTTON = '.btn';
	var SELECTOR_BUTTON_ADD = '.btn.add';
	var SELECTOR_DELETE = '.delete';
	var SELECTOR_FREE = '.free';
	var SELECTOR_CLEAN = '.clean';
	
    var EditorManager = Y.Base.create('whiteboard', Y.Base, [Y.TextEditor], {
        
        initializer: function () {
            this.bindUI();
        },
        
        bindUI: function () {
            var instance = this;
            var menu = this.get(CONTAINER).one(MENU);
            
            /* listens color pickers */
            var strokeColorPicker = new Y.ColorPicker({container: this.get(CONTAINER).one('.color-picker.stroke')});
            strokeColorPicker.on('color-picker:change', function(e) {
                EditorManager.CONSTANTS.RECTANGLE_STATE.stroke = e.color;
                EditorManager.CONSTANTS.CIRCLE_STATE.stroke = e.color;
                EditorManager.CONSTANTS.LINE_STATE.options.stroke = e.color;
                EditorManager.CONSTANTS.PATH_STATE.stroke = e.color;  
                // Text color is actually the fill. PRobably it would need a separate control.
                // We are going to use stroke control for now, because it is intuitive
                EditorManager.CONSTANTS.TEXT_STATE.fill = e.color;
                
                if (instance.get(SELECTED_SHAPE)){
                	if (instance.get(SELECTED_SHAPE).type != EditorManager.CONSTANTS.TEXT){
                		instance.get(SELECTED_SHAPE).stroke = e.color;
                	}
                	else{
                		instance.get(SELECTED_SHAPE).fill = e.color;
                	}
                    instance.get(SELECTED_SHAPE).fire('modified');
                    instance.get(CANVAS).renderAll();
                }
                if (instance.get(CANVAS).isDrawingMode){
            		instance.get(CANVAS).freeDrawingBrush.color = e.color;
            	}
            });
            
            var fillColorPicker = new Y.ColorPicker({container: this.get(CONTAINER).one('.color-picker.fill')});
            fillColorPicker.on('color-picker:change', function(e) {
                EditorManager.CONSTANTS.RECTANGLE_STATE.fill = e.color;
                EditorManager.CONSTANTS.CIRCLE_STATE.fill = e.color;                
                if (instance.get(SELECTED_SHAPE) && instance.get(SELECTED_SHAPE).type != EditorManager.CONSTANTS.PATH
                	&& instance.get(SELECTED_SHAPE).type != EditorManager.CONSTANTS.TEXT) {
                    instance.get(SELECTED_SHAPE).fill = e.color;
                    instance.get(SELECTED_SHAPE).fire('modified');
                    instance.get(CANVAS).renderAll();
                }
            });
            
            /* add shapes buttons  */
            menu.delegate('click', function (e) {
                menu.all(SELECTOR_BUTTON).removeClass(CLASS_SELECTED);
                instance.resetSelectedActions();
                instance.createShape({
                    type: e.currentTarget.getAttribute('data-shape')
                });
            }, SELECTOR_BUTTON_ADD);

            /* free draw button */
            menu.one(SELECTOR_FREE).on('click', function (e) {
                var hasClass = this.hasClass(CLASS_SELECTED);
                menu.all(SELECTOR_BUTTON).removeClass(CLASS_SELECTED);
                if (!hasClass) {
                    this.toggleClass(CLASS_SELECTED);
                }
                instance.get(CANVAS).freeDrawingBrush.color = EditorManager.CONSTANTS.PATH_STATE.stroke;
                instance.get(CANVAS).isDrawingMode = this.hasClass(CLASS_SELECTED);
            });
            
            /* delete button */
            menu.one(SELECTOR_DELETE).on('click', function (e) {
                if (instance.get(SELECTED_SHAPE)) {
                    instance.get(SELECTED_SHAPE).remove();
                }
            });
            
            /* clean button */
            menu.one(SELECTOR_CLEAN).on('click', function (e) {
                instance.deleteAllShapes();
            });
            
            /* after free draw finished on mouse up */
            this.get(CANVAS).on('path:created', function (e) {
                var options = instance.retrieveShapeState(e.path);
                delete options.path;
                instance.createShape({
                    type: EditorManager.CONSTANTS.PATH,
                    state: {
                        path: e.path.path,
                        options: options
                    }
                }, e.path);
            });
            
            this.get(CANVAS).on('selection:cleared', function(e) {
                instance.set(SELECTED_SHAPE, null);
            });
            
            this.on('text-editor:textedited', function(e) {
                instance.get(CANVAS).renderAll();
            });
        },
        
        /**
         * Resets selected actions from the canvas
         * 
         */
        resetSelectedActions: function() {
            this.get(CANVAS).isDrawingMode = false;
        },
        
        /**
         * Creates a shape based on a command
         * 
         * 
         */
        createShape: function (command, path) {
            var instance = this;
            var shape = null;
            var state = null;
            /* shape creation */
            if (command.type == EditorManager.CONSTANTS.RECTANGLE) {
                state = command.state || EditorManager.CONSTANTS.RECTANGLE_STATE;
                shape = new fabric.Rect(state);
            }
            if (command.type == EditorManager.CONSTANTS.LINE) {
                state = command.state || EditorManager.CONSTANTS.LINE_STATE;
                shape = new fabric.Line(state.points, state.options);
            }
            if (command.type == EditorManager.CONSTANTS.CIRCLE) {
                state = command.state || EditorManager.CONSTANTS.CIRCLE_STATE;
                shape = new fabric.Circle(state);
            }
            if (command.type == EditorManager.CONSTANTS.TEXT) {
                /* if text button is clicked and text component is selected, edit it !!! */
                if (instance.get(SELECTED_SHAPE) != null && instance.get(SELECTED_SHAPE).type == 'text' && !command.remotelyTriggered) {
                    this.editText(instance.get(SELECTED_SHAPE));
                    return;
                }
                state = command.state || EditorManager.CONSTANTS.TEXT_STATE;
                shape = new fabric.Text('', state);
                if (!command.remotelyTriggered) {
                    this.editText(shape);
                }
            }
            if (command.type == EditorManager.CONSTANTS.PATH) {
                state = command.state || EditorManager.CONSTANTS.PATH_STATE;
                shape = path;
                /* if path was created from other user create the path */
                if (command.remotelyTriggered) {
                    shape = new fabric.Path(command.state.path);
                    shape.set(state.options);
                    shape.setCoords();
                }
            }

            if (shape) {
                var cacheId = instance.addToCache(shape, command.cacheId || null);
                
                shape.on(CLASS_SELECTED, function () {
                    instance.set(SELECTED_SHAPE, this);
                });
                shape.on('removed', function () {
                    /* if shape still in cache */
                    if (instance.getShapeFromCache(cacheId)) {
                        instance.addToCommands(cacheId, EditorManager.CONSTANTS.DELETE, {}, {});
                        if (!instance.get(CLEANING)) {
                            instance.deleteShapeFromCache(cacheId);
                        }
                    }
                });
                shape.on('modified', function () {
                    instance.addToCommands(cacheId, EditorManager.CONSTANTS.MODIFY, command.type, instance.retrieveShapeState(this));
                });
                shape.on('moving', function () {
                    instance.addToCommands(cacheId, EditorManager.CONSTANTS.MODIFY, command.type, instance.retrieveShapeState(this));
                });
                /* trigger event when is a new shape added */
                if (typeof command.cacheId == 'undefined') {
                    instance.addToCommands(cacheId, EditorManager.CONSTANTS.CREATE, command.type, state);
                }
                
                /* add shape if creation is executed externally or different than path shape type,
                 * also validation added to avoid path added twice to canvas
                 */
                if (command.remotelyTriggered || (command.type != EditorManager.CONSTANTS.PATH)) {
                    this.get(CANVAS).add(shape);
                }
                
            }

        },
        
        /**
         * Modify existent shape stored in cache
         * 
         */
        modifyShape: function (command) {
            var instance = this;
            this.getItemFromCache(command.cacheId, function(cachedItem, index) {
                /* set shape object with new state properties */
                cachedItem.object.set(command.state);
                cachedItem.object.setCoords();
                instance.get(CANVAS).renderAll();
            });      
        },
        
        /**
         * Deletes all the shapes from cache
         * 
         */
        deleteAllShapes: function() {
            var cache = this.get(CACHE);
            this.set(CLEANING, true);
            Y.Array.each(cache, function(item) {
                item.object.remove();
            });
            this.set(CLEANING, false);
            cache = [];
        },
        
        /**
         * Deletes shape from cache
         * 
         */
        deleteShapeFromCache: function(cacheId) {
            var cache = this.get(CACHE);
            this.getItemFromCache(cacheId, Y.bind(function(cachedItem, index) {
                cache.splice(index, 1);
                this.set(CACHE, cache);
                return;
            }, this));
        },
        
        getShapeFromCache: function(cacheId) {
            var shape = null;
            this.getItemFromCache(cacheId, function(cachedItem, index) {
                shape = cachedItem.object;
            })
            return shape;
        },

        getItemFromCache: function(cacheId, callback) {
            var cache = this.get(CACHE);
            for ( var i = 0; i < cache.length; i++) {
                if (cache[i].id == cacheId) {
                    callback(cache[i], i);
                    return;
                }
            }
        },
        
        /**
         * Adds shape to cache
         * 
         */
        addToCache: function (object, cacheId) {
            var cacheId = cacheId ? cacheId : (this.get('editorId') + this.get(COUNT));
            this.set(COUNT, this.get(COUNT) + 1);
            this.get(CACHE).push({
                id: cacheId,
                object: object
            });
            return cacheId;
        },
        
        /**
         * Retrieves the shape state
         * 
         */
        retrieveShapeState: function (shape) {
            var state = {};
            for (var property in shape.stateProperties) {
                var propertyName = shape.stateProperties[property];
                if (shape.hasOwnProperty(propertyName)) {
                    state[propertyName] = shape[propertyName];
                }
            }
            return state;
        },
        
        /**
         * Adds command to post queue list
         * 
         */
        addToCommands: function (cacheId, action, type, state) {
            this.get('commands').push({
                cacheId: cacheId,
                action: action,
                type: type,
                state: state
            })
        }

    }, {
        ATTRS: {
            
            /**
             * Editor container Y.Node
             */
            container: {
                value: null
            },
            
            /**
             * fabric.Canvas instance
             * 
             */
            canvas: {
                value: null
            },
            
            /**
             * Array to store all the shapes instances currently rendered in the editor
             * 
             */
            cache: {
                value: []
            },
            
            /**
             * Queue of commands executed in the editor, commands are shapes creation, modification, deletion, etc...
             * Each command sample looks like:
             * {
             *    cacheId: '{editorId}{count}',
             *    action: 'create|modify|delete',
             *    type: 'line|rectangle|circle|path',
             *    state: {}
             * } 
             * 
             */
            commands: {
                value: []
            },
            
            /**
             * Identifies the current editor
             * 
             */
            editorId: {
                value: '0001'
            },
            
            /**
             * Incremental var used to create the cache id for commands
             * 
             */
            count: {
                value: 0
            },
            
            /**
             * Last selected shape
             * 
             */
            selectedShape: {
                value: null
            },
            
            cleaning: {
                value: false
            }
            
        }
    });
    

    EditorManager.CONSTANTS = {
        /* actions */
        CREATE: 'create',
        MODIFY: 'modify',
        DELETE: 'delete',
        
        /* shapes */
        RECTANGLE: 'rectangle',
        LINE: 'line',
        CIRCLE: 'circle',
        PATH: 'path',
        TEXT: 'text',
        
        /* Initial shapes states */
        RECTANGLE_STATE: {
            left: 100,
            top: 100,
            fill: 'rgba(255, 255, 255, 0.0)',
            stroke: '#000000',
            width: 40,
            height: 40,
            angle: 0
        },
        LINE_STATE: {
            points: [50, 100, 200, 200],
            options: {
                left: 170,
                top: 150,
                stroke: '#000000'
            }
        },
        CIRCLE_STATE: {
            radius: 20,
            left: 100,
            top: 100,
            fill: 'rgba(255, 255, 255, 0.0)',
            stroke: '#000000',
        },
        TEXT_STATE: {
            left: 100,
            top: 100,
            fontSize: 16,
            fill: '#000000',
        },
        PATH_STATE: {
        	stroke: '#000000',
        }
    };

    Y.EditorManager = EditorManager;

}, '@VERSION@', {
    "requires": ["yui-base", "base-build", "text-editor", "color-picker"]
});