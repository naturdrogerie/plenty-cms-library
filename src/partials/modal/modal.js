(function($, pm) {

    pm.partials.Modal = {
        init: function ( element, modal ) {
            element.on('closed.fndtn.reveal', '[data-reveal]', function () {
                hide();
            });

            bsModal.foundation('reveal', 'open');

            bsModal.on('closed.fndtn.reveal', '[data-reveal]', function () {
                bsModal.remove();
            });

            if( modal.timeout > 0 ) {
                startTimeout();
                element.on('close.fndtn.reveal', '[data-reveal]', stopTimeout);
                element.hover(modal.pauseTimeout, function() {
                    if( element.is('.open') )
                    {
                        modal.continueTimeout();
                    }
                });
            }
        },

        show: function ( element ) {
            element.modal( 'show' );
        },

        hide: function ( element ) {
            //$('#second-modal').foundation('reveal', 'close');
            element.modal('hide');
        },

        isModal: function ( html ) {
            return $(html).filter('.reveal-modal' ).length + $(html).find('.reveal-modal' ).length > 0;
        },

        getModal: function ( html ) {
            var modal = $( html );
            if ( modal.length > 1 ) {
                modal = $( html ).filter( '.reveal-modal' ) || $( html ).find( '.reveal-modal' );
            }

            return modal;
        }
    };

}(jQuery, PlentyFramework));
