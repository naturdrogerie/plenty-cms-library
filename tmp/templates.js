var TemplateCache = {};

TemplateCache["error/errorMessage.html"] = "<div class=\"plentyErrorBoxContent\" data-plenty-error-code=\"{{code}}\">\n" +
   "    <span class=\"PlentyErrorCode\">Code {{code}}:</span>\n" +
   "    <span class=\"PlentyErrorMsg\">{{{message}}}</span>\n" +
   "</div>\n" +
   "";

TemplateCache["error/errorPopup.html"] = "<div data-alert class=\"alert-box alert radius plentyErrorBox\" id=\"CheckoutErrorPane\">\n" +
   "  <div class=\"plentyErrorBoxInner\">\n" +
   "  </div>\n" +
   "  <button tabindex=\"0\" class=\"close\" aria-label=\"{{#translate}}Close{{/translate}}\">&times;</button>\n" +
   "</div>\n" +
   "";

TemplateCache["modal/modal.html"] = "<div class=\"reveal-modal medium\" data-reveal aria-labelledby=\"modalTitle{{uid}}\" aria-hidden=\"true\" role=\"dialog\">\n" +
   "    {{#title}}\n" +
   "    <h2 id=\"modalTitle{{uid}}\">{{{title}}}</h2>\n" +
   "    {{/title}}\n" +
   "\n" +
   "    {{{content}}}\n" +
   "\n" +
   "    <button type=\"button\" class=\"button right\" data-dismiss=\"modal\" data-plenty-modal=\"confirm\">{{labelConfirm}}</button>\n" +
   "    {{#labelDismiss}}\n" +
   "    <button type=\"button\" class=\"button info\" data-dismiss=\"modal\">{{labelDismiss}}</button>\n" +
   "    {{/labelDismiss}}\n" +
   "    <a class=\"close-reveal-modal\" aria-label=\"{{#translate}}Close{{/translate}}\">&#215;</a>\n" +
   "</div>\n" +
   "";

TemplateCache["waitscreen/waitscreen.html"] = "<div id=\"PlentyWaitScreen\" class=\"overlay overlay-wait\"></div>";
