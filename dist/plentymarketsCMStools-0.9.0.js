/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module PlentyFramework
 */
(function($) {

    /**
     * Framework providing client functions for plentymarkets Webshops.
     * @class PlentyFramework
     * @constructor
     */
    PlentyFramework = function() {};

    var instance = null;
    PlentyFramework.getInstance = function() {
        instance = instance || new PlentyFramework();
        return instance;
    };

    /**
     * Collection of registered global variables
     * @attribute
     * @static
     * @type {object}
     */
    PlentyFramework.globals = {};

    /**
     * Set a global variable.
     * @function setGlobal
     * @static
     * @param {string}  identifier  A unique identifier to reference this variable
     * @param {*}       value       The value to set
     * @return {*}                  The value
     */
    PlentyFramework.setGlobal = function( identifier, value ) {
        if( PlentyFramework.globals.hasOwnProperty( identifier ) ) {
            console.error('Global variable "' + identifier + '" already exists and cannot be overridden.');
            return null;
        }

        PlentyFramework.globals[identifier] = value;

        return PlentyFramework.globals[identifier];
    };

    /**
     * Get the value of a global variable or undefined if not exists
     * @function getGlobal
     * @static
     * @param  identifier  The identifier of the requested variable
     * @return {*}         The value of the variable
     */
    PlentyFramework.getGlobal = function( identifier ) {
        return PlentyFramework.globals[identifier];
    };

    /**
     * Collection of registered directives
     * @type {Array}
     * @static
     */
    PlentyFramework.directives = [];

    /**
     * Register directive. Directives can be bound to dynamically added nodes by calling pm.bindPlentyFunctions();
     * @function directive
     * @static
     * @param   {string}    selector        jQuery selector of the DOM-elements to bind the directive to
     * @param   {function}  callback        Function to add directives behaviour
     * @param   {Array}     dependencies    List of required services. Services will be passed to callback function
     * @param   {boolean}   allowDuplicates Defines if a directive can be bound to the same element multiple times
     * @return  {object}                    The created directive
     */
    PlentyFramework.directive = function(selector, callback, dependencies, allowDuplicates) {
        var directive = {
            id:			PlentyFramework.directives.length,
            selector:	selector,
            callback:	callback,
            dependencies: dependencies,
            allowDuplicates: !!allowDuplicates,
            elements:	[]
        };
        PlentyFramework.directives.push(directive);

        return directive;
    };

    /**
     * Bind registered directives.
     * @function bindDirectives
     * @param {string} [directiveSelector] restrict binding to elements matching this selector
     */
    PlentyFramework.prototype.bindDirectives = function( directiveSelector ) {

        $.each( PlentyFramework.directives, function(i, directive)  {
            if( !directiveSelector || directiveSelector === directive.selector ) {
                var elements = [];
                // filter elements already bound
                $(directive.selector).each(function (j, obj) {
                    if ($.inArray(obj, directive.elements) < 0) {
                        elements.push(obj);
                    }
                });

                $.each(elements, function (i, elem) {
                    var params = [i, elem];

                    // append dependencies if exists
                    if (!!directive.dependencies && directive.dependencies.length > 0) {
                        params = params.concat(PlentyFramework.resolveServices(directive.dependencies));
                    }

                    // apply loop variables and depending services to callback
                    directive.callback.apply(null, params);
                });

                $(elements).each(function (j, obj) {
                    // store function ID to avoid duplicate bindings
                    if (!directive.allowDuplicates) {
                        directive.elements.push(obj);
                    }
                });
            }

        });
    };


    /**
     * Collection of uncompiled registered factories & services.
     * See {{#crossLink "PlentyFramework/compile:method"}}.compile(){{/crossLink}}
     * @attribute components
     * @static
     * @type {{factories: {}, services: {}}}
     */
    PlentyFramework.components = {
        factories: {},
        services: {}
    };

    /**
     * Register a new service
     * @function service
     * @static
     * @param {string}      serviceName        Unique identifier of the service to get/ create
     * @param {function}    serviceFunctions   Callback containing all public functions of this service.
     * @param {Array}       [dependencies]     Identifiers of required services to inject in serviceFunctions
     * @return {object}                        The object described in serviceFunctions(). Can be received via PlentyFramework.[serviceName]
     */
    PlentyFramework.service = function( serviceName, serviceFunctions, dependencies ) {

        // Catch type mismatching for 'serviceName'
        if( typeof serviceName !== 'string' ) {
            console.error("Type mismatch: Expect first parameter to be a 'string', '" + typeof serviceName + "' given.");
            return;
        }

        // Catch type mismatching for 'serviceFunctions'
        if( typeof serviceFunctions !== 'function' ) {
            console.error("Type mismatch: Expect second parameter to be a 'function', '" + typeof serviceFunctions + "' given.");
            return;
        }

        dependencies = dependencies || [];

        PlentyFramework.components.services[serviceName] = {
            name: serviceName,
            dependencies: dependencies,
            compile: function() {
                var params = PlentyFramework.resolveFactories( dependencies );
                PlentyFramework.prototype[serviceName] = serviceFunctions.apply( null, params );
            }
        };

    };

    /**
     * Returns an array containing required factories given by string identifier
     * @function resolveServices
     * @static
     * @private
     * @param  {Array} dependencies    Names of required factories
     * @return {Array}                 Objects to apply to callback function
     */
    PlentyFramework.resolveServices = function( dependencies ) {
        var compiledServices = [];

        $.each( dependencies, function(j, dependency) {

            // factory not found: try to compile dependent factory first
            if( !PlentyFramework.prototype.hasOwnProperty(dependency) ) {
                if( PlentyFramework.components.services.hasOwnProperty(dependency) ) {
                    PlentyFramework.components.services[dependency].compile();
                } else {
                    console.error('Cannot inject Service "' + dependency + '": Service not found.');
                    return false;
                }
            }
            var service = PlentyFramework.prototype[dependency];
            compiledServices.push( service );
        });

        return compiledServices;
    };

    /**
     * Collection of compiled factories
     * @attribute factories
     * @static
     * @type {object}
     */
    PlentyFramework.factories = {};

    /**
     * Register a new factory
     * @function factory
     * @static
     * @param {string}      factoryName         A unique name of the new factory
     * @param {function}    factoryFunctions    The function describing the factory
     * @param {Array}       dependencies        List of required factories to inject
     */
    PlentyFramework.factory = function( factoryName, factoryFunctions, dependencies ) {

        // Catch type mismatching for 'serviceName'
        if( typeof factoryName !== 'string' ) {
            console.error("Type mismatch: Expect first parameter to be a 'string', '" + typeof factoryName + "' given.");
            return;
        }

        // Catch type mismatching for 'serviceFunctions'
        if( typeof factoryFunctions !== 'function' ) {
            console.error("Type mismatch: Expect second parameter to be a 'function', '" + typeof factoryFunctions + "' given.");
            return;
        }

        dependencies = dependencies || [];
        PlentyFramework.components.factories[factoryName] = {
            name: factoryName,
            dependencies: dependencies,
            compile: function() {
                var params = PlentyFramework.resolveFactories( dependencies );
                PlentyFramework.factories[factoryName] = factoryFunctions.apply( null, params );
            }
        };

    };

    /**
     * Returns an array containing required factories given by string identifier
     * @function resolveFactories
     * @static
     * @private
     * @param  {Array}   dependencies  Names of required factories
     * @return {Array}                 Objects to apply to callback function
     */
    PlentyFramework.resolveFactories = function( dependencies ) {
        var compiledFactories = [];

        $.each( dependencies, function(j, dependency) {

            // factory not found: try to compile dependent factory first
            if( !PlentyFramework.factories.hasOwnProperty(dependency) ) {
                if( PlentyFramework.components.factories.hasOwnProperty(dependency) ) {
                    PlentyFramework.components.factories[dependency].compile();
                } else {
                    console.error('Cannot inject Factory "' + dependency + '": Factory not found.');
                    return false;
                }
            }
            var factory = PlentyFramework.factories[dependency];
            compiledFactories.push( factory );
        });

        return compiledFactories;
    };

    /**
     * Compile registered factories & services
     * @function compile
     * @static
     */
    PlentyFramework.compile = function() {

        for( var factory in PlentyFramework.components.factories ) {
            if( !PlentyFramework.factories.hasOwnProperty(factory) ) {
                PlentyFramework.components.factories[factory].compile();
            }
        }

        for( var service in PlentyFramework.components.services ) {
            if( !PlentyFramework.prototype.hasOwnProperty(service) ) {
                PlentyFramework.components.services[service].compile();
            }
        }

    };

}(jQuery));




/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Factories
 */
(function($, pm) {

    /**
     * Handles requests to ReST API. Provides a {{#crossLink "APIFactory/handleError:method"}}default error-handling{{/crossLink}}.
     * Request parameters will be parsed to json internally<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "UIFactory"}}UIFactory{{/crossLink}}</li>
     * </ul>
     * @class APIFactory
     * @static
     */
	pm.factory('APIFactory', function(UI) {

		return {
            get: _get,
            post: _post,
            put: _put,
            delete: _delete,
            idle: _idle
		};

        /**
         * Is called by default if a request failed.<br>
         * Can be prevented by setting the requests last parameter to false.
         *
         * @function handleError
         * @private
         *
         * @param {object} jqXHR   <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function handleError( jqXHR ) {
            try {
                var responseText = $.parseJSON(jqXHR.responseText);
                UI.printErrors(responseText.error.error_stack);
            } catch(e) {
                UI.throwError( jqXHR.status, jqXHR.statusText );
            }
        }


        /**
         * Sends a GET request to ReST-API
         *
         * @function get
         *
         * @param   {string}    url                     The URL to send the request to
         * @param   {object}    params                  The data to append to requests body. Will be converted to JSON internally
         * @param   {boolean}   [ignoreErrors=false]    disable/ enable defaults error handling
         * @param   {boolean}   [runInBackground=false] show wait screen while request is in progress.
         * @return  {object}    <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function _get( url, params, ignoreErrors, runInBackground, sync ) {

            if( !runInBackground ) UI.showWaitScreen();

            return $.ajax(
                url,
                {
                    type:       'GET',
                    data:       params,
                    dataType:   'json',
                    async:      !sync,
                    error:      function( jqXHR ) { if( !ignoreErrors ) handleError( jqXHR ) }
                }
            ).always( function() {
                    if( !runInBackground ) UI.hideWaitScreen();
                });

        }

        /**
         * Sends a POST request to ReST-API
         *
         * @function post
         *
         * @param   {string}    url                     The URL to send the request to
         * @param   {object}    data                    The data to append to requests body. Will be converted to JSON internally
         * @param   {boolean}   [ignoreErrors=false]    disable/ enable defaults error handling
         * @param   {boolean}   [runInBackground=false] show wait screen while request is in progress.
         * @return  {object}    <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function _post( url, data, ignoreErrors, runInBackground ) {

            if( !runInBackground ) UI.showWaitScreen();

            return $.ajax(
                url,
                {
                    type:       'POST',
                    data:       JSON.stringify(data),
                    dataType:   'json',
                    contentType:'application/json',
                    error:      function( jqXHR ) { if( !ignoreErrors ) handleError( jqXHR ) }
                }
            ).always( function() {
                    if( !runInBackground ) UI.hideWaitScreen();
                });
        }

        /**
         * Sends a PUT request to ReST-API
         *
         * @function put
         *
         * @param   {string}    url                     The URL to send the request to
         * @param   {object}    data                    The data to append to requests body. Will be converted to JSON internally
         * @param   {boolean}   [ignoreErrors=false]    disable/ enable defaults error handling
         * @param   {boolean}   [runInBackground=false] show wait screen while request is in progress.
         * @return  {object}    <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function _put( url, data, ignoreErrors, runInBackground ) {

            if( !runInBackground ) UI.showWaitScreen();

            return $.ajax(
                url,
                {
                    type:       'PUT',
                    data:       JSON.stringify(data),
                    dataType:   'json',
                    contentType:'application/json',
                    error:      function( jqXHR ) { if( !ignoreErrors ) handleError( jqXHR ) }
                }
            ).always( function() {
                    if( !runInBackground ) UI.hideWaitScreen();
                });

        }

        /**
         * Sends a DELETE request to ReST-API
         *
         * @function delete
         *
         * @param   {string}    url                     The URL to send the request to
         * @param   {object}    data                    The data to append to requests body. Will be converted to JSON internally
         * @param   {boolean}   [ignoreErrors=false]    disable/ enable defaults error handling
         * @param   {boolean}   [runInBackground=false] show wait screen while request is in progress.
         * @returns {object}    <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function _delete( url, data, ignoreErrors, runInBackground ) {

            if( !runInBackground ) UI.showWaitScreen();

            return $.ajax(
                url,
                {
                    type:       'DELETE',
                    data:       JSON.stringify(data),
                    dataType:   'json',
                    contentType:'application/json',
                    error:      function( jqXHR ) { if( !ignoreErrors ) handleError( jqXHR ) }
                }
            ).always( function() {
                    if( !runInBackground ) UI.hideWaitScreen();
                });

        }

        /**
         * Get a idle request doing nothing for chaining methods
         * @returns {object}    <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function _idle() {
            return $.Deferred().resolve();
        }

    }, ['UIFactory']);
}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Factories
 */
(function(pm) {

    /**
     * Provide methods for receiving layout containers, layout parameters
     * or category content from API<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "APIFactory"}}APIFactory{{/crossLink}}</li>
     * </ul>
     * @class CMSFactory
     * @static
     */
	pm.factory('CMSFactory', function(API) {

		return {
            getContainer: getContainer,
            getParams: getParams,
            getCategoryContent: getCategoryContent
		};

        /**
         * Prepare the request to receive HTML-Content from CMS
         * @function getContainer
         * @param   {string}    containerName The Layoutcontainer to receive.
         * @param   {object}    params Additional GET-parameters.
         * @returns {object}    The prepared request. Call <code>.from( layoutGroup )</code> to specify the location in the CMS
         *                      (e.g. 'Checkout')
         * @example
         *          CMSFactory.getContainer( 'CheckoutTotals' ).from( 'Checkout' )
         *              .done(function( response ) {
         *                  // container content
         *                  var html = response.data[0]
         *              });
         */
        function getContainer( containerName, params ) {

            function from( layoutGroup ) {
                return API.get( '/rest/' + layoutGroup.toLowerCase() + '/container_' + containerName.toLowerCase() + '/', params );
            }

            return {
                from: from
            }

        }

        /**
         * Prepare the request to receive Layout parameters for a template
         * @function getParams
         * @param   {string} containerName The Layoutcontainer to receive the parameteres of.
         * @param   {object} params   Additional GET-parameters.
         * @returns {object}               The prepared request. Call <code>.from( layoutGroup )</code> to specify the location in the CMS
         *                                 (e.g. 'ItemView')
         * @example
         *          CMSFactory.getParams( 'BasketItemsList' ).from( 'ItemView' )
         *              .done(function( response ) {
         *                  // BasketItems
         *                  var items = response.data;
         *              });
         */
        function getParams( containerName, params ) {

            function from( layoutGroup ) {
                return API.get( '/rest/' + layoutGroup.toLowerCase() + '/' + containerName.toLowerCase() + '/',  params );
            }

            return {
                from: from
            }
        }

        /**
         * Get the content of a category specified by its ID
         * @function getCategoryContent
         * @param   {number} categoryID    The ID of the category to get the content from
         * @returns {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function getCategoryContent( categoryID ) {

            return API.get( '/rest/categoryview/categorycontentbody/?categoryID=' + categoryID );
        }

	}, ['APIFactory']);
}(PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Factories
 */
(function(pm) {

    /**
     * Holds checkout data for global access and provides methods
     * for reloading content dynamically-<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "APIFactory"}}APIFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CMSFactory"}}CMSFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "UIFactory"}}UIFactory{{/crossLink}}</li>
     * </ul>
     * @class CheckoutFactory
     * @static
     */
	pm.factory('CheckoutFactory', function(API, CMS, UI) {

        // data received from ReST API
        var checkoutData;

        // instance wrapped checkout object for global access
        var checkout;

		return {
            getCheckout: getCheckout,
            setCheckout: setCheckout,
            loadCheckout: loadCheckout,
            reloadContainer: reloadContainer,
            reloadCatContent: reloadCatContent,
            reloadItemContainer: reloadItemContainer
		};


        function Checkout() {
            return checkoutData;
        }

        /**
         * Returns instance of wrapped checkout object
         * @function getCheckout
         * @returns {Checkout} Instance of checkout object
         */
        function getCheckout() {
            if(!checkout || !checkoutData) {
                loadCheckout(true);
            }

            return checkout;
        }

        /**
         * Receive global checkout data from ReST-API
         * @function loadCheckout
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function loadCheckout(sync) {

            return API.get('/rest/checkout/', null, false, true, sync)
                .done(function(response) {
                    if( !!response ) {
                        checkoutData = response.data;
                        checkout = new Checkout();
                    }
                    else UI.throwError(0, 'Could not receive checkout data [GET "/rest/checkout/" receives null value]');
                });
        }

        /**
         * Update checkout data on server
         * @function setCheckout
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function setCheckout() {

            return API.put('/rest/checkout', checkout)
                .done(function(response) {
                    if( !!response ) {
                        checkoutData = response.data;
                        checkout = new Checkout();
                    }
                    else UI.throwError(0, 'Could not receive checkout data [GET "/rest/checkout/" receives null value]');
                });

        }

        /**
         * Get layout container from server and replace received HTML
         * in containers marked with <b>data-plenty-checkout-template="..."</b>
         * @function reloadContainer
         * @param  {string} container Name of the template to load from server
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function reloadContainer( container ) {

            return CMS.getContainer( "checkout"+container ).from( 'checkout' )
                .done(function (response) {
                    $('[data-plenty-checkout-template="' + container + '"]')
                        .each(function (i, elem) {
                            $(elem).html(response.data[0]);
                            pm.getInstance().bindDirectives();
                        });
                });
        }

        /**
         * Get category content from server and replace received HTML
         * in containers marked with <b>data-plenty-checkout-catcontent="..."</b>
         * @function reloadCatContent
         * @param	{number} catId	ID of the category to load content (description 1) from server
         * @return  {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function reloadCatContent( catId ) {

            return CMS.getCategoryContent(catId)
                .done(function(response) {
                    $('[data-plenty-checkout-catcontent="'+catId+'"]')
                        .each(function(i, elem) {
                            $(elem).html(response.data[0]);
                            pm.getInstance().bindDirectives();
                        });
                });

        }

        /**
         * Get layout container from server and replace received HTML
         * in containers marked with <b>data-plenty-itemview-template="..."</b>
         * @function reloadItemContainer
         * @param	{string} container	Name of the (item view) template to load from server
         * @return  {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function reloadItemContainer( container ) {

            return CMS.getContainer( 'itemview' + container ).from( 'itemview' )
                .done(function(response) {
                    $('[data-plenty-itemview-template="'+container+'"]')
                        .each(function(i, elem) {
                            $(elem).html(response.data[0]);
                            pm.getInstance().bindDirectives();
                        });
                });

        }
				
	}, ['APIFactory', 'CMSFactory', 'UIFactory']);
}(PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Factories
 */
(function($, pm) {

    /**
     * Provides methods for creating and displaying modal popups.
     * @class ModalFactory
     * @static
     */
	pm.factory('ModalFactory', function() {

		return {
            prepare: prepare,
            isModal: isModal
		};

        /**
         * Detect if given html contains a valid modal
         * @function isModal
         * @param {string} html
         * @returns {boolean}
         */
        function isModal( html ) {
            return $(html).filter('.reveal-modal' ).length + $(html).find('.reveal-modal' ).length > 0;
        }

        /**
         * Create a new Instance of {{#crossLink "ModalFactory.Modal"}}Modal{{/crossLink}}
         * @function prepare
         * @returns {Modal}
         */
        function prepare() {
            return new Modal();
        }

        /**
         * Holds configuration of a modal and provides methods for displaying and hiding the modal
         * @class Modal
         * @for ModalFactory
         * @returns {Modal}
         * @constructor
         */
        function Modal() {

            var modal = this;
            /**
             * The title of the modal
             * @attribute title
             * @type {string}
             * @private
             * @default ""
             */
            modal.title      = '';

            /**
             * The content of the modal
             * @attribute content
             * @type {string}
             * @private
             * @default ""
             */
            modal.content    = '';

            /**
             * The content of the dismiss-button
             * @attribute labelDismiss
             * @type {string}
             * @private
             * @default "Abbrechen"
             */
            modal.labelDismiss = 'Abbrechen';

            /**
             * the label of the confirmation button
             * @attribute labelConfirm
             * @type {string}
             * @private
             * @default "Bestätigen"
             */
            modal.labelConfirm = 'Bestätigen';

            /**
             * Callback when modal is confirmed by clicking confirmation button.
             * Modal will not be dismissed if callback returns false.
             * @attribute onConfirm
             * @type {function}
             * @private
             * @default function() {}
             */
            modal.onConfirm  = function() {};

            /**
             * Callback when modal is dismissed by closing the modal
             * @attribute onDismiss
             * @type {function}
             * @private
             * @default function() {}
             */
            modal.onDismiss  = function() {};

            /**
             * jQuery selector of the container element to display the modal in.
             * @attribute container
             * @type {string}
             * @private
             * @default "body"
             */
            modal.container  = 'body';

            /**
             * Timeout to close the modal automatically. Set &lt;0 to disable.
             * @attribute timeout
             * @type {number}
             * @private
             * @default -1
             */
            modal.timeout = -1;

            var bsModal;
            var timeout, interval;
            var timeRemaining, timeStart;
            var paused = false;

            return {
                setTitle: setTitle,
                setContent: setContent,
                setContainer: setContainer,
                setLabelConfirm: setLabelConfirm,
                setLabelDismiss: setLabelDismiss,
                onConfirm: onConfirm,
                onDismiss: onDismiss,
                setTimeout: setTimeout,
                show: show,
                hide: hide
            };

            /**
             * Set the {{#crossLink "ModalFactory.Modal/title:attribute}}title{{/crossLink}} of the modal
             * @function setTitle
             * @param   {string}    title The title
             * @returns {Modal}     Modal object for chaining methods
             */
            function setTitle( title ) {
                modal.title = title;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/content:attribute}}content{{/crossLink}} of the modal
             * @function setContent
             * @param   {string}    content The content
             * @returns {Modal}     Modal object for chaining methods
             */
            function setContent( content ) {
                modal.content = content;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/labelConfirm:attribute}}label of the confirmation button{{/crossLink}} of the modal
             * @function setLabelConfirm
             * @param   {string}    label The label
             * @returns {Modal}     Modal object for chaining methods
             */
            function setLabelConfirm( label ) {
                modal.labelConfirm = label;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/labelDismiss:attribute}}label if the dismiss button{{/crossLink}} of the modal
             * @function setLabelDismiss
             * @param   {string}    label The label
             * @returns {Modal}     Modal object for chaining methods
             */
            function setLabelDismiss( label ) {
                modal.labelDismiss = label;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/onConfirm:attribute}}confirmation callback{{/crossLink}} of the modal
             * @function onConfirm
             * @param   {function}  callback The callback if modal is confirmed
             * @returns {Modal}     Modal object for chaining methods
             */
            function onConfirm( callback ) {
                modal.onConfirm = callback;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/onDismiss:attribute}}dismiss callback{{/crossLink}} of the modal
             * @function onDismiss
             * @param   {function}  callback The callback if modal is dismissed
             * @returns {Modal}     Modal object for chaining methods
             */
            function onDismiss( callback ) {
                modal.onDismiss = callback;
                return this;
            }



            /**
             * Set the {{#crossLink "ModalFactory.Modal/container:attribute}}container{{/crossLink}} of the modal
             * @function setContainer
             * @param   {string}    container The jQuery selector of the container to display the modal in
             * @returns {Modal}     Modal object for chaining methods
             */
            function setContainer( container ) {
                modal.container = container;
                return this;
            }

            /**
             * Set the {{#crossLink "ModalFactory.Modal/timeout:attribute}}timeout{{/crossLink}} of the modal
             * @function setTimeout
             * @param   {number}    timeout The timeout to close the modal automatically. Set &lt;0 to disable
             * @returns {Modal}     Modal object for chaining methods
             */
            function setTimeout( timeout ) {
                modal.timeout = timeout;
                return this;
            }

            /**
             * Inject modal data in default template if not template is given
             * and display the modal inside the configured container.<br>
             * Start timer to hide the modal automatically if timeout is set.
             * @function show
             */
            function show() {
                if( isModal( modal.content ) ) {
                    bsModal = $(modal.content);
                    if( bsModal.length > 1 || !bsModal.is('.reveal-modal') ) {
                        bsModal = $(modal.content).filter('.reveal-modal') || $(modal.content).find('.reveal-modal');
                    }
                } else {
                    bsModal = $( buildTemplate() );
                }

                $(modal.container).append( bsModal );

                // append additional scripts executable
                var scripts = $(modal.content).filter('script');
                if( scripts.length > 0 ) {
                    scripts.each(function( i, script ) {
                        var element = document.createElement('script');
                        element.type = 'text/javascript';
                        element.innerHTML = $(script).text();
                        $( modal.container ).append( element );
                    });
                }

                // bind callback functions
								bsModal.on('closed.fndtn.reveal', '[data-reveal]', function () {
                    hide();
                });
                bsModal.find('[data-plenty-modal="confirm"]').click( function() {
                    var close = modal.onConfirm();
                    if( close ) hide(true);
                });

                bsModal.foundation('reveal', 'open');

                bsModal.on('closed.fndtn.reveal', '[data-reveal]', function () {
                    bsModal.remove();
                });

                if( modal.timeout > 0 ) {
                    startTimeout();
                    bsModal.on('close.fndtn.reveal', '[data-reveal]', stopTimeout);
                    bsModal.hover(pauseTimeout, function() {
                        if( bsModal.is('.open') )
                        {
                            continueTimeout();
                        }
                    });
                }

            }

            /**
             * Wrap html content in bootstrap styled modal.
             * @function buildTemplate
             * @private
             * @returns {string}
             */
            function buildTemplate() {
							  // generate UID to create a unique ID for the modal title
								var uid = '_' + Math.random().toString(36).substr(2, 9);

                var template = '<div class="reveal-modal medium" data-reveal aria-labelledby="modalTitle+' + uid + '" aria-hidden="true" role="dialog">';

                if( !!modal.title && modal.title.length > 0 ) {
                    template +=             '<h2 id="modalTitle+' + uid + '">' + modal.title + '</h2>';
                }

                template +=                 modal.content;

                if( !!modal.labelDismiss && modal.labelDismiss.length > 0 ) {
                    template +=                '<button type="button" class="button secondary close-reveal-modal"> \
                                                    <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>' + modal.labelDismiss + '  \
                                                </button>';
                }

                template +=                    '<button type="button" class="button close-reveal-modal" data-plenty-modal="confirm"> \
                                                    <span class="glyphicon glyphicon-ok" aria-hidden="true"></span> ' + modal.labelConfirm + ' \
                                                </button> \
																								<a class="close-reveal-modal" aria-label="Close">&#215;</a> \
                                            </div>';

                return template;
            }

            /**
             * Hide the modal.
             * @function hide
             * @param {boolean} confirmed Flag indicating of modal is closed by confirmation button or dismissed
             */
            function hide( confirmed ) {
							  $('#second-modal').foundation('reveal', 'close');
                bsModal.modal('hide');

                if( !confirmed ) {
                    modal.onDismiss();
                }
            }

            /**
             * Start the configured timeout initially
             * @function startTimeout
             * @private
             */
            function startTimeout() {
                timeRemaining = modal.timeout;
                timeStart = (new Date()).getTime();

                timeout = window.setTimeout(function () {
                    window.clearInterval(interval);
                    hide();
                }, modal.timeout);

                bsModal.find('[data-plenty-modal="timer"]').text(timeRemaining / 1000);
                interval = window.setInterval(function () {
                    if (!paused) {
                        var secondsRemaining = timeRemaining - (new Date()).getTime() + timeStart;
                        secondsRemaining = Math.round(secondsRemaining / 1000);
                        bsModal.find('[data-plenty-modal="timer"]').text(secondsRemaining);
                    }
                }, 1000)
            }

            /**
             * Pause the timeout (e.g. on hover)
             * @function pauseTimeout
             * @private
             */
            function pauseTimeout() {
                paused = true;
                timeRemaining -= (new Date()).getTime() - timeStart;
                window.clearTimeout(timeout);
            }

            /**
             * Continue paused timeout
             * @function continueTimeout
             * @private
             */
            function continueTimeout() {
                paused = false;
                timeStart = (new Date()).getTime();
                timeout = window.setTimeout(function () {
                    hide();
                    window.clearInterval(interval);
                }, timeRemaining);
            }

            /**
             * Stop timeout. Stopped timeouts cannot be continued.
             * @function stopTimeout
             * @private
             */
            function stopTimeout() {
                window.clearTimeout( timeout );
                window.clearInterval( interval );
            }

        }




	});
}(jQuery, PlentyFramework));

/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Factories
 */
(function($, pm) {

    /**
     * Displaying error messages and handling wait screen
     * @class UIFactory
     * @static
     */
    pm.factory('UIFactory', function() {
        /**
         * Increased/ decreased when showing/ hiding wait screen to avoid stacking
         * multiple instances of overlays.
         * @attribute waitScreenCount
         * @private
         * @type {number}
         * @default 0
         */
        var waitScreenCount = 0;

        return {
            throwError: throwError,
            printErrors: printErrors,
            showWaitScreen: showWaitScreen,
            hideWaitScreen: hideWaitScreen
        };

        /**
         * Display a single error message.
         * @function throwError
         * @param {number} code A code identifying this error
         * @param {string} msg  The error message to display
         */
        function throwError(code, msg) {
            printErrors([{code: code, message: msg}]);
        }

        /**
         * Wrap error messages in error popup, if popup doesn't already contain this error
         * If popup is already visible, append new errors to popup's inner HTML
         * otherwise create new popup
         * @function printErrors
         * @param {Array} errorMessages A list of errors to display
         */

        function printErrors(errorMessages) {
            var popup = $('#CheckoutErrorPane');
            var errorHtml = '';

            // create error-popup if not exist
            if( popup.length <= 0 ) {
                popup = $('<div class="plentyErrorBox" id="CheckoutErrorPane" style="display: none;"><button class="close" type="button"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button><div class="plentyErrorBoxInner"></div></div>');

                $('body').append(popup);
                // bind popups 'close'-button
                popup.find('.close').click(function() {
                    popup.hide();
                });
            }

            $.each(errorMessages, function(key, error) {
                // add additional error, if not exist.
                if( !popup.is(':visible') || popup.find('[data-plenty-error-code="'+error.code+'"]').length <= 0 ) {
                    errorHtml += '\
					<div class="plentyErrorBoxContent" data-plenty-error-code="'+error.code+'">\
						<span class="PlentyErrorCode">Code '+error.code+':</span>\
						<span class="PlentyErrorMsg">'+error.message+'</span>\
					</div>';
                }
            });

            if( popup.is(':visible') ) {
                // append new error to existing errors, if popup is already visible
                popup.find('.plentyErrorBoxInner').append(errorHtml);
            } else {
                // replace generated error-HTML and show popup
                popup.find('.plentyErrorBoxInner').html(errorHtml);
                popup.show();
            }

            hideWaitScreen("printErrors", true);
        }


        /**
         * Show wait screen if not visible and increase
         * {{#crossLink "UIFactory/waitScreenCount:attribute"}}waitScreenCount{{/crossLink}}
         * @function showWaitScreen
         */
        function showWaitScreen() {
            waitScreenCount = waitScreenCount || 0;

            var waitScreen = $('#PlentyWaitScreen');
            // create wait-overlay if not exist
            if( waitScreen.length <= 0 ) {
                waitScreen = $('<div id="PlentyWaitScreen" class="overlay overlay-wait in"></div>');
                $('body').append(waitScreen);
            } else {
                // show wait screen if not already visible
                waitScreen.addClass('in');
            }

            // increase instance counter to avoid showing multiple overlays
            waitScreenCount++;
            return waitScreenCount;
        }

        /**
         * Decrease {{#crossLink "UIFactory/waitScreenCount:attribute"}}waitScreenCount{{/crossLink}}
         * and hide wait screen if waitScreenCount is 0
         * @function hideWaitScreen
         * @param {boolean} forceClose set true to hide wait screen independent from the value of waitScreenCount.
         */
        function hideWaitScreen( forceClose ) {

            // decrease overlay count
            waitScreenCount--;

            // hide if all instances of overlays has been closed
            // or if closing is forced by user
            if( waitScreenCount <= 0 || !!forceClose ) {
                waitScreenCount = 0;
                $('#PlentyWaitScreen').removeClass('in');
            }
            return waitScreenCount;
        }

    });
}(jQuery, PlentyFramework));
/**
 * Factories provide static functions and can be injected into
 * {{#crossLinkModule "Services"}}services{{/crossLinkModule}}.<br>
 * Factories also can inject other factories. Compared to services,
 * factories are not visible in instances of {{#crossLinkModule "PlentyFramework"}}PlentyFramework{{/crossLinkModule}}.
 *
 * @module Factories
 * @main Factories
 */
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function ($, pm) {

    /**
     * Providing methods for logging in and out and registering new customers.<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "APIFactory"}}APIFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CheckoutFactory"}}CheckoutFactory{{/crossLink}}</li>
     * </ul>
     * @class AuthenticationService
     * @static
     */
    pm.service('AuthenticationService', function (API, Checkout) {

        return {
            resetPassword: resetPassword,
            customerLogin: customerLogin,
            setInvoiceAddress: setInvoiceAddress,
            registerCustomer: registerCustomer
        };

        /**
         * Reading E-Mail from form marked with <b>data-plenty-checkout="lostPasswordForm"</b>
         * and sends request to provide a new password to the entered E-Mail-Address.
         *
         * @function resetPasswort
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function resetPassword() {

            var form = $('[data-plenty-checkout="lostPasswordForm"]');

            if( form.validateForm() ) {

                var values = form.getFormValues();

                var params = {
                    Email: values.Email
                };

                return API.post("/rest/checkout/lostpassword/", params)
                    .done(function( response ) {
                        if ( response.data.IsMailSend == true ) {
                            $('[data-plenty-checkout="lostPasswordTextContainer"]').hide();
                            $('[data-plenty-checkout="lostPasswordSuccessMessage"]').show();
                        }
                    });

            }
        }

        /**
         * Try to login in with credentials read from given &ltform> - element.
         * On success redirect to forms 'action' attribute.
         *
         * @function customerLogin
         * @param {object} form The jQuery-wrapped form-element to read the credentials from
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function customerLogin( form ) {
            if( form.validateForm() ) {
                var values = form.getFormValues();

                var params = {
                    Email: values.loginMail,
                    Password: values.loginPassword
                };

                return API.post("/rest/checkout/login/", params)
                    .done(function () {
                        // successful login -> go to form's target referenced by action-attribute
                        window.location.assign( form.attr('action') );

                    });
            }
        }

        /**
         * Setting the invoice address of a newly registered customer or a guest.
         *
         * @function setInvoiceAddress
         * @param {object} invoiceAddress containing address-data sent to server
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function setInvoiceAddress( invoiceAddress ) {

            return API.post("/rest/checkout/customerinvoiceaddress/", invoiceAddress)
                .done(function (response) {
                    Checkout.getCheckout().CustomerInvoiceAddress = response.data;
                });
        }

        /**
         * Prepare address-data to register new customer. Read the address-data from a &lt;form> marked with
         * <b>data-plenty-checkout-form="customerRegistration"</b><br>
         * On success, redirect to forms target referenced by action-attribute
         *
         * @function registerCustomer
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function registerCustomer() {
            var form = $('[data-plenty-checkout-form="customerRegistration"]');

            if( form.validateForm() ) {
                var values = form.getFormValues();

                // create new invoice address
                var invoiceAddress = {
                    LoginType: 2,
                    FormOfAddressID: values.FormOfAddressID,
                    Company: values.Company,
                    FirstName: values.FirstName,
                    LastName: values.LastName,
                    Street: values.Street,
                    HouseNo: values.HouseNo,
                    AddressAdditional: values.AddressAdditional,
                    ZIP: values.ZIP,
                    City: values.City,
                    CountryID: values.CountryID,
                    VATNumber: values.VATNumber,
                    Email: values.Email,
                    EmailRepeat: values.EmailRepeat,
                    BirthDay: values.BirthDay,
                    BirthMonth: values.BirthMonth,
                    BirthYear: values.BirthYear,
                    Password: values.Password,
                    PasswordRepeat: values.PasswordRepeat,
                    PhoneNumber: values.PhoneNumber,
                    MobileNumber: values.MobileNumber,
                    FaxNumber: values.FaxNumber,
                    Postnummer: values.Postnummer
                };

                return setInvoiceAddress(invoiceAddress)
                    .done(function () {
                        window.location.assign( form.attr('action') );
                    });
            }
        }
    }, ['APIFactory', 'CheckoutFactory']);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function($, pm) {

    /**
     * Providing methods for adding, editing or removing basket items and coupon codes<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "APIFactory"}}APIFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "UIFactory"}}UIFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CMSFactory"}}CMSFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CheckoutFactory"}}CheckoutFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "ModalFactory"}}ModalFactory{{/crossLink}}</li>
     * </ul>
     * @class BasketService
     * @static
     */
	pm.service('BasketService', function( API, UI, CMS, Checkout, Modal ) {

		return {
			addItem: addBasketItem,
            removeBasketItem: removeBasketItem,
            setItemQuantity: setItemQuantity,
            addCoupon: addCoupon,
            removeCoupon: removeCoupon
		};

        /**
         * Add item to basket. Will fail and show a popup if item has order params
         * @function addBasketItem
         * @param   {Array}     article         Array containing the item to add
         * @param   {boolean}   [isUpdate=false]      Indicating if item's OrderParams are updated
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function addBasketItem( article ) {

            if( !!article ) {

                API.get( '/rest/checkout/container_' + 'CheckoutOrderParamsList'.toLowerCase() + '/',
                    {   itemID : article[0].BasketItemItemID,
                        quantity : article[0].BasketItemQuantity }).done(function (resp) {
                            // checking for order params!
                            if (resp.data[0].indexOf("form-group") > 0) {
                                Modal.prepare()
                                    .setContent(resp.data[0])
                                    .onConfirm(function() {
                                        // save order params
                                        saveOrderParams(article);

                                        // close modal after saving order params
                                        return true;
                                    })
                                    .show();
                            } else {
                                addArticle(article);
                            }
                    });
            }
        }

        /**
         * Read OrderParams from &lt;form> marked with <b>data-plenty-checkout-form="OrderParamsForm"</b> and inject
         * read values in 'addBasketList'. Update item by calling <code>addBasketItem()</code> again
         * @function saveOrderParams
         * @private
         * @param {Array} articleWithParams Containing the current item to add. Read OrderParams will be injected
         */
        function saveOrderParams( articleWithParams ) {
            var orderParamsForm = $('[data-plenty-checkout-form="OrderParamsForm"]');

            //TODO use $("[data-plenty-checkout-form='OrderParamsForm']").serializeArray() to get order params
            //Groups
            orderParamsForm.find('[name^="ParamGroup"]').each(function(){
                var match = this.name.match(/^ParamGroup\[(\d+)]\[(\d+)]$/);
                articleWithParams = addOrderParamValue(articleWithParams, match[1], $(this).val(), $(this).val());
            });

            //Values
            orderParamsForm.find('[name^="ParamValue"]').each(function(){

                if( ($(this).attr('type') == 'checkbox' && $(this).is(':checked')) ||
                    ($(this).attr('type') == 'radio' && $(this).is(':checked')) ||
                    ($(this).attr('type') != 'radio' && $(this).attr('type') != 'checkbox') )
                {
                    var match = this.name.match(/^ParamValue\[(\d+)]\[(\d+)]$/);
                    articleWithParams = addOrderParamValue(articleWithParams, match[1], match[2], $(this).val());
                }
            });

            addArticle( articleWithParams );
        }

        function addArticle( article ) {
            API.post( '/rest/checkout/basketitemslist/', article, true)
                .done(function() {
                    // Item has no OrderParams -> Refresh Checkout & BasketPreview
                    Checkout.loadCheckout()
                        .done(function() {
                            refreshBasketPreview();
                            // Show confirmation popup
                            CMS.getContainer('ItemViewItemToBasketConfirmationOverlay', { ArticleID : article[0].BasketItemItemID }).from('ItemView')
                                .done(function(response) {
                                    Modal.prepare()
                                        .setContent(response.data[0])
                                        .setTimeout(5000)
                                        .show();
                                });
                        });
                }).fail(function(jqXHR) {
                    // some other error occured
                    UI.printErrors(JSON.parse(jqXHR.responseText).error.error_stack);
                });
        }

        /**
         * Inject an OrderParam.
         * @function addOrderParamValue
         * @private
         * @param {Array} basketList The target to inject the value in.
         * @param {number} position Position where to inject the value
         * @param {number} paramId The ID of the OrderParam to inject
         * @param {string|number} paramValue the value of the OrderParam to inject
         * @returns {Array} Containing the item and the injected OrderParam
         */
        function addOrderParamValue(basketList, position, paramId, paramValue) {
            if (position > 0 && basketList[position] == undefined)
            {
                basketList[position] = $.extend(true, {}, basketList[0]);
                basketList[position].BasketItemOrderParamsList = [];
            }

            if(basketList[position] != undefined)
            {
                basketList[position].BasketItemQuantity = 1;
                if(basketList[position].BasketItemOrderParamsList == undefined)
                {
                    basketList[position].BasketItemOrderParamsList = [];
                }

                basketList[position].BasketItemOrderParamsList.push({
                    BasketItemOrderParamID : paramId,
                    BasketItemOrderParamValue : paramValue
                });
            }

            return basketList;
        }

        /**
         * Remove item from basket. Will show a confirmation popup at first.
         * @function removeBasketItem
         * @param {number}  BasketItemID The ID of the basket item to remove
         * @param {boolean} [forceDelete=false]  Set true to remove the basket item without showing a confirmation popup
         * @return Promise
         */
        function removeBasketItem( BasketItemID, forceDelete ) {

            // get item name
            var itemName, originalItemQuantity;
            var params = Checkout.getCheckout().BasketItemsList;
            for ( var i = 0; i < params.length; i++ ) {
                if ( params[i].BasketItemID == BasketItemID ) {
                    originalItemQuantity = params[i].BasketItemQuantity;
                    itemName = params[i].BasketItemNameMap[1];
                }
            }

            // calling the delete request
            function doDelete() {
                API.delete('/rest/checkout/basketitemslist/?basketItemIdsList[0]='+BasketItemID)
                    .done(function() {
                        Checkout.loadCheckout().done(function() {
                            $('[data-basket-item-id="'+BasketItemID+'"]').remove();

                            if( !Checkout.getCheckout().BasketItemsList || Checkout.getCheckout().BasketItemsList.length <= 0 ) {
                                Checkout.reloadCatContent( pm.getGlobal( 'basketCatID' ) );
                            } else {
                                Checkout.reloadContainer('Totals');
                            }

                            refreshBasketPreview();
                        });
                    });
            }

            if( !forceDelete ) {
                // show confirmation popup
                Modal.prepare()
                    .setTitle('Bitte bestätigen')
                    .setContent('<p>Möchten Sie den Artikel "' + itemName + '" wirklich aus dem Warenkorb entfernen?</p>')
                    .onDismiss(function () {
                        $('[data-basket-item-id="' + BasketItemID + '"]').find('[data-plenty="quantityInput"]').val(originalItemQuantity);
                    })
                    .onConfirm(function () {
                        doDelete();
                    })
                    .setLabelConfirm('Löschen')
                    .show();
            } else {
                doDelete();
            }
        }

        /**
         * Set a new quantity for the given BasketItem. If quantity is set to 0,
         * remove the item.
         * @function setItemQuantity
         * @param {number} BasketItemID The ID of the basket item to change the quantity of
         * @param {number} BasketItemQuantity  The new quantity to set or 0 to remove the item
         */
        function setItemQuantity( BasketItemID, BasketItemQuantity ) {
            // delete item if quantity is 0
            if( BasketItemQuantity <= 0 ) {
                removeBasketItem( BasketItemID );
            }

            var params = Checkout.getCheckout().BasketItemsList;
            var basketItem;
            var basketItemIndex;
            for ( var i = 0; i < params.length; i++ ) {
                if ( params[i].BasketItemID == BasketItemID ) {
                    basketItemIndex = i;
                    basketItem = params[i];
                    break;

                }
            }

            if( !!basketItem && basketItem.BasketItemQuantity != BasketItemQuantity ) {
                params[basketItemIndex].BasketItemQuantity = parseInt( BasketItemQuantity );

                API.post("/rest/checkout/basketitemslist/", params)
                    .done(function () {
                        Checkout.setCheckout().done(function () {
                            Checkout.reloadContainer('Totals');

                            var basketItemsPriceTotal = 0;
                            var params2 = Checkout.getCheckout().BasketItemsList;
                            for (var i = 0; i < params2.length; i++) {
                                if (params2[i].BasketItemID == BasketItemID) {
                                    basketItemsPriceTotal = params2[i].BasketItemPriceTotal;
                                }
                            }
                            $('[data-basket-item-id="' + BasketItemID + '"]').find('[data-plenty-checkout="basket-item-price-total"]').html(basketItemsPriceTotal);
                            refreshBasketPreview();
                        });
                    });
            }
        }

        /**
         * Reload BasketPreview-Template and update basket totals
         * @function refreshBasketPreview
         * @private
         */
        function refreshBasketPreview() {

            Checkout.reloadItemContainer('BasketPreviewList')
                .done(function() {

                    $('[data-plenty-basket-empty]').each(function(i, elem) {
                        var toggleClass = $(elem).attr('data-plenty-basket-empty');
                        if( Checkout.getCheckout().BasketItemsList.length <= 0 ) {
                            $(elem).addClass( toggleClass );
                        } else {
                            $(elem).removeClass( toggleClass );
                        }
                    });

                });

            //update quantity
            var itemQuantityTotal = 0;
            $.each( Checkout.getCheckout().BasketItemsList, function(i, basketItem) {
                itemQuantityTotal += basketItem.BasketItemQuantity;
            });

            $('[data-plenty-basket-preview="itemQuantityTotal"]').text( itemQuantityTotal );
            $('[data-plenty-basket-preview="totalsItemSum"]').text( Checkout.getCheckout().Totals.TotalsItemSum );
        }

        /**
         * Read the coupon code from an &lt;input> element marked with <b>data-plenty-checkout-form="couponCode"</b>
         * and try to add this coupon.
         * @function addCoupon
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function addCoupon() {
            var params = {
                CouponActiveCouponCode: $('[data-plenty-checkout-form="couponCode"]').val()
            };

            return API.post("/rest/checkout/coupon/", params)
                .done(function() {
                    Checkout.setCheckout()
                        .done(function() {

                            updateContainer();
                        });
                });
        }

        /**
         * Remove the currently added coupon
         * @function removeCoupon
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function removeCoupon() {
            var params = {
                CouponActiveCouponCode: Checkout.getCheckout().Coupon.CouponActiveCouponCode
            };

            return API.delete("/rest/checkout/coupon/", params)
                .done(function() {
                    Checkout.setCheckout()
                        .done(function() {
                            delete Checkout.getCheckout().Coupon;

                            updateContainer();
                        });
                });
        }

        // update container
        function updateContainer() {
            Checkout.reloadContainer('Coupon');
            // reload category, if we are at checkout
            if ( $('[data-plenty-checkout-catcontent="' + pm.getGlobal('checkoutConfirmCatID') + '"]').length > 0 ) {
                Checkout.reloadCatContent( pm.getGlobal('checkoutConfirmCatID') );
            }
            else
                // reload totals, if we are at basket
                if ( $('[data-plenty-checkout-template="Totals"]').length > 0 ) {
                Checkout.reloadContainer('Totals');
            }
        }

	}, ['APIFactory', 'UIFactory', 'CMSFactory', 'CheckoutFactory', 'ModalFactory']);
}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function($, pm) {

    /**
     * Providing methods for checkout process like setting shipping & payment information and placing the order.<br>
     * <b>Requires:</b>
     * <ul>
     *     <li>{{#crossLink "APIFactory"}}APIFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CMSFactory"}}CMSFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "CheckoutFactory"}}CheckoutFactory{{/crossLink}}</li>
     *     <li>{{#crossLink "ModalFactory"}}ModalFactory{{/crossLink}}</li>
     * </ul>
     * @class CheckoutService
     * @static
     */
	pm.service('CheckoutService', function(API, CMS, Checkout, Modal) {

		return {
            init: init,
            setCustomerSignAndInfo: setCustomerSignAndInfo,
            registerGuest: registerGuest,
            setShippingProfile: setShippingProfile,
            saveShippingAddress: saveShippingAddress,
            loadAddressSuggestion: loadAddressSuggestion,
            preparePayment: preparePayment,
            setMethodOfPayment: setMethodOfPayment,
            editBankDetails: editBankDetails,
            editCreditCard: editCreditCard,
            placeOrder: placeOrder
		};

        /**
         * Load checkout data initially on page load
         * @function init
         */
        function init() {
            Checkout.loadCheckout();
        }


        /**
         * Read customer sign and order information text from &lt;form> marked with <b>data-plenty-checkout-form="details"</b>
         * and update checkout.
         * @function setCustomerSignAndInfo
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function setCustomerSignAndInfo() {
            var form = $('[data-plenty-checkout-form="details"]');
            var values = form.getFormValues();

            // initialize CustomerSign & InfoText to avoid updating empty values
            if (!Checkout.getCheckout().CheckoutCustomerSign) Checkout.getCheckout().CheckoutCustomerSign = "";
            if (!Checkout.getCheckout().CheckoutOrderInfoText) Checkout.getCheckout().CheckoutOrderInfoText = "";

            if ( ( Checkout.getCheckout().CheckoutCustomerSign !== values.CustomerSign && $(form).find('[name="CustomerSign"]').length > 0 )
                || ( Checkout.getCheckout().CheckoutOrderInfoText !== values.OrderInfoText && $(form).find('[name="OrderInfoText"]').length > 0 ) ) {

                Checkout.getCheckout().CheckoutCustomerSign = values.CustomerSign;
                Checkout.getCheckout().CheckoutOrderInfoText = values.OrderInfoText;

                return Checkout.setCheckout()
                    .done(function () {
                        Checkout.reloadCatContent( pm.getGlobal('checkoutConfirmCatID') );
                    });

            } else {
                // No changes detected -> Do nothing
                return API.idle();
            }
        }

        /**
         * Read address data from &lt;form> marked with <b>data-plenty-checkout-form="shippingAddress"</b>.
         * Create new shipping address or update the shipping address ID.
         * @function saveShippingAddress
         * @param {boolean} [validateForm = false] validate form before processing requests
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function saveShippingAddress( validateForm ) {
            var form = $('[data-plenty-checkout-form="shippingAddress"]');

            if( !validateForm && !form.validateForm() ) {
                return false;
            }

            var values = form.getFormValues();
            var shippingAddressID = $('[name="shippingAddressID"]:checked').val();

            // TODO: move bootstrap specific function
            $('#shippingAdressSelect').modal('hide');

            if ( shippingAddressID < 0) {
                // save separate
                var shippingAddress = values;

                if( !addressesAreEqual( shippingAddress, Checkout.getCheckout().CustomerShippingAddress) ) {

                    // new shipping address
                    return API.post("/rest/checkout/customershippingaddress/", shippingAddress)
                        .done(function (response) {

                            Checkout.getCheckout().CheckoutCustomerShippingAddressID = response.data.ID;
                            delete Checkout.getCheckout().CheckoutMethodOfPaymentID;
                            delete Checkout.getCheckout().CheckoutShippingProfileID;

                            Checkout.setCheckout().done(function () {
                                Checkout.reloadContainer('MethodsOfPaymentList');
                                // TODO: the following container may not be reloaded if guest registration
                                if (Checkout.getCheckout().CustomerInvoiceAddress.LoginType == 2) {
                                    Checkout.reloadContainer('CustomerShippingAddress');
                                }
                                Checkout.reloadContainer('ShippingProfilesList');
                                Checkout.reloadCatContent( pm.getGlobal('checkoutConfirmCatID') );
                            });
                        });
                } else {
                    // no changes detected
                    return API.idle();
                }

            } else {
                if( shippingAddressID != Checkout.getCheckout().CheckoutCustomerShippingAddressID ) {
                    // change shipping address id
                    Checkout.getCheckout().CheckoutCustomerShippingAddressID = shippingAddressID;
                    delete Checkout.getCheckout().CheckoutMethodOfPaymentID;
                    delete Checkout.getCheckout().CheckoutShippingProfileID;

                    return Checkout.setCheckout()
                        .done(function () {
                            Checkout.reloadContainer('MethodsOfPaymentList');
                            Checkout.reloadContainer('CustomerShippingAddress');
                            Checkout.reloadContainer('ShippingProfilesList');
                            Checkout.reloadCatContent(pm.getGlobal('checkoutConfirmCatID'));
                        });
                } else {
                    return API.idle();
                }
            }
        }

        /**
         * Prepare address-data to register a guest. Reads the address-data from a &lt;form> marked with
         * <b>data-plenty-checkout-form="guestRegistration"</b>
         * @function registerGuest
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function registerGuest() {
            var form = $('[data-plenty-checkout-form="guestRegistration"]');

            var invoiceAddress = form.getFormValues();
            invoiceAddress.LoginType = 1;


            if( !addressesAreEqual( invoiceAddress, Checkout.getCheckout().CustomerInvoiceAddress ) ) {

                return API.post("/rest/checkout/customerinvoiceaddress/", invoiceAddress)
                    .done(function (response) {
                        saveShippingAddress().done(function(){
                            Checkout.getCheckout().CustomerInvoiceAddress = response.data;
                            Checkout.reloadCatContent(pm.getGlobal('checkoutConfirmCatID'));
                        });
                    });

            } else {

                return saveShippingAddress();

            }
        }

        /**
         * Check if values of addresses are equal
         * @function addressesAreEqual
         * @private
         * @param {object} address1
         * @param {object} address2
         * @returns {boolean}
         */
        function addressesAreEqual( address1, address2 ) {
            for ( var key in address1 ) {
                if ( address1[key]+'' !== address2[key]+'' && key !== 'EmailRepeat' ) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Set the shipping profile used for this order and update checkout. Selected shipping profile will be
         * read from &lt;form> marked with <b>data-plenty-checkout-form="shippingProfileSelect"</b>
         * @function setShippingProfile
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function setShippingProfile() {

            var values = $('[data-plenty-checkout-form="shippingProfileSelect"]').getFormValues();

            Checkout.getCheckout().CheckoutShippingProfileID = values.ShippingProfileID;
            delete Checkout.getCheckout().CheckoutCustomerShippingAddressID;
            delete Checkout.getCheckout().CheckoutMethodOfPaymentID;

            return Checkout.setCheckout()
                .done(function() {
                    Checkout.reloadContainer('MethodsOfPaymentList');
                    Checkout.reloadCatContent( pm.getGlobal('checkoutConfirmCatID') );
                });

        }

        /**
         * Prepare method of payment to check if external checkout is used or addition content should be displayed
         * @function preparePayment
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function preparePayment() {

            return API.post("/rest/checkout/preparepayment/", null)
                .done(function(response) {
                    if( response.data.CheckoutMethodOfPaymentRedirectURL != '') {

                        document.location.assign( response.data.CheckoutMethodOfPaymentRedirectURL );

                    } else if( !!response.data.CheckoutMethodOfPaymentAdditionalContent ) {

                        var isBankDetails = $(response.data.CheckoutMethodOfPaymentAdditionalContent).find('[data-plenty-checkout-form="bankDetails"]').length > 0;
                        Modal.prepare()
                            .setContent( response.data.CheckoutMethodOfPaymentAdditionalContent )
                            .onConfirm(function() {
                                if( isBankDetails ) {
                                    return saveBankDetails();
                                } else {
                                    return saveCreditCard();
                                }
                            })
                            .show();
                    }
                });
        }

        /**
         * Set the method of payment used for this order.
         * @function setMethodOfPayment
         * @param {number|undefined} paymentID  ID of the method of payment to use. Read from &lt;form> marked with
         *                                      <b>data-plenty-checkout-form="methodOfPayment"</b> if unset.
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function setMethodOfPayment( paymentID ) {

            paymentID = paymentID || $('[data-plenty-checkout-form="methodOfPayment"]').getFormValues().MethodOfPaymentID;

            Checkout.getCheckout().CheckoutMethodOfPaymentID = paymentID;
            delete Checkout.getCheckout().CheckoutCustomerShippingAddressID;
            delete Checkout.getCheckout().CheckoutShippingProfileID;

            return Checkout.setCheckout()
                .done(function() {
                    Checkout.reloadContainer('ShippingProfilesList');
                    Checkout.reloadCatContent( pm.getGlobal('checkoutConfirmCatID') );
                });
        }

        /**
         * Display the popup to enter or edit customers bank details
         * @function editBankDetails
         */
        function editBankDetails() {

            CMS.getContainer('CheckoutPaymentInformationBankDetails').from('Checkout')
                .done(function(response) {
                    Modal.prepare()
                        .setContent(response.data[0])
                        .onDismiss(function() {
                            $('input[name="MethodOfPaymentID"]').each(function(i, radio) {
                                if( $(radio).val() == Checkout.getCheckout().CheckoutMethodOfPaymentID ) {
                                    $(radio).attr('checked', 'checked');
                                } else {
                                    $(radio).removeAttr('checked');
                                }
                            });
                        }).onConfirm(function() {
                            return saveBankDetails();
                        })
                        .show();
                });

        }

        /**
         * Read entered bank details from <b>data-plenty-checkout-form="bankDetails"</b> and update checkout.
         * @function saveBankDetails
         * @private
         * @return {boolean} the result of form validation
         */
        function saveBankDetails() {
            var form = $('[data-plenty-checkout-form="bankDetails"]');

            if( form.validateForm() ) {
                var values = form.getFormValues().checkout.customerBankDetails;

                var bankDetails = {
                    CustomerBankName:       values.bankName,
                    CustomerBLZ:            values.blz,
                    CustomerAccountNumber:  values.accountNo,
                    CustomerAccountOwner:   values.accountOwner,
                    CustomerIBAN:           values.iban,
                    CustomerBIC:            values.bic
                };

                API.post("/rest/checkout/paymentinformationbankdetails/", bankDetails)
                    .done(function () {
                        Checkout.loadCheckout().done(function () {
                            setMethodOfPayment(3);
                            Checkout.reloadContainer('MethodsOfPaymentList');
                        });
                    });
                return true;
            } else {
                return false;
            }
        }

        /**
         * Display a popup containing credit card form
         * @function editCreditCard
         */
        function editCreditCard() {

            CMS.getContainer('CheckoutPaymentInformationCreditCard').from('Checkout')
                .done(function(response) {
                    Modal.prepare()
                        .setContent(response.data[0])
                        .onDismiss(function() {
                            $('input[name="MethodOfPaymentID"]').each(function(i, radio) {
                                if( $(radio).val() == Checkout.getCheckout().CheckoutMethodOfPaymentID ) {
                                    $(radio).attr('checked', 'checked');
                                } else {
                                    $(radio).removeAttr('checked');
                                }
                            });
                        }).onConfirm(function() {
                            return saveCreditCard();
                        })
                        .show();
                });
        }

        /**
         * Read values from &lt;form> marked with <b>data-plenty-checkout-form="creditCard"</b> and update checkout.
         * @function saveCreditCard
         * @private
         * @return {boolean} the result of form validation
         */
        function saveCreditCard() {
            var form = $('[data-plenty-checkout-form="creditCard"]');

            if( form.validateForm() ) {

                var values = form.getFormValues().checkout.paymentInformationCC;

                var creditCard = {
                    Owner:      values.owner,
                    Cvv2:       values.cvv2,
                    Number:     values.number,
                    Year:       values.year,
                    Month:      values.month,
                    Provider:   values.provider
                };

                API.post('/rest/checkout/paymentinformationcreditcard/', creditCard)
                    .done(function() {
                        Checkout.loadCheckout();
                    });
                return true;
            } else {
                return false;
            }
        }

        /**
         * Display a popup containing address suggestions
         * @param {string} type
         */
        function loadAddressSuggestion(type) {

            //check login type
            if (Checkout.getCheckout().CustomerInvoiceAddress.LoginType == 2) {
                var values = $('[data-plenty-checkout-form="shippingAddress"]').getFormValues();
            }
            else {
                var values = $('[data-plenty-checkout-form="guestRegistration"]').getFormValues();
            }

            var params = {
                street:         values.Street,
                houseNo:        values.HouseNo,
                ZIP:            values.ZIP,
                city:           values.City,
                postnummer:     values.Postnummer,
                suggestionType: 'postfinder'
            };

            CMS.getContainer('CheckoutAddressSuggestionResultsList', params).from('Checkout')
                .done(function (response) {
                    Modal.prepare()
                        .setContent(response.data[0])
                        .show();
                });
        }

        /**
         * Place the order prepared before and finish the checkout process.<br>
         * Validate required checkboxes in <b>data-plenty-checkout-form="placeOrder"</b>
         * @function placeOrder
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred Object</a>
         */
        function placeOrder() {
            var form = $('[data-plenty-checkout-form="placeOrder"]');
            if ( form.validateForm() ) {

                var values = form.getFormValues();

                // if not shown in layout set default 1 for mandatory fields
                var params = {
                    TermsAndConditionsCheck:    values.termsAndConditionsCheck || 0,
                    WithdrawalCheck:            values.withdrawalCheck || 0,
                    PrivacyPolicyCheck:         values.privacyPolicyCheck || 0,
                    AgeRestrictionCheck:        values.ageRestrictionCheck || 0,
                    NewsletterCheck:            values.newsletterCheck || 0,
                    KlarnaTermsAndConditionsCheck: values.klarnaTermsAndConditionsCheck || 0,
                    PayoneDirectDebitMandateCheck: values.payoneDirectDebitMandateCheck || 0,
                    PayoneInvoiceCheck:            values.payoneInvoiceCheck || 0
                };

                return API.post("/rest/checkout/placeorder/", params)
                    .done(function(response) {
                        if(response.data.MethodOfPaymentRedirectURL != '') {

                            window.location.assign( response.data.MethodOfPaymentRedirectURL );

                        } else if(response.data.MethodOfPaymentAdditionalContent != '') {

                            Modal.prepare()
                                .setContent( response.data.MethodOfPaymentAdditionalContent )
                                .setLabelDismiss( '' )
                                .onDismiss(function() {
                                    window.location.assign( form.attr('action') );
                                }).onConfirm(function() {
                                    window.location.assign( form.attr('action') );
                                }).show();

                        } else {

                            window.location.assign( form.attr('action') );

                        }
                    });
            }
        }


	}, ['APIFactory', 'CMSFactory', 'CheckoutFactory', 'ModalFactory']);
}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function($, pm){

    /**
     * Listens to window's size and trigger 'sizeChange' event if the Bootstrap interval changes.
     * @class MediaSizeService
     * @static
     * @example
     *      $(window).on('sizeChange', function(newValue, oldValue) {
     *          console.log('The interval changed from ' + oldValue + ' to ' + newValue.');
     *      });
     */
    pm.service('MediaSizeService', function() {

        var bsInterval;

        // recalculation of the current interval on window resize
        $(window).resize( calculateMediaSize );

        // initially calculation of the interval
        $(document).ready( calculateMediaSize );

        return {
            interval: getInterval
        };

        /**
         * Get the currently used Bootstrap interval
         * @function getInterval
         * @return {"xs"|"sm"|"md"|"lg"}
         */
        function getInterval() {
            if( !!bsInterval ) calculateMediaSize();

            return bsInterval;
        }

        /**
         * Calculate the currently used Bootstrap interval
         * @function calculateMediaSize
         * @private
         */
        function calculateMediaSize() {
            var size;
            if( !!window.matchMedia ) { // FIX IE support
                if( window.matchMedia('(min-width:1200px)').matches ) size = 'lg';
                else if( window.matchMedia('(min-width:992px)').matches ) size = 'md';
                else if( window.matchMedia('(min-width:768px)').matches ) size = 'sm';
                else size = 'xs';
            } else {
                if( $(window).width() >= 1200 ) size = 'lg';
                else if( $(window).width() >= 992 ) size = 'md';
                else if( $(window).width() >= 768 ) size = 'sm';
                else size = 'xs';
            }
            if( size != bsInterval ) {
                var oldValue = bsInterval;
                bsInterval = size;
                $(window).trigger('sizeChange', [bsInterval, oldValue]);
            }
        }


    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function($, pm){

    /**
     * Handling navigation while checkout processes
     * @class NavigatorService
     * @static
     *
     */
    pm.service('NavigatorService', function() {
        var navigation  = [];		// contains navigation list elements
        var container   = [];		// content containers
        var current     = -1;		// index of currently shown content container
        var buttonPrev  = {};		// navigation buttons
        var buttonNext  = {};
        var interceptors = {
                beforeChange: [],
                afterChange: []
            };

        return {
            init: init,
            getCurrentContainer: getCurrentContainer,
            goTo: goTo,
            beforeChange: beforeChange,
            afterChange: afterChange,
            continueChange: continueChange,
            next: next,
            previous: previous,
            goToID: goToID,
            fillNavigation: fillNavigation
        };

        /**
         * Initialize checkout navigation. Shows first container.
         * @function init
         * @example
         * ```html
         *  <button data-plenty-checkout="prev">zurück</button>
         *  <ul data-plenty-checkout="navigation">
         *      <li>Checkout Step 1</li>
         *      <li>Checkout Step 2</li>
         *      <li>...</li>
         *  </ul>
         *  <button data-plenty-checkout="next">weiter</button>
         *
         *  <div data-plenty-checkout="container">
         *      <div data-plenty-checkout-id="step_1">
         *          Checkout Step 1 Content
         *      </div>
         *      <div data-plenty-checkout-id="step_2">
         *          Checkout Step 2 Content
         *      </div>
         *      <div> ... </div>
         *  </div>
         * ```
         */
        function init() {
            // get elements from DOM
            navigation 	= 	$('[data-plenty-checkout="navigation"] > li');
            container 	= 	$('[data-plenty-checkout="container"] > div');
            buttonNext 	=	$('[data-plenty-checkout="next"]');
            buttonPrev 	=	$('[data-plenty-checkout="prev"]');

            if( navigation.length == container.length && container.length > 0 ) {
                container.hide();

                // initialize navigation
                navigation.each(function(i, elem) {
                    $(elem).addClass('disabled');
                    // handle navigation click events
                    $(elem).click(function() {
                        if( !$(this).is('.disabled') ) {
                            goTo( i );
                        }
                    });
                });

                buttonNext.attr("disabled", "disabled");
                buttonNext.click(function() {
                    next();
                });

                buttonPrev.attr("disabled", "disabled");
                buttonPrev.click(function() {
                    previous();
                });

                window.addEventListener('hashchange', function() {
                    if( window.location.hash.length > 0 ) {
                        goToID(window.location.hash);
                    } else {
                        goTo(0);
                    }
                }, false);

                // initialize GUI
                // check url param for jumping to tab
                $.urlParam = function(name) {
                    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
                    if ( results == null ) {
                        return null;
                    }
                    else {
                        return results[1] || 0;
                    }
                };

                var param = $.urlParam('gototab');
                // jump to hash from url param 'gototab'
                if ( window.location.hash.length == 0 && !! param && $('[data-plenty-checkout-id="'+param+'"]').length > 0 ) {
                    window.location.hash = param;
                }
                // jump to hash
                else if( !goToID(window.location.hash) && current >= 0 ) {
                    goTo(current);
                } else {
                    goTo(0);
                }


                fillNavigation();
                $(window).on('sizeChange', fillNavigation);
                $(window).resize(function() {
                    if(pm.getInstance().MediaSizeService.interval() == 'xs') {
                        fillNavigation();
                    }
                });

            }
        }

        /**
         * Get the currently active checkout container.
         * @function getCurrentContainer
         * @return {{id: string, index: number}}
         */
        function getCurrentContainer() {
            if (current >= 0) {
                return {
                    id: $(container[current]).attr('data-plenty-checkout-id'),
                    index: current
                };
            } else {
                return null;
            }
        }

        /**
         * Register an interceptor called before each tab change.
         * Tabchange will break if any interceptor returns false.
         * @param {function} interceptor The interceptor callback to register
         * @chainable
         * @returns {NavigatorService}
         * @example
         *      plenty.NavigatorService.beforeChange( function(targetContainer) {
         *          if( targetContainer.id === 'details' ) {
         *              // stop tabchange if user tries to access checkout container with id "details"
         *              return false;
         *          }
         *          return true;
         *      });
         */
        function beforeChange( interceptor ) {
            interceptors.beforeChange.push(interceptor);
            return pm.getInstance().NavigatorService;
        }

        /**
         * Register an interceptor called after each tab change.
         * @param {function} interceptor The interceptor callback to register
         * @chainable
         * @returns {NavigatorService}
         */
        function afterChange( interceptor ) {
            interceptors.afterChange.push( interceptor );
            return pm.getInstance().NavigatorService;
        }

        /**
         * Call registered interceptors. Break if any interceptor returns false.
         * Do not call beforeChange-interceptors on initially tabchange
         * @function resolveInterceptors
         * @private
         * @param {"beforeChange"|"afterChange"} identifier Describe which interceptors should be called
         * @param {number} index the index of the target container
         * @returns {boolean} Conjunction of all interceptor return values
         */
        function resolveInterceptors( identifier, index ) {
            var continueTabChange = true;

            if( current >= 0 || identifier === 'afterChange' ) {

                var currentContainer = getCurrentContainer();
                var targetContainer = {
                    index: index,
                    id: $(container[index]).attr('data-plenty-checkout-id')
                };

                $.each(interceptors[identifier], function (i, interceptor) {
                    if (interceptor(currentContainer, targetContainer) === false) {
                        continueTabChange = false;
                        return false
                    }
                });
            }

            return continueTabChange;
        }

        /**
         * Show checkout tab given by index
         * @function goTo
         * @param {number} index Index of target tab, starting at 0
         * @param {boolean} [ignoreInterceptors=false] Set true to not call registered interceptors and force changing tab
         */
        function goTo(index, ignoreInterceptors) {



            var contentChanged = current !== index;

            if( contentChanged && !ignoreInterceptors ) {
                if( !resolveInterceptors( "beforeChange", index ) ) {
                    return;
                }
            }

            current = index;

            // hide content containers
            $(container).hide();

            // refresh navigation elements
            $(navigation).each(function (i, elem) {
                $(elem).removeClass('disabled active');
                $(elem).find('[role="tab"]').attr('aria-selected', 'false');

                if (i < current) {
                    // set current element as active
                    $(elem).addClass('visited');
                }
                else {
                    if (i == current) {
                        $(elem).addClass('active visited');
                        $(elem).find('[role="tab"]').attr('aria-selected', 'true');
                    }
                    else {
                        if (i > current && !$(elem).is('.visited')) {
                            // disable elements behind active
                            $(elem).addClass('disabled');
                        }
                    }
                }
            });
            fillNavigation();

            // hide "previous"-button if first content container is shown
            if (current <= 0) {
                $(buttonPrev).attr("disabled", "disabled");
            } else {
                $(buttonPrev).removeAttr("disabled");
            }

            // hide "next"-button if last content container is shown
            if (current + 1 == navigation.length) {
                $(buttonNext).attr("disabled", "disabled");
            }
            else {
                $(buttonNext).removeAttr("disabled");
            }

            // show current content container
            $(container[current]).show();

            // set location hash
            if (current > 0) {
                window.location.hash = $(container[current]).attr('data-plenty-checkout-id');
            }
            else {
                if (window.location.hash.length > 0) {
                    window.location.hash = '';
                }
            }

            if( contentChanged ) {
                resolveInterceptors("afterChange", index);
            }

        }

        /**
         * Continue interrupted tabchange. Shorthand for: <code>goTo(targetContainer.index, true)</code>
         * @function continueChange
         * @param targetContainer The tab-object received from an interceptor
         */
        function continueChange(targetContainer) {
            goTo(targetContainer.index, true);
        }

        /**
         * Show next checkout tab if available. Shorthand for
         * <code>
         *     if (current < navigation.length - 1) {
         *        goTo(current + 1);
         *     }
         * </code>
         * @function next
         */
        function next() {
            if (current < navigation.length - 1) {
                goTo(current + 1);
            }
        }

        /**
         * Show previous checkout tab if available
         * @function next
         */
        function previous() {
            if (current > 0) {
                goTo(current - 1);
            }
        }

        /**
         * Show checkout tab given by ID
         * @function goToID
         * @param  {string} containerID ID of tab to show. Target tab must be marked with <b>data-plenty-checkout-id="#..."</b>
         */
        function goToID(containerID) {
            if (containerID == 'next') {
                next();
                return true;
            }
            else if (containerID == 'prev') {
                previous();
                return true;
            }
            else {
                containerID = containerID.replace('#', '');
                $(container).each(function (i, elem) {
                    if ($(elem).attr('data-plenty-checkout-id') == containerID) {
                        goTo(i);
                        return true;
                    }
                });
            }

            return false;
        }

        /**
         * Calculate navigation's width to match its parent element
         * by increasing its items padding.
         * @function fillNavigation
         */
        function fillNavigation() {
            // break if manager has not been initialized
            var navigationCount = navigation.length;
            if( navigationCount <= 0 ) return;

            // reset inline styles
            $(navigation).removeAttr('style');
            $(navigation).children('span').removeAttr('style');
            $(buttonNext).removeAttr('style');
            $(buttonPrev).removeAttr('style');


            var buttonWidth = ($(buttonPrev).outerWidth() < $(buttonNext).outerWidth()) ? $(buttonNext).outerWidth(true)+1 : $(buttonPrev).outerWidth(true)+1;
            $(buttonNext).css({ width: buttonWidth+'px' });
            $(buttonPrev).css({ width: buttonWidth+'px' });

            // calculate width to fill
            var width = $(navigation).parent().parent().outerWidth(true) - ( 2 * buttonWidth);
            width -= parseInt($(navigation).parent().css('marginLeft')) + parseInt($(navigation).parent().css('marginRight'));

            var padding = width;
            var tabWidth = [];

            $(navigation).each(function(i, elem) {
                padding -= parseInt( $(elem).css('marginLeft') );
                padding -= parseInt( $(elem).css('marginRight') );

                tabWidth[i] = $(elem).children('span').width();
                padding -= tabWidth[i];

                padding -= parseInt( $(elem).children('span').css('marginLeft') );
                padding -= parseInt( $(elem).children('span').css('marginRight') );
            });

            var paddingEachItem = parseInt( padding / navigationCount );

            var paddingLeft, paddingRight;
            if ( paddingEachItem % 2 == 1 ) {
                paddingLeft = ( paddingEachItem / 2 ) + 0.5;
                paddingRight = ( paddingEachItem / 2 ) - 0.5;
            }
            else {
                paddingLeft = paddingEachItem / 2;
                paddingRight = paddingEachItem / 2;
            }

            var paddingLastItem = parseInt( padding - ( ( navigationCount - 1 ) * ( paddingLeft + paddingRight ) ) );
            var paddingLastLeft, paddingLastRight;
            if ( paddingLastItem % 2 == 1 ) {
                paddingLastLeft = ( paddingLastItem / 2 ) + 0.5;
                paddingLastRight = ( paddingLastItem / 2) - 0.5;
            }
            else {
                paddingLastLeft = paddingLastItem / 2;
                paddingLastRight = paddingLastItem / 2;
            }

            var diff = width;
            $(navigation).each(function(i, elem) {
                if ( i < navigationCount - 1) {
                    $(elem).children('span').css({'paddingLeft': paddingLeft + 'px', 'paddingRight': paddingRight + 'px'}); //.parent().css({ width: ( tabWidth[i] + paddingLeft + paddingRight + parseInt( $(elem).children('span').css('marginLeft') ) + parseInt( $(elem).children('span').css('marginRight') ) )+'px' });
                }
                else {
                    $(elem).children('span').css({'paddingLeft': paddingLastLeft + 'px', 'paddingRight': paddingLastRight + 'px'}); //.parent().css({ width: ( tabWidth[i] + paddingLastLeft + paddingLastRight + parseInt( $(elem).children('span').css('marginLeft') ) + parseInt( $(elem).children('span').css('marginRight') ) )+'px' });
                }
            });

            //$(navigation).parent().css('marginRight', 0);
        }

    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function($, pm) {

    /**
     * Provide templates for social share providers to inject them dynamically.
     * @class SocialShareService
     * @static
     */
    pm.service('SocialShareService', function() {

        if ( typeof(socialLangLocale) == 'undefined' ) socialLangLocale = 'en_US';
        if ( typeof(socialLang) == 'undefined' ) socialLang = 'en';

        return {
            getSocialService: getService
        };

        /**
         * Get the template for social media provider
         * @function getService
         * @param {string} identifier name of the social media provider to get the template for
         * @returns {string} the template to inject in DOM
         */
        function getService( identifier ) {
            var services = {
                'facebook-like' 	:	 '<iframe src="//www.facebook.com/plugins/like.php'
                +'?locale='+socialLangLocale
                +'&amp;href=' + encodeURIComponent(getURI())
                +'&amp;width=130'
                +'&amp;layout=button_count'
                +'&amp;action=like'
                +'&amp;show_faces=false'
                +'&amp;share=false'
                +'&amp;height=21'
                +'&amp;colorscheme=light" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:130px; height:21px;" allowTransparency="true"></iframe>',

                'facebook-recommend'	:	'<iframe src="//www.facebook.com/plugins/like.php'
                +'?locale='+socialLangLocale
                +'&amp;href=' + encodeURIComponent(getURI())
                +'&amp;width=130'
                +'&amp;layout=button_count'
                +'&amp;action=recommend'
                +'&amp;show_faces=false'
                +'&amp;share=false'
                +'&amp;height=21'
                +'&amp;colorscheme=light" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:130px; height:21px;" allowTransparency="true"></iframe>',

                'twitter'				: '<iframe src="//platform.twitter.com/widgets/tweet_button.html'
                +'?url=' + encodeURIComponent(getURI())
                +'&amp;text=' + getTweetText()
                +'&amp;count=horizontal'
                +'&amp;dnt=true" allowtransparency="true" frameborder="0" scrolling="no"  style="width:130px; height:21px;"></iframe>',

                'google-plus'			: '<div '
                +'class="g-plusone" '
                +'data-size="medium" '
                +'data-href="' + getURI() + '"></div>'
                +'<script type="text/javascript">window.___gcfg = {lang: "'+socialLang+'"}; (function() { var po = document.createElement("script"); po.type = "text/javascript"; po.async = true; po.src = "https://apis.google.com/js/platform.js"; var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(po, s); })(); </script>',
            };

            return services[identifier];
        }

        /**
         * get the canonical URL if defined
         * @function getURL
         * @private
         * @return {string} The Canonical URL if defined or the current URI
         */
        function getURI() {
            var uri = document.location.href;
            var canonical = $("link[rel=canonical]").attr("href");

            if (canonical && canonical.length > 0) {
                if (canonical.indexOf("http") < 0) {
                    canonical = document.location.protocol + "//" + document.location.host + canonical;
                }
                uri = canonical;
            }

            return uri;
        }

        /**
         * returns content of &lt;meta name="" content=""> tags or '' if empty/non existant
         * @function getMeta
         * @private
         * @param {string} name The meta name to get the value of;
         */
        function getMeta(name) {
            var metaContent = $('meta[name="' + name + '"]').attr('content');
            return metaContent || '';
        }

        /**
         * create tweet text from content of &lt;meta name="DC.title"> and &lt;meta name="DC.creator">
         * fallback to content of &lt;title> tag
         * @function getTweetText
         * @private
         */
        function getTweetText() {
            var title = getMeta('DC.title');
            var creator = getMeta('DC.creator');

            if (title.length > 0 && creator.length > 0) {
                title += ' - ' + creator;
            } else {
                title = $('title').text();
            }

            return encodeURIComponent(title);
        }

    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Services
 */
(function ($, pm) {

    /**
     * Provide methods for client-side form validation.
     * @class ValidationService
     * @static
     */
    pm.service( 'ValidationService', function() {

        return {
            validate: validate
        };

        /**
         * Check if element is a form element (input, select, textarea) or search for child form elements
         * @function getFormControl
         * @private
         * @param  {object} element the element to get the form element from
         * @return {object} a valid form element (input, select, textarea)
         */
        function getFormControl( element ) {
            if( $(element).is('input') || $(element).is('select') || $(element).is('textarea') ) {
                return $(element);
            } else {
                if( $(element).find('input').length > 0 ) {
                    return $(element).find('input');
                }

                else if ( $(element).find('select').length > 0 ) {
                    return $(element).find('select');
                }

                else if ( $(element).find('textarea').length > 0 ) {
                    return $(element).find('textarea');
                }

                else {
                    return null;
                }
            }

        }

        /**
         * Check given element has any value
         * @function validateText
         * @private
         * @param {object} formControl the form element to validate
         * @return {boolean}
         */
        function validateText( formControl ) {
            // check if formControl is no checkbox or radio
            if ( $(formControl).is('input') || $(formControl).is('select') || $(formControl).is('textarea') ) {
                // check if length of trimmed value is greater then zero
                return $.trim( $(formControl).val() ).length > 0;

            } else {
                console.error('Validation Error: Cannot validate Text for <' + $(formControl).prop("tagName") + '>');
                return false;
            }
        }

        /**
         * Check given element's value is a valid email-address
         * @function validateMail
         * @private
         * @param {object} formControl the form element to validate
         * @return {boolean}
         */
        function validateMail( formControl ) {
            var mailRegExp = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
            if ( validateText(formControl) ) {
                return mailRegExp.test( $.trim( $(formControl).val() ) );
            } else {
                return false;
            }
        }

        /**
         * Check given element's value is a valid number
         * @function validateNumber
         * @private
         * @param {object} formControl the form element to validate
         * @return {boolean}
         */
        function validateNumber( formControl ) {
            if ( validateText(formControl) ) {
                return $.isNumeric( $.trim( $(formControl).val() ) );
            } else {
                return false;
            }
        }

        /**
         * Check given element's value is equal to a references value
         * @function validateValue
         * @private
         * @param {object} formControl the form element to validate
         * @param {string} reference the required value
         * @return {boolean}
         */
        function validateValue( formControl, reference ) {
            if( $(reference).length > 0 ) {
                return $.trim( $(formControl).val() ) == $.trim( $(reference).val() );
            } else {
                return $.trim( $(formControl).val() ) == reference;
            }
        }

        /**
         * Validate a form. Triggers event 'validationFailed' if any element has an invalid value
         * @function validate
         * @param   {object}    form The form element to validate
         * @returns {boolean}
         * @example
         *  ```html
         *      <!-- add "error-class" to invalid elements -->
         *      <form data-plenty-checkform="error-class">
         *          <!-- check if value is "text" -->
         *          <input type="text" data-plenty-validate="text">
         *
         *          <!-- check if value is a valid email-address -->
         *          <input type="text" data-plenty-validate="mail">
         *
         *          <!-- check if value is a valid number -->
         *          <input type="text" data-plenty-validate="number">
         *
         *          <!-- check if value is "foo" -->
         *          <input type="text" data-plenty-validate="value" data-plenty-validation-value="foo">
         *
         *          <!-- check if values are identical -->
         *          <input type="text" id="input1">
         *          <input type="text" data-plenty-validate="value" data-plenty-validation-value="#input1">
         *
         *          <!-- validate radio buttons -->
         *          <input type="radio" name="radioGroup" data-plenty-validate>
         *          <input type="radio" name="radioGroup" data-plenty-validate>
         *          <input type="radio" name="radioGroup" data-plenty-validate>
         *
         *          <!-- validate checkboxes -->
         *          <input type="checkbox" name="checkboxGroup" data-plenty-validate="{min: 1, max: 2}">
         *          <input type="checkbox" name="checkboxGroup" data-plenty-validate="{min: 1, max: 2}">
         *          <input type="checkbox" name="checkboxGroup" data-plenty-validate="{min: 1, max: 2}">
         *
         *          <!-- add error class to parent container -->
         *          <div data-plenty-validate="text">
         *              <label>An Input</label>
         *              <input type="text">
         *          </div>
         *
         *       </form>
         *    ```
         *
         * @example
         *      $(form).on('validationFailed', function(missingFields) {
         *          // handle missing fields
         *      });
         */
        function validate( form ) {
            var errorClass = !!$(form).attr('data-plenty-checkform') ? $(form).attr('data-plenty-checkform') : 'has-error';
            var missingFields = [];

            var hasError = false;

            // check every required input inside form
            $(form).find('[data-plenty-validate], input.Required').each(function(i, elem) {
                // validate text inputs
                var validationKeys = !!$(elem).attr('data-plenty-validate') ? $(elem).attr('data-plenty-validate') : 'text';
                validationKeys = validationKeys.split(',');

                var formControls = getFormControl(elem);
                for(i = 0; i < formControls.length; i++) {
                    var formControl = formControls[i];
                    var validationKey = validationKeys[i].trim() || validationKeys[0].trim();

                    if (!$(formControl).is(':visible') || !$(formControl).is(':enabled')) {
                        return;
                    }
                    var currentHasError = false;


                    // formControl is textfield (text, mail, password) or textarea
                    if (($(formControl).is('input') && $(formControl).attr('type') != 'radio' && $(formControl).attr('type') != 'checkbox') || $(formControl).is('textarea')) {

                        switch (validationKey) {

                            case 'text':
                                currentHasError = !validateText(formControl);
                                break;

                            case 'mail':
                                currentHasError = !validateMail(formControl);
                                break;

                            case 'number':
                                currentHasError = !validateNumber(formControl);
                                break;

                            case 'value':
                                currentHasError = !validateValue(formControl, $(elem).attr('data-plenty-validation-value'));
                                break;
                            case 'none':
                                // do not validate
                                break;
                            default:
                                console.error('Form validation error: unknown validate property: "' + $(elem).attr('data-plenty-validate') + '"');
                                break;
                        }
                    } else if ($(formControl).is('input') && ($(formControl).attr('type') == 'radio' || $(formControl).attr('type') == 'checkbox')) {
                        // validate radio buttons
                        var group = $(formControl).attr('name');
                        var checked, checkedMin, checkedMax;
                        checked = $(form).find('input[name="' + group + '"]:checked').length;

                        if ($(formControl).attr('type') == 'radio') {
                            checkedMin = 1;
                            checkedMax = 1;
                        } else {
                            eval("var minMax = " + $(elem).attr('data-plenty-validate'));
                            checkedMin = !!minMax ? minMax.min : 1;
                            checkedMax = !!minMax ? minMax.max : 1;
                        }

                        currentHasError = ( checked < checkedMin || checked > checkedMax );

                    } else if ($(formControl).is('select')) {
                        // validate selects
                        currentHasError = ( $(formControl).val() == '' || $(formControl).val() == '-1' );
                    } else {
                        console.error('Form validation error: ' + $(elem).prop("tagName") + ' does not contain an form element');
                        return;
                    }

                    if (currentHasError) {
                        hasError = true;
                        missingFields.push(formControl);

                        if(formControls.length > 1 ) {
                            $(formControl).addClass(errorClass);
                            $(form).find('label[for="'+$(formControl).attr('id')+'"]').addClass(errorClass);
                        } else {
                            $(elem).addClass(errorClass);
                        }
                    }
                }
            });

            // scroll to element on 'validationFailed'
            $(form).on('validationFailed', function() {
                var distanceTop = 50;
                var errorOffset = $(form).find('.has-error').first().offset().top;
                var scrollTarget = $('html, body');

                // if form is inside of modal, scroll modal instead of body
                if( $(form).parents('.modal').length > 0 ) {
                    scrollTarget = $(form).parents('.modal');
                } else if( $(form).is('.modal') ) {
                    scrollTarget = $(form);
                }

                // only scroll if error is outside of viewport
                if( errorOffset - distanceTop < window.pageYOffset || errorOffset > (window.pageYOffset + window.innerHeight) ) {
                    scrollTarget.animate({
                        scrollTop: errorOffset - distanceTop
                    });
                }
            });

            if ( hasError ) {
                // remove error class on focus
                $(form).find('.has-error').each(function(i, elem) {
                    var formControl = getFormControl(elem);
                    $(formControl).on('focus click', function() {
                        $(formControl).removeClass( errorClass );
                        $(form).find('label[for="'+$(formControl).attr('id')+'"]').removeClass(errorClass);
                        $(elem).removeClass( errorClass );
                    });
                });

                $(form).trigger('validationFailed', [missingFields]);
            }

            var callback = $(form).attr('data-plenty-callback');
            if( !hasError && !!callback && callback != "submit" && typeof window[callback] == "function") {

                var fields = {};
                $(form).find('input, textarea, select').each(function (){
                    if( $(this).attr('type') == 'checkbox' ) {
                        fields[$(this).attr('name')] = $(this).is(':checked');
                    } else {
                        fields[$(this).attr('name')] = $(this).val();
                    }
                });

                window[callback](fields);
                return false;
            } else {
                return !hasError;
            }
        }
    });

    /**
     * jQuery-Plugin to calling {{#crossLink "ValidationService/validate"}}ValidationService.validate{{/crossLink}}
     * on jQuery wrapped elements.
     * @return {boolean}
     */
    $.fn.validateForm = function() {
        return pm.getInstance().ValidationService.validate( this );
    };

    /**
     * jQuery-Plugin to get the values of contained form elements.
     * @return {object}
     */
    $.fn.getFormValues = function() {

        var form = this;
        var values = {};
        function inject( position, value ) {
            var match = position.match(/^([^\[]+)(.*)/);

            if( !!match[2] ) {
                var exp = /\[([^\]]+)]/g;
                var child;
                var children = [];
                children[0] = match[1];
                while( (child = exp.exec(match[2])) !== null ) {
                    children.push( child[1] );
                }

                for( var i = children.length-1; i >= 0; i-- ) {
                    var val = {};
                    val[children[i]] = value;
                    value = val;
                }
                values = $.extend(true, values, value);
            } else {
                values[match[1]] = value;
            }
        }

        form.find('input, select, textarea').each(function(i, elem) {
            if( !!$(elem).attr('name') ) {
                if ($(elem).attr('type') == "checkbox") {
                    // get checkbox group
                    var groupValues = [];
                    $(form).find('[name="' + $(elem).attr('name') + '"]:checked').each(function (j, checkbox) {
                        groupValues.push($(checkbox).val());
                    });
                    inject($(elem).attr('name'), groupValues);
                } else if ($(elem).attr('type') == 'radio') {
                    if ($(elem).is(':checked')) inject($(elem).attr('name'), $(elem).val());
                } else {
                    inject($(elem).attr('name'), $(elem).val());
                }
            }

        });
        return values;
    }
}(jQuery, PlentyFramework));
/**
 * Services provide functions to be called from the instanced PlentyFramework.<br>
 * Services can inject Factories and can be injected into Directives. The are also
 * available from the global instance of PlentyFramework
 * @module Services
 * @main Services
 * @example
 *      PlentyFramework.service('ServiceName', serviceFunctions() {
 *          return {
 *              functionInService: function() {}
 *           }
 *      });
 *      //...
 *      plenty.ServiceName.functionInService/();
 */
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

/**
 * @module Directives
 */
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

	pm.directive('[data-plenty="addBasketItemButton"]', function(i, button, BasketService)
    {

        $(button).click( function(e)
        {
            // avoid directing to href
            e.preventDefault();

            //init
            var basketItemsList	= {};
            var parentForm		= $(button).parents('form');

            basketItemsList.BasketItemItemID	= parentForm.find('[name="ArticleID"]').val();
            basketItemsList.BasketItemPriceID	= parentForm.find('[name="SYS_P_ID"]').val();
            basketItemsList.BasketItemQuantity	= parentForm.find('[name="ArticleQuantity"]').val();
            basketItemsList.BasketItemBranchID	= parentForm.find('[name="source_category"]').val();

            //attributes
            var attributeInputsList = parentForm.find('[name^="ArticleAttribute"]');
            var attributesList = [];

            $.each(attributeInputsList, function (idx, elem) {
                var match = elem.name.match(/^ArticleAttribute\[\d+]\[\d+]\[(\d+)]$/);
                if(match && match[1])
                {
                    attributesList.push({
                        BasketItemAttributeID 		: match[1],
                        BasketItemAttributeValueID	: $(elem).val()
                    });
                }
            });

            if(attributesList.length != 0)
            {
                basketItemsList.BasketItemAttributesList = attributesList;
            }

            //add basketItem and refresh previewLists
            BasketService.addItem([basketItemsList]);

        });
    }, ['BasketService']);
} (jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // append Bootstrap Tooltip
    pm.directive('[data-toggle="tooltip"]', function(i, elem) {
        $(elem).tooltip({
            container: 'body'
        });
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {
	pm.directive('[data-plenty-checkout-href]', function(i, elem, NavigatorService) {
        $(elem).click(function () {
            NavigatorService.goToID( $(this).attr('data-plenty-checkout-href') );
        });
	}, ['NavigatorService']);
} (jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {


    /*
     * content page slider
     *
     * usage (functionality requires only attribute data-plenty="contentpageSlider"):
     * <div class="contentpageSlider" data-plenty="contentpageSlider">
     *     <div class="slide">
     *         ...
     *     </div>
     *     <div class="slide">
     *         ...
     *     </div>
     *     ...
     * </div>
     */
    pm.directive('[data-plenty="contentpageSlider"]', function(i, elem) {
        $(elem).owlCarousel({
            navigation: true,
            navigationText: false,
            slideSpeed: 1000,
            paginationSpeed: 1000,
            singleItem: true,
            autoPlay: 6000,
            stopOnHover: true,
            afterMove: function(current) { $(current).find('img[data-plenty-lazyload]').trigger('appear'); }
        });
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /*
     * Equal Box heights
     */
    pm.directive('[data-plenty-equal]', function(i, elem, MediaSizeService) {
        var mediaSizes = $(elem).data('plenty-equal').replace(/\s/g, '').split(',');

        var targets = ( $(elem).find('[data-plenty-equal-target]').length > 0 ) ? $(elem).find('[data-plenty-equal-target]') : $(elem).children();

        var maxHeight = 0;
        $(targets).each(function(j, child) {

            $(child).css('height', '');

            if( $(child).outerHeight(true) > maxHeight ) {
                maxHeight = $(child).outerHeight(true);
            }
        });

        if( !mediaSizes || $.inArray( MediaSizeService.interval(), mediaSizes ) >= 0 ) targets.height(maxHeight);

    }, ['MediaSizeService'], true);

    // refresh calculation on window resize
    $(window).on('sizeChange', function() {
        pm.getInstance().bindDirectives( '[data-plenty-equal]' );
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // lazyload images (requires lazyload.min.js)
    // TODO: handle external dependencies dependencies
    pm.directive('img[data-plenty-lazyload]', function(i, elem) {
        $(elem).lazyload({
            effect: $(this).attr('data-plenty-lazyload')
        });
        $(elem).on("loaded", function() {
            $(elem).css('display', 'inline-block');
        });
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    pm.directive('[data-plenty-checkout-form="customerLogin"]', function(i, elem, AuthenticationService) {
        $(elem).on('submit', function (e) {
            e.preventDefault();
            AuthenticationService.customerLogin( $(e.target) );
        });
    }, ["AuthenticationService"]);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /*
     * Mobile dropdowns
     * Toggles dropdowns using css class 'open' instead of pseudo class :hover
     * Usage:
         <li class="dropdown">
         <a data-plenty-enable="CONDITION">...</a>
         </li>
     *
     * possible values for CONDITION
     * "touch"						: use 'open'-class if device is touch-device AND media size is 'md' or 'lg'
     * "toggle-xs-sm-or-touch" : use 'open'-class if device is "touch" (as above) OR media size is 'xs' or 'sm'
     */
    // TODO: handle external dependency to Modernizr
    pm.directive('.dropdown > a[data-plenty-enable]', function(i, elem, MediaSizeService) {

       if( $(elem).attr('data-plenty-enable') == "toggle-xs-sm-or-touch" ) {
            $(elem).click(function(e) {
                if ( MediaSizeService.interval() == 'xs' || MediaSizeService.interval() == 'sm' || ( MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch ) ) {
                    $('.dropdown.open > a[data-plenty-enable="toggle-xs-sm-or-touch"]').not( $(this) ).parent().removeClass('open');
                    $(this).parent().toggleClass('open');
                    return false;
                }
            });
        }

        // dropdown enabled touch
        else if( $(elem).attr('data-plenty-enable') == "touch" ) {
            $(elem).click(function() {
                if ( MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch ) { // otherwise already has mobile navigation
                    $('.dropdown.open > a[data-plenty-enable="touch"]').not( $(this) ).parent().removeClass('open');
                    if ( ! $(this).parent().hasClass('open') ) {
                        $(this).parent().addClass('open');
                        return false;
                    }
                }
            });
        }
    }, ['MediaSizeService']);


    pm.directive('*', function(i, elem, MediaSizeService) {

        $(elem).click(function (e) {
            if (MediaSizeService.interval() == 'xs' || MediaSizeService.interval() == 'sm' || ( MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch )) {
                var dropdown = $('.dropdown.open > a[data-plenty-enable="toggle-xs-sm-or-touch"]').parent();
                if (dropdown.length > 0 && !dropdown.is(e.target) && dropdown.has(e.target).length <= 0) {
                    dropdown.removeClass('open');
                }
            }

            if (MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch) {
                var dropdown = $('.dropdown.open > a[data-plenty-enable="touch"]').parent();
                if (dropdown.length > 0 && !dropdown.is(e.target) && dropdown.has(e.target).length <= 0) {
                    dropdown.removeClass('open');
                }
            }
        });
    }, ['MediaSizeService']);


    pm.directive(window, function(i, elem, MediaSizeService) {
        $(window).on('orientationchange', function() {
            if ( MediaSizeService.interval() == 'xs' || MediaSizeService.interval() == 'sm' || ( MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch ) ) {
                $('.dropdown.open > a[data-plenty-enable="toggle-xs-sm-or-touch"]').parent().removeClass('open');
            }

            if ( MediaSizeService.interval() != 'xs' && MediaSizeService.interval() != 'sm' && Modernizr.touch ) {
                $('.dropdown.open > a[data-plenty-enable="touch"]').parent().removeClass('open');
            }
        });
        $(window).on('sizeChange', function(newValue) {
            if ( newValue != 'xs' && newValue != 'sm' && ! Modernizr.touch ) {
                $('.dropdown.open > a[data-plenty-enable="toggle-xs-sm-or-touch"]').parent().removeClass('open');
            }
        });
    }, ['MediaSizeService']);

    $(document).ready(function() {

        if ( pm.getInstance().MediaSizeService.interval() != 'xs' && pm.getInstance().MediaSizeService.interval() != 'sm' && Modernizr.touch ) {
            $('.dropdown.open > a[data-plenty-enable="touch"]').parent().removeClass('open');
        }

    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // Call function if enter key pressed while element is focused
    pm.directive('[data-plenty-onenter]', function(i, elem) {
        var onEnter = $(elem).attr('data-plenty-onenter');
        var callback = typeof window[onEnter] === 'function' ? window[onEnter] : (new Function('return ' + onEnter));
        $(elem).on('keypress', function(e) {

            if(e.which === 13 && !!callback && typeof callback === "function") {
                callback.call();
            }
        });
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // Tree navigation toggle
    pm.directive('[data-plenty="openCloseToggle"]', function(i, elem) {
        $(elem).click(function () {
            $(elem).parent().addClass('animating');
            $(elem).siblings('ul').slideToggle(200, function () {
                if ($(elem).parent().is('.open')) {
                    $(elem).parent().removeClass('open');
                }
                else {
                    $(elem).parent().addClass('open');
                }
                $(elem).removeAttr('style');
                $(elem).parent().removeClass('animating');
            });
        });

    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // TODO: merge to single directive. Differentiate between increasing and decreasing by additional parameter
    pm.directive('[data-plenty="quantityInputButtonPlus"]', function(i, elem) {
        // quantity input plus/minus buttons
        $(elem).click(function() {
            var input = $($(elem).closest('[data-plenty="quantityInputWrapper"]').find('input'));
            var value = parseInt( input.val() );
            var maxLength = parseInt(input.attr('maxlength')) || 1000;
            if ( ( (value + 1) + '').length <= maxLength ) {
                input.val(value + 1);
            }
        });
    });

    pm.directive('[data-plenty="quantityInputButtonMinus"]', function(i, elem) {
        $(elem).click(function() {
            var input = $($(elem).closest('[data-plenty="quantityInputWrapper"]').find('input'));
            var value = parseInt( input.val() );
            if ( value > 1 ) {
                input.val(value - 1);
            }
        });
    });

    // Quantity Buttons in BasketView
    pm.directive('[data-basket-item-id] [data-plenty="quantityInputButtonPlus"], [data-basket-item-id] [data-plenty="quantityInputButtonMinus"]', function(i, button) {
        $(button).click(function() {

            var self = $(this);
            if( !!self.data('timeout') ) {
                window.clearTimeout( self.data('timeout') );
            }

            var timeout = window.setTimeout(function() {
                self.parents('[data-plenty="quantityInputWrapper"]').find('[data-plenty="quantityInput"]').trigger('change');
            }, 1000);

            self.data('timeout', timeout);

        });
    });

    pm.directive('[data-basket-item-id] [data-plenty="quantityInput"]', function(i, input, BasketService) {
        $(input).change( function() {

            var self = $(this);
            var newQuantity = parseInt( self.val() );
            var basketItemID = self.parents('[data-basket-item-id]').attr('data-basket-item-id');

            BasketService.setItemQuantity(
                basketItemID,
                newQuantity
            );
        });
    }, ['BasketService']);




}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // link non-anchor elements
    pm.directive('a[data-plenty-href]', function(i, elem, MediaSizeService) {
        $(elem).each(function() {
            var href = $(this).attr('href');
            var identifier = $(this).attr('data-plenty-href');

            $('[data-plenty-link="'+identifier+'"]').click(function() {
                if( MediaSizeService.interval() != 'xs' ) {
                    window.location.assign( href );
                }
            });
        });
    }, ['MediaSizeService']);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    // Toggle target content on click.
    // Can be bound on checked-/ unchecked-property of radio buttons
    pm.directive('[data-plenty-slidetoggle]', function(i, trigger) {

        var target = $( $(trigger).attr('data-plenty-target') );

        if( $(trigger).is('input[type="radio"]') ) {
            // is radio button
            var radioList = $('input[type="radio"][name="'+( $(trigger).attr('name') )+'"]');
            var visibleOnChecked = $(trigger).is('[data-plenty-slidetoggle="checked"]');
            $(radioList).change(function() {
                $(target).parents('[data-plenty-equal-target]').css('height', 'auto');

                if ( $(this).is(':checked') && $(this)[0] === $(trigger)[0] ) {
                    // checked
                    if ( visibleOnChecked == true ) {
                        $(target).slideDown(400, function() {
                            pm.getInstance().bindDirectives('[data-plenty-equal]');
                        });
                    } else {
                        $(target).slideUp(400, function() {
                            pm.getInstance().bindDirectives('[data-plenty-equal]');
                        });
                    }
                }
                else {
                    // unchecked (since other radio button has been checked)
                    if ( visibleOnChecked == true ) {
                        $(target).slideUp(400, function() {
                            pm.getInstance().bindDirectives('[data-plenty-equal]');
                        });
                    } else {
                        $(target).slideDown(400, function() {
                            pm.getInstance().bindDirectives('[data-plenty-equal]');
                        });
                    }
                }
            });
        } else {
            // is not radio button
            $(trigger).click(function() {
                $(target).parents('[data-plenty-equal-target]').css('height', 'auto');

                $(trigger).addClass('animating');
                $(target).slideToggle(400, function() {
                    $(trigger).removeClass('animating');
                    $(trigger).toggleClass('active');
                    pm.getInstance().bindDirectives('[data-plenty-equal]');
                });
            });
        }
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /*
     * Social Share Activation
     * Activate and load share-buttons manually by clicking a separate button
     * Usage / data-attributes:
     * <div data-plenty-social="twitter">
     * 	<span data-plenty="switch"></span>				Will be used to activate the service set in data-plenty-social=""
     *		<span data-plenty="placeholder"></span>		Will be replaced with loaded share button
     * </div>
     *
     * possible values for data-plenty-social:
     * "facebook-like"			: Load Facebooks "Like"-Button
     * "facebook-recommend"		: Load Facebooks "Recommend"-Button
     * "twitter"				: Load Twitter Button
     * "google-plus"			: Load google "+1"-Button
     *
     * Additional Tooltips
     * You can extend the parent element with a (bootstrap) tooltip by adding data-toggle="tooltip" and title="TOOLTIP CONTENT"
     * Tooltip will be destroyed after activating a social service
     * (!) Requires bootstrap.js
     */
    pm.directive('[data-plenty-social]', function(i, elem, SocialShareService) {

        var toggle = $(elem).find('[data-plenty="switch"]');

        // append container to put / delete service.html
        $(elem).append('<div class="social-container"></div>');

        // add "off" class to switch, if neither "off" or "on" is set
        if ( !toggle.hasClass('off') && !toggle.hasClass('on') ) {
            toggle.addClass('off');
        }

        // toggle switch
        toggle.on('click', function() {
            if ( toggle.hasClass('off') ) {
                if ( $(elem).attr("data-toggle") == "tooltip" ) { $(elem).tooltip('destroy') };
                toggle.removeClass('off').addClass('on');
                // hide dummy button
                $(elem).find('[data-plenty="placeholder"]').hide();
                // load HTML defined in 'api'
                $(elem).find('.social-container').append( SocialShareService.getSocialService( $(elem).attr('data-plenty-social') ) );
            }
            // do not disable social medias after activation
            /*
             else
             {
             toggle.removeClass('on').addClass('off');
             // show dummy button
             $(elem).find('[data-plenty="placeholder"]').show();
             // remove api HTML
             $(elem).find('.social-container').html('');
             }
             */
        });
    }, ['SocialShareService']);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /* Tab Handling
     *
     * Show tab with jQuery-selector 'TAB_SELECTOR'
        <a data-plenty-opentab="TAB_SELECTOR">
     * (!) Requires bootstrap.js
     *
     * Show remote tab with jQuery-selector 'TAB_1' in target container (below)
        <span data-plenty-openremotetab="TAB_1">
     *
     */
    pm.directive('a[data-plenty-opentab]', function(i, elem) {
        // open tab
        $(elem).click(function() {
            var tabSelector = $(this).attr('data-plenty-opentab');
            tabSelector = ( tabSelector == 'href' ) ? $(this).attr('href') : tabSelector;
            $(tabSelector).tab('show');
        });
    });

    pm.directive('[data-plenty-openremotetab]', function(i, elem) {
        // open remote tab{
        $(elem).click(function () {
            var tabSelector = $(this).attr('data-plenty-openremotetab');
            $(tabSelector).trigger('tabchange');
        });
    });

    /*
     * Remote tabs
     * tab content can be placed anywhere in body
     *
     * Content of remote tab
         <div data-plenty-labelledby="TAB_1" data-plenty-remotetabs-id="REMOTE_TAB_GROUP">
            <!-- Content of TAB_1 -->
         </div>
     *
     * Remote tab navigation
     * [...]
         <div data-plenty="remoteTabs" data-plenty-remotetabs-id="REMOTE_TAB_GROUP">
             <ul>
                 <li class="active">
                     <a data-plenty-tab-id="TAB_1">
                        <!-- Title of TAB_1 -->
                     </a>
                 </li>
                 <li>
                     <a data-plenty-tab-id="TAB_2">
                        <!-- Titel of TAB_2 -->
                     </a>
                 </li>
             </ul>
         </div>
     *
     */
    pm.directive('[data-plenty="remoteTabs"]', function(i, remoteTab) {

        var tabsId = $(remoteTab).attr('data-plenty-remotetabs-id');

        // find tabs grouped by remotetabs-id
        $('[data-plenty="remoteTabs"][data-plenty-remotetabs-id="'+tabsId+'"]').each(function(i, tabs) {

            // bind each remote-tab
            $(tabs).find('a').each(function(i, singleTab) {

                var singleTabId = $(singleTab).attr('data-plenty-tab-id');

                // listen to 'tabchange' event
                $(singleTab).on('tabchange', function() {
                    // toggle class 'active'
                    $(singleTab).closest('[data-plenty="remoteTabs"]').children('.active').removeClass('active');
                    $(singleTab).closest('li').addClass('active');

                    // hide inactive tabs & show active tab
                    var tabpanelsInactive = $('[data-plenty-remotetabs-id="'+tabsId+'"][data-plenty-tabpanel-labelledby]').not('[data-plenty-tabpanel-labelledby="'+singleTabId+'"]');
                    var tabpanelActive = $('[data-plenty-remotetabs-id="'+tabsId+'"][data-plenty-tabpanel-labelledby="'+singleTabId+'"]');
                    var zIndexTabpanelParents = 0;
                    if ( $(tabs).attr('data-plenty-remotetabs-adapt') == 'tabpanel-parent' ) {
                        zIndexTabpanelParents = 2147483646;
                        $('[data-plenty-remotetabs-id="'+tabsId+'"][data-plenty-tabpanel-labelledby]').parent().each(function() {
                            var zIndexCurrent = parseInt( $(this).css('zIndex') );
                            if ( typeof zIndexCurrent == 'number' && zIndexCurrent < zIndexTabpanelParents ) zIndexTabpanelParents = zIndexCurrent;
                        });
                    }

                    // adjust z-index if neccessary
                    $(tabpanelsInactive).hide().removeClass('in');
                    $(tabpanelActive).show().addClass('in');
                    if ( zIndexTabpanelParents != 0 ) {
                        $(tabpanelsInactive).parent().css('zIndex', zIndexTabpanelParents);
                        $(tabpanelActive).parent().css('zIndex', zIndexTabpanelParents + 1);
                    }
                });
            });
        });

        // trigger 'tabchange' event
        $(remoteTab).find('a').click(function() {
            $(this).trigger('tabchange');
        });
    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    pm.directive('[data-plenty="toTop"]', function(i, elem) {
        $(elem).click(function() {
            $('html, body').animate({
                scrollTop: 0
            }, 400);
            return false;
        });

        var positionToTopButton = function() {
            if( $(document).scrollTop() > 100 ) {
                $(elem).addClass('visible');
            } else {
                $(elem).removeClass('visible');
            }
        };

        $(window).on("scroll resize", function() {
            positionToTopButton();
        });

    });

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /*
     * Toggle Class
     * toggle style-classes on click
     * Usage / data-attribute:
     * <div data-plenty-toggle="{target: 'body', class: 'toggledClass', media: 'xs sm'}"></div>
     * target	:	jQuery selector to toggle the class at.
     * class		:  class(es) to toggle at target element
     * media		:  only toggle class on given media sizes (optional)
     *
     * (!) using data-plenty-toggle on <a>-elements will prevent redirecting to href=""
     */
    pm.directive('[data-plenty-toggle]', function(i, elem, MediaSizeService) {
        if( $(elem).attr('data-plenty-toggle').search(';') < 0 ) {
            eval('var data = ' + $(elem).attr('data-plenty-toggle'));
            if ( data.target && data.class ) {
                $(elem).click(function() {
                    var isMedia = false;
                    if ( data.media ) {
                        if ( data.media.indexOf(' ') != -1 ) {
                            var mediaArr = data.media.split(' ');
                            for ( i = 0; i < mediaArr.length; i++ ) {
                                if ( MediaSizeService.interval() == mediaArr[i] ) {
                                    isMedia = true;
                                }
                            }
                        }
                        else {
                            if ( MediaSizeService.interval() == data.media ) isMedia = true;
                        }
                    }
                    if ( ! data.media || isMedia == true  ) {
                        $(data.target).toggleClass(data.class);
                        if ( $(elem).is('a') ) return false;
                    }
                });
            }
        }
    }, ['MediaSizeService']);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

(function($, pm) {

    /*
     * Form Validation
     * Validate required form inputs as given type of value
     * Usage / data-Attributes:
     * <form data-plenty-checkform="ERROR_CLASS">		This will activate the script for this form
     *													and add ERROR_CLASS to invalid elements
     *
     * <input data-plenty-validate="text">				Check if the value of this input is text (or number) and add ERROR_CLASS on failure
     * <div data-plenty-validate="text"><input></div>	You can put the data-plenty-validate="" on a parent element of an input.
     *													This will check the value of the input(s) inside and add ERROR_CLASS to the <div> on failure

     *	possible values for data-plenty-validate=""		text	: validate if value is text (or number or mixed)
     *													mail	: checks if value is a valid mail-address (not depending on inputs type-attribute)
     *													number: checks if value is a numeric value. For detailed information see: isNumberic()
     *													{min: 1, max: 3} validate that at least 'min' and maximum 'max' options are selected (checkboxes)
     *
     * possible form elements to validate				<input type="text | mail | password">
     * 													<textarea></textarea>					can validate "text", "mail", "number"
     *													<input type="radio" name="myRadio"> 	check if one radio-button in group "myRadio" is checked.
     *																							Ignores the value of data-plenty-validate
     *													<input type="checkbox" name="myCheck">	check if one checkbox in group "myCheck" is checked or use
     *																							data-plenty-valudate="{min: 3, max: 5}" to define custom range
     *													<select></select>						check if an option is selected and otions value is not "-1" (plenty default for: "choose"-option)
     *
     * Events:
     * 'validationFailed'								will be triggered if at least one element is not valid.
     *													Usage:
     *													form.on('validationFailed', function(event, invalidFields) {
     *	 													$(invalidFields).each({
     *															// manipulate invalid fields
     *														});
     *													});
     */
    pm.directive('form[data-plenty-checkform], form.PlentySubmitForm', function(i, elem, ValidationService) {

        $(elem).submit(function() {
            return ValidationService.validate( elem );
        });

    }, ['ValidationService']);

}(jQuery, PlentyFramework));
/**
 * Licensed under AGPL v3
 * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)
 * =====================================================================================
 * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)
 * @author      Felix Dausch <felix.dausch@plentymarkets.com>
 * =====================================================================================
 */

PlentyFramework.compile();

// Create global instance of PlentyFramework for usage in Webshop-Layouts
var plenty = PlentyFramework.getInstance();

/*
 * initially bind all registered directives
 *
 * will not be tested. reasons:
 * http://stackoverflow.com/questions/29153733/how-to-unit-test-a-document-ready-function-using-jasmine
  */
jQuery(document).ready(function() {
    plenty.bindDirectives();
});