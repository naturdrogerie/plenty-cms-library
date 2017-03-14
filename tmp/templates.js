var TemplateCache = {};

TemplateCache["addressSuggestions/addressDoctor.html"] = "<ul class=\"suggestion-list\">\n" +
   "    {{#values}}\n" +
   "    <li>\n" +
   "        <a href=\"javascript:void(0)\" data-address-value=\"{{.}}\">\n" +
   "            {{.}}\n" +
   "        </a>\n" +
   "    </li>\n" +
   "    {{/values}}\n" +
   "</ul>";

TemplateCache["addressSuggestions/postFinder.html"] = "<div class=\"scrollPane\">\n" +
   "{{#addresses}}\n" +
   "<label>\n" +
   "  <span class=\"row collapse\">\n" +
   "    <span class=\"columns small-1\">\n" +
   "      <input type=\"radio\" value=\"{{index}}\" name=\"postfinder\">\n" +
   "    </span>\n" +
   "    <span class=\"columns small-11\">\n" +
   "      <span class=\"row uncollapse\">\n" +
   "				<span class=\"medium-6 small-12 columns\">\n" +
   "					<strong>{{type}} {{number}}</strong><br>\n" +
   "					{{street}} {{houseNo}}<br>\n" +
   "					{{zip}} {{city}}<br><br>\n" +
   "				</span>\n" +
   "				<span class=\"medium-6 small-12 columns\">\n" +
   "					<strong>{{distance}} {{dimension}}</strong><br>\n" +
   "					{{remark}}<br><br>\n" +
   "				</span>\n" +
   "			</span>\n" +
   "    </span>\n" +
   "  </span>\n" +
   "</label>\n" +
   "{{/addresses}}\n" +
   "</div>\n" +
   "";

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

TemplateCache["modal/modal.html"] = "<div class=\"reveal-modal medium {{cssClass}}\" data-reveal aria-labelledby=\"modalTitle{{uid}}\" aria-hidden=\"true\" role=\"dialog\">\n" +
   "    {{#title}}\n" +
   "    <h2 id=\"modalTitle{{uid}}\">{{{title}}}</h2>\n" +
   "    {{/title}}\n" +
   "\n" +
   "    {{{content}}}\n" +
   "\n" +
   "    {{#labelConfirm}}\n" +
   "    <button type=\"button\" class=\"button right\" data-dismiss=\"modal\" data-plenty-modal=\"confirm\">{{labelConfirm}}</button>\n" +
   "    {{/labelConfirm}}\n" +
   "    {{#labelDismiss}}\n" +
   "    <button type=\"button\" class=\"button secondary\" data-dismiss=\"modal\">{{labelDismiss}}</button>\n" +
   "    {{/labelDismiss}}\n" +
   "    <a class=\"close-reveal-modal\" aria-label=\"{{#translate}}Close{{/translate}}\">&#215;</a>\n" +
   "</div>\n" +
   "";

TemplateCache["waitscreen/waitscreen.html"] = "<div id=\"PlentyWaitScreen\" class=\"overlay overlay-wait\"></div>";
