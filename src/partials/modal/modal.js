(function($, pm) {

    pm.partials.Modal = {

        /**
         * Will be called after a new modal was created and injected into DOM
         * @param {HTMLElement} element The injected modal element
         * @param {Modal} modal         The instance of the current modal
         */
        init: function ( element, modal ) {
            element.on('closed.fndtn.reveal', '[data-reveal]', function () {
                modal.hide();
            });

            if( modal.timeout > 0 ) {
                modal.startTimeout();
                element.on('close.fndtn.reveal', '[data-reveal]', modal.stopTimeout);
                element.hover(modal.pauseTimeout, function() {
                    modal.pauseTimeout();
                }, function () {
                    if( element.is('.open') )
                    {
                        modal.continueTimeout();
                    }
                });
            }
        },

        /**
         * Will be called if a Modal requests to show.
         * @param {HTMLElement} element The injected modal element
         */
        show: function ( element ) {
            element.foundation('reveal','open');
        },

        /**
         * Will be called if a Modal requests to hide.
         * @param {HTMLElement} element The injected modal element
         */
        hide: function ( element ) {
            element.foundation('reveal', 'close');
        },

        /**
         * Detect if a given HTML string contains a modal
         * @param {HTMLElement} html the element to search a modal in.
         * @returns {boolean}   true if a modal was found
         */
        isModal: function ( html ) {
            return $(html).filter('.reveal-modal' ).length + $(html).find('.reveal-modal' ).length > 0;
        },

        /**
         * Filter a modal from a given HTML string
         * @param {HTMLElement}     html the element to get a modal from.
         * @returns {HTMLElement}   the filtered modal element
         */
        getModal: function ( html ) {
            var modal = $( html );
            if ( modal.length > 1 ) {
                modal = $( html ).filter( '.reveal-modal' ) || $( html ).find( '.reveal-modal' );
            }

            return modal;
        }
    };

}(jQuery, PlentyFramework));
