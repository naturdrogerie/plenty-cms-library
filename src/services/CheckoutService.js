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
(function( $, pm )
{

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
    pm.service( 'CheckoutService', function( API, UI, CMS, Checkout, Modal )
    {

        return {
            init                  : init,
            setCustomerSignAndInfo: setCustomerSignAndInfo,
            registerGuest         : registerGuest,
            setShippingProfile    : setShippingProfile,
            saveShippingAddress   : saveShippingAddress,
            loadAddressSuggestion : loadAddressSuggestion,
            preparePayment        : preparePayment,
            setMethodOfPayment    : setMethodOfPayment,
            confirmAtrigaPaymax   : confirmAtrigaPaymax,
            editBankDetails       : editBankDetails,
            editCreditCard        : editCreditCard,
            placeOrder            : placeOrder
        };

        /**
         * Load checkout data initially on page load
         * @function init
         */
        function init()
        {
            Checkout.loadCheckout( true );
        }

        /**
         * Read customer sign and order information text from &lt;form> marked with
         * <b>data-plenty-checkout-form="details"</b> and update checkout.
         * @function setCustomerSignAndInfo
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function setCustomerSignAndInfo()
        {
            var form   = $( '[data-plenty-checkout-form="details"]' );
            var values = form.getFormValues();

            // initialize CustomerSign & InfoText to avoid updating empty values
            if ( !Checkout.getCheckout().CheckoutCustomerSign )
            {
                Checkout.getCheckout().CheckoutCustomerSign = "";
            }
            if ( !Checkout.getCheckout().CheckoutOrderInfoText )
            {
                Checkout.getCheckout().CheckoutOrderInfoText = "";
            }

            if ( ( Checkout.getCheckout().CheckoutCustomerSign !== values.CustomerSign && $( form ).find( '[name="CustomerSign"]' ).length > 0 )
                || ( Checkout.getCheckout().CheckoutOrderInfoText !== values.OrderInfoText && $( form ).find( '[name="OrderInfoText"]' ).length > 0 ) )
            {

                Checkout.getCheckout().CheckoutCustomerSign  = values.CustomerSign;
                Checkout.getCheckout().CheckoutOrderInfoText = values.OrderInfoText;

                return Checkout.setCheckout();

            }
            else
            {
                // No changes detected -> Do nothing
                return API.idle();
            }
        }

        /**
         * Read address data from &lt;form> marked with <b>data-plenty-checkout-form="shippingAddress"</b>.
         * Create new shipping address or update the shipping address ID.
         * @function saveShippingAddress
         * @param {boolean} [validateForm = false] validate form before processing requests
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function saveShippingAddress( validateForm )
        {
            var form = $( '[data-plenty-checkout-form="shippingAddress"]' );

            if ( !validateForm && !form.validateForm() )
            {
                return false;
            }

            if ( !validateForm && !pm.getInstance().AddressDoctorService.validateAddress( form ) )
            {
                return false;
            }

            var values            = form.getFormValues();
            var shippingAddressID = $( '[name="shippingAddressID"]:checked' ).val();

            form.foundation('reveal', 'close');

            if ( shippingAddressID < 0 )
            {
                // save separate
                var shippingAddress = values;

                if ( !addressesAreEqual( shippingAddress, Checkout.getCheckout().CustomerShippingAddress ) )
                {
                    if ( shippingAddress.Street == "PACKSTATION" )
                    {
                        shippingAddress.IsPackstation = 1;
                        shippingAddress.PackstationNo = shippingAddress.HouseNo;
                    }
                    else if ( shippingAddress.Street == "POSTFILIALE" )
                    {
                        shippingAddress.IsPostfiliale = 1;
                        shippingAddress.PostfilialNo  = shippingAddress.HouseNo;
                    }

                    // new shipping address
                    return API.post( "/rest/checkout/customershippingaddress/", shippingAddress )
                        .done( function( response )
                        {

                            Checkout.getCheckout().CheckoutCustomerShippingAddressID = response.data.ID;
                            Checkout.getCheckout().CheckoutShippingCountryID         = response.data.CountryID;

                            updatePaymentAndShippingDependencies();
                        } );
                }
                else
                {
                    // no changes detected
                    return API.idle();
                }

            }
            else
            {
                if ( shippingAddressID != Checkout.getCheckout().CheckoutCustomerShippingAddressID )
                {
                    // change shipping address id
                    Checkout.getCheckout().CheckoutCustomerShippingAddressID = shippingAddressID;

                    updatePaymentAndShippingDependencies();
                }
                else
                {
                    return API.idle();
                }
            }
        }

        function updatePaymentAndShippingDependencies()
        {
            delete Checkout.getCheckout().CheckoutMethodOfPaymentID;
            delete Checkout.getCheckout().CheckoutShippingProfileID;

            return Checkout.setCheckout().done( function()
            {
                Checkout.reloadContainer( "MethodsOfPaymentList" );
                Checkout.reloadContainer( "ShippingProfilesList" );

                if ( Checkout.getCheckout().CustomerInvoiceAddress.LoginType == 2 )
                {
                    Checkout.reloadContainer( 'CustomerShippingAddress' );
                }
                $( '#shippingAdressSelect' ).modal( 'hide' );

                // don't hit me. Ugly hack: this is to force quit/remove everything from modal.
                if ( $( ".modal-backdrop" ) )
                {
                    $( ".modal-backdrop" ).remove();
                }
            } );
        }

        /**
         * Prepare address-data to register a guest. Reads the address-data from a &lt;form> marked with
         * <b>data-plenty-checkout-form="guestRegistration"</b>
         * @function registerGuest
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function registerGuest()
        {
            var form = $( '[data-plenty-checkout-form="guestRegistration"]' );

            var invoiceAddress       = form.getFormValues();
            var customProp           = $( form ).find( "[id^='plentyCustomerProperty']" );
            invoiceAddress.LoginType = 1;

            // add custom properties if necessary.
            if ( invoiceAddress.checkout
                && invoiceAddress.checkout.customerInvoiceAddress
                && invoiceAddress.checkout.customerInvoiceAddress.CustomerProperty )
            {
                var tmpProperties                     = invoiceAddress.checkout.customerInvoiceAddress.CustomerProperty;
                invoiceAddress.CustomerPropertiesList = invoiceAddress.CustomerPropertiesList || [];

                for ( var property in tmpProperties )
                {
                    if ( tmpProperties[property] )
                    {
                        invoiceAddress.CustomerPropertiesList.push( {
                            PropertyID   : property,
                            PropertyValue: tmpProperties[property]
                        } );
                    }
                }
            }
            else if ( customProp.length > 0 )
            {
                invoiceAddress.CustomerPropertiesList = [];
                for ( var i = customProp.length - 1; i >= 0; i-- )
                {
                    var $tmpEl = $( customProp[i] );
                    invoiceAddress.CustomerPropertiesList.push(
                        {
                            PropertyID   : $tmpEl.attr( "data-plenty-property-id" ),
                            PropertyValue: $tmpEl.val()
                        } );
                }
            }

            if ( !addressesAreEqual( invoiceAddress, Checkout.getCheckout().CustomerInvoiceAddress ) )
            {
                return API.post( "/rest/checkout/customerinvoiceaddress/", invoiceAddress )
                    .done( function( response )
                    {
                        saveShippingAddress().done( Checkout.loadCheckout );
                    } );
            }
            else
            {
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
        function addressesAreEqual( address1, address2 )
        {
            for ( var key in address1 )
            {
                if ( address1[key] + '' !== address2[key] + '' && key !== 'EmailRepeat' )
                {
                    return false;
                }
            }
            return true;
        }

        /**
         * Set the shipping profile used for this order and update checkout. Selected shipping profile will be
         * read from &lt;form> marked with <b>data-plenty-checkout-form="shippingProfileSelect"</b>
         * @function setShippingProfile
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function setShippingProfile()
        {

            var values = $( '[data-plenty-checkout-form="shippingProfileSelect"]' ).getFormValues();

            Checkout.getCheckout().CheckoutShippingProfileID = values.ShippingProfileID;
            delete Checkout.getCheckout().CheckoutCustomerShippingAddressID;
            delete Checkout.getCheckout().CheckoutMethodOfPaymentID;

            return Checkout.setCheckout()
                .done( function()
                {
                    Checkout.reloadContainer( 'MethodsOfPaymentList' );
                } );

        }

        /**
         * Prepare method of payment to check if external checkout is used or addition content should be displayed
         * @function preparePayment
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function preparePayment()
        {
            var paymentID   = Checkout.getCheckout().CheckoutMethodOfPaymentID;
            var paymentData = $( 'input[type="radio"][name="MethodOfPaymentID"][value="' + paymentID + '"]' ).parent().getFormValues();
            return API.post( "/rest/checkout/preparepayment/", paymentData, true )
                .done( function( response )
                {
                    if ( response.data.CheckoutMethodOfPaymentRedirectURL != '' )
                    {

                        document.location.assign( response.data.CheckoutMethodOfPaymentRedirectURL );

                    }
                    else if ( !!response.data.CheckoutMethodOfPaymentAdditionalContent )
                    {

                        var isBankDetails = $( response.data.CheckoutMethodOfPaymentAdditionalContent ).find( '[data-plenty-checkout-form="bankDetails"]' ).length > 0;
                        Modal.prepare()
                            .setContent( response.data.CheckoutMethodOfPaymentAdditionalContent )
                            .onConfirm( function()
                            {
                                if ( isBankDetails )
                                {
                                    return saveBankDetails();
                                }
                                else
                                {
                                    return saveCreditCard();
                                }
                            } )
                            .show();
                    }
                } )
                .fail( function( jqXHR )
                {
                    try
                    {
                        var response = $.parseJSON( jqXHR.responseText );

                        var errorStack = [];
                        for ( var i = 0; i < response.error.error_stack.length; i++ )
                        {
                            if ( response.error.error_stack[i].code == 651 )
                            {
                                // notify atriga validation errors
                                Checkout.reloadContainer( 'MethodsOfPaymentList' ).done( function()
                                {
                                    $( document ).trigger( 'plenty.AtrigaValidationFailed' );
                                } );
                            }
                            else
                            {
                                errorStack.push( response.error.error_stack[i] );
                            }
                        }

                        // display remaining errors
                        if ( errorStack.length > 0 )
                        {
                            UI.printErrors( errorStack );
                        }
                    }
                    catch ( e )
                    {
                        UI.throwError( jqXHR.status, jqXHR.statusText );
                    }
                } );

        }

        /**
         * Set the method of payment used for this order.
         * @function setMethodOfPayment
         * @param {number|undefined} paymentID  ID of the method of payment to use. Read from &lt;form> marked with
         *                                      <b>data-plenty-checkout-form="methodOfPayment"</b> if unset.
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function setMethodOfPayment( paymentID )
        {
            /*
             var methodsOfPaymentList = Checkout.getCheckout().MethodsOfPaymentList;
             var methodOfPayment;
             for( var i = 0; i < methodsOfPaymentList.length; i++ )
             {
             if( methodsOfPaymentList[i].MethodOfPaymentID == paymentID )
             {
             methodOfPayment = methodsOfPaymentList[i];
             break;
             }
             }
             */

            if ( !paymentID )
            {
                // FIX for older callisto layouts (< 3.3): get payment id from input field
                paymentID = $( 'input[name="MethodOfPaymentID"]:checked' ).val();
            }

            Checkout.getCheckout().CheckoutMethodOfPaymentID = paymentID;

            // checking trusted shop
            if ( $( "#PlentyWebPaymentMethodTsBuyerProtection" ).length > 0 )
            {
                var $ts                                        = $( "#PlentyWebPaymentMethodTsBuyerProtection" );
                Checkout
                    .getCheckout()
                    .TrustedShopsBuyerProtectionItem
                    .TrustedShopsBuyerProtectionItemIsSelected = $ts.is( ":checked" );
            }

            // checking for atriga
            if ( !pm.getGlobal( 'Checkout.AtrigaRequireUserConfirmation' ) )
            {
                Checkout.getCheckout().CheckoutAtrigapaymaxChecked = true;
            }

            delete Checkout.getCheckout().CheckoutCustomerShippingAddressID;
            delete Checkout.getCheckout().CheckoutShippingProfileID;

            return Checkout.setCheckout()
                .done( function()
                {
                    Checkout.reloadContainer( 'ShippingProfilesList' );
                } );
        }

        function confirmAtrigaPaymax( atrigaPaymaxChecked )
        {
            Checkout.getCheckout().CheckoutAtrigapaymaxChecked = !!atrigaPaymaxChecked;
            return API.put( '/rest/checkout', {
                CheckoutAtrigapaymaxChecked: !!atrigaPaymaxChecked
            } );
            //return Checkout.setCheckout();
        }

        /**
         * Display the popup to enter or edit customers bank details
         * @function editBankDetails
         */
        function editBankDetails()
        {

            CMS.getContainer( 'CheckoutPaymentInformationBankDetails' ).from( 'Checkout' )
                .done( function( response )
                {
                    Modal.prepare()
                        .setContent( response.data[0] )
                        .onDismiss( function()
                        {
                            $( 'input[name="MethodOfPaymentID"]' ).each( function( i, radio )
                            {
                                if ( $( radio ).val() == Checkout.getCheckout().CheckoutMethodOfPaymentID )
                                {
                                    $( radio ).attr( 'checked', 'checked' );
                                }
                                else
                                {
                                    $( radio ).removeAttr( 'checked' );
                                }
                            } );
                        } ).onConfirm( function()
                    {
                        return saveBankDetails();
                    } )
                        .show();
                } );

        }

        /**
         * Read entered bank details from <b>data-plenty-checkout-form="bankDetails"</b> and update checkout.
         * @function saveBankDetails
         * @private
         * @return {boolean} the result of form validation
         */
        function saveBankDetails()
        {
            var form = $( '[data-plenty-checkout-form="bankDetails"]' );

            if ( form.validateForm() )
            {
                var values = form.getFormValues().checkout.customerBankDetails;

                var bankDetails = {
                    CustomerBankName     : values.bankName,
                    CustomerBLZ          : values.blz,
                    CustomerAccountNumber: values.accountNo,
                    CustomerAccountOwner : values.accountOwner,
                    CustomerIBAN         : values.iban,
                    CustomerBIC          : values.bic
                };

                API.post( "/rest/checkout/paymentinformationbankdetails/", bankDetails )
                    .done( function()
                    {
                        Checkout.loadCheckout().done( function()
                        {
                            setMethodOfPayment( 3 );
                            Checkout.reloadContainer( 'MethodsOfPaymentList' );
                        } );
                    } );
                return true;
            }
            else
            {
                return false;
            }
        }

        /**
         * Display a popup containing credit card form
         * @function editCreditCard
         */
        function editCreditCard()
        {

            CMS.getContainer( 'CheckoutPaymentInformationCreditCard' ).from( 'Checkout' )
                .done( function( response )
                {
                    Modal.prepare()
                        .setContent( response.data[0] )
                        .onDismiss( function()
                        {
                            $( 'input[name="MethodOfPaymentID"]' ).each( function( i, radio )
                            {
                                if ( $( radio ).val() == Checkout.getCheckout().CheckoutMethodOfPaymentID )
                                {
                                    $( radio ).attr( 'checked', 'checked' );
                                }
                                else
                                {
                                    $( radio ).removeAttr( 'checked' );
                                }
                            } );
                        } ).onConfirm( function()
                    {
                        return saveCreditCard();
                    } )
                        .show();
                } );
        }

        /**
         * Read values from &lt;form> marked with <b>data-plenty-checkout-form="creditCard"</b> and update checkout.
         * @function saveCreditCard
         * @private
         * @return {boolean} the result of form validation
         */
        function saveCreditCard()
        {
            var form = $( '[data-plenty-checkout-form="creditCard"]' );

            if ( form.validateForm() )
            {

                var values = form.getFormValues().checkout.paymentInformationCC;

                var creditCard = {
                    Owner   : values.owner,
                    Cvv2    : values.cvv2,
                    Number  : values.number,
                    Year    : values.year,
                    Month   : values.month,
                    Provider: values.provider
                };

                API.post( '/rest/checkout/paymentinformationcreditcard/', creditCard )
                    .done( function()
                    {
                        Checkout.loadCheckout();
                    } );
                return true;
            }
            else
            {
                return false;
            }
        }

        /**
         * Display a popup containing address suggestions
         * @param {string} type
         */
        function loadAddressSuggestion( type )
        {

            //check login type
            if ( Checkout.getCheckout().CustomerInvoiceAddress.LoginType == 2 )
            {
                var values = $( '[data-plenty-checkout-form="shippingAddress"]' ).getFormValues();
            }
            else
            {
                var values = $( '[data-plenty-checkout-form="guestRegistration"]' ).getFormValues();
            }

            var params = {
                street        : values.Street,
                houseNo       : values.HouseNo,
                ZIP           : values.ZIP,
                city          : values.City,
                postnummer    : values.Postnummer,
                suggestionType: 'postfinder'
            };

            CMS.getContainer( 'CheckoutAddressSuggestionResultsList', params ).from( 'Checkout' )
                .done( function( response )
                {
                    Modal.prepare()
                        .setContent( response.data[0] )
                        .show();
                } );
        }

        /**
         * Place the order prepared before and finish the checkout process.<br>
         * Validate required checkboxes in <b>data-plenty-checkout-form="placeOrder"</b>
         * @function placeOrder
         * @return {object} <a href="http://api.jquery.com/category/deferred-object/" target="_blank">jQuery deferred
         *     Object</a>
         */
        function placeOrder()
        {
            var form = $( '[data-plenty-checkout-form="placeOrder"]' );
            if ( form.validateForm() )
            {

                var values = form.getFormValues();

                // if not shown in layout set default 1 for mandatory fields
                var params = {
                    TermsAndConditionsCheck      : values.termsAndConditionsCheck || 0,
                    WithdrawalCheck              : values.withdrawalCheck || 0,
                    PrivacyPolicyCheck           : values.privacyPolicyCheck || 0,
                    AgeRestrictionCheck          : values.ageRestrictionCheck || 0,
                    NewsletterCheck              : values.newsletterCheck || 0,
                    KlarnaTermsAndConditionsCheck: values.klarnaTermsAndConditionsCheck || 0,
                    PayoneDirectDebitMandateCheck: values.payoneDirectDebitMandateCheck || 0,
                    PayoneInvoiceCheck           : values.payoneInvoiceCheck || 0
                };

                return API.post( "/rest/checkout/placeorder/", params )
                    .done( function( response )
                    {
                        if ( response.data.MethodOfPaymentRedirectURL != '' )
                        {

                            window.location.assign( response.data.MethodOfPaymentRedirectURL );

                        }
                        else if ( response.data.MethodOfPaymentAdditionalContent != '' )
                        {
                            /*  This is a PayOne fallback. PayOne has its own confirm button.
                             To prevent a modal with multiple buttons and different functionality,
                             we have to check of following MethodOfPaymentIDs and set Our confirm button
                             only if necessary.
                             */
                            var confirmLabel       = pm.translate( "Confirm" );
                            var paymentIdsToHandle = [3010, 3020, 3080];
                            if ( paymentIdsToHandle.indexOf( response.data.MethodOfPaymentID ) >= 0 && response.data.MethodOfPaymentAdditionalContent.indexOf('button_nextPaymentProviderPayoneCreditCheckButton') > -1 )
                            {
                                confirmLabel = '';
                            }

                            Modal.prepare()
                                .setContent( response.data.MethodOfPaymentAdditionalContent )
                                .setLabelDismiss( '' )
                                .setLabelConfirm( confirmLabel )
                                .setStatic( confirmLabel === '' )
                                .onDismiss( function()
                                {
                                    window.location.assign( form.attr( 'action' ) );
                                } )
                                .onConfirm( function()
                                {
                                    window.location.assign( form.attr( 'action' ) );
                                } )
                                .show();

                        }
                        else
                        {

                            window.location.assign( form.attr( 'action' ) );

                        }
                    } );
            }
        }

    }, ['APIFactory', 'UIFactory', 'CMSFactory', 'CheckoutFactory', 'ModalFactory'] );
}( jQuery, PlentyFramework ));
