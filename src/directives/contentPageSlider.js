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
        $(elem).slick({
    			  lazyLoad: 'ondemand',
    			  slidesToScroll: 1,
    			  autoplay: true,
    			  autoplaySpeed: 10000,
    			  dots: true,
    			  speed: 400
  			});
    });

}(jQuery, PlentyFramework));
