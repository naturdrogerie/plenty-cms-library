var TemplateCache = {};

TemplateCache["error/errorMessage.html"] = "<div class=\"plentyErrorBoxContent\" data-plenty-error-code=\"{{code}}\">\n" +
   "    <span class=\"PlentyErrorCode\">Code {{code}}:</span>\n" +
   "    <span class=\"PlentyErrorMsg\">{{{message}}}</span>\n" +
   "</div>\n" +
   "";

TemplateCache["error/errorPopup.html"] = "<div class=\"plentyErrorBox\" id=\"CheckoutErrorPane\">\n" +
   "    <button class=\"close\" type=\"button\"><span aria-hidden=\"true\">×</span>\n" +
   "        <span class=\"sr-only\">Close</span>\n" +
   "    </button>\n" +
   "    <div class=\"plentyErrorBoxInner\">\n" +
   "    </div>\n" +
   "</div>\n" +
   "";

TemplateCache["modal/modal.html"] = "<div class=\"reveal-modal medium\" data-reveal aria-labelledby=\"modalTitle{{uid}}\" aria-hidden=\"true\" role=\"dialog\">\n" +
   "    {{#title}}\n" +
   "    <h2 id=\"modalTitle{{uid}}\">{{{title}}}</h2>\n" +
   "    {{/title}}\n" +
   "\n" +
   "    {{{content}}}\n" +
   "\n" +
   "    {{#labelDismiss}}\n" +
   "    <button type=\"button\" class=\"button secondary close-reveal-modal\">{{labelDismiss}}</button>\n" +
   "    {{/labelDismiss}}\n" +
   "\n" +
   "    <button type=\"button\" class=\"button close-reveal-modal\" data-plenty-modal=\"confirm\">{{labelConfirm}}</button>\n" +
   "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
   "</div>\n" +
   "";

TemplateCache["waitscreen/waitscreen.html"] = "<div id=\"PlentyWaitScreen\" class=\"overlay overlay-wait\"></div>";
