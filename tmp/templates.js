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

TemplateCache["addressSuggestions/postFinder.html"] = "{{#addresses}}\n" +
   "<div class=\"row\">\n" +
   "    <div class=\"small-12 columns\">\n" +
   "        <label class=\"address-select\">\n" +
   "            <input type=\"radio\" value=\"{{index}}\" name=\"postfinder\">\n" +
   "		<span class=\"lh-075 address-box-inner\">\n" +
   "\n" +
   "			<span class=\"row\">\n" +
   "				<span class=\"medium-6 small-12 columns\">\n" +
   "					<span class=\"block bold\">{{type}} {{number}}</span>\n" +
   "					<span class=\"block\">{{street}} {{houseNo}}</span>\n" +
   "					<span class=\"block\">{{zip}} {{city}}</span>\n" +
   "				</span>\n" +
   "\n" +
   "				<span class=\"medium-6 small-12 columns\">\n" +
   "					<span class=\"block bold\"><span>{{distance}} {{dimension}}</span></span>\n" +
   "					<span class=\"block\">{{remark}}</span>\n" +
   "				</span>\n" +
   "\n" +
   "			</span>\n" +
   "\n" +
   "		</span>\n" +
   "        </label>\n" +
   "    </div>\n" +
   "</div>\n" +
   "{{/addresses}}\n" +
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
   "    <button type=\"button\" class=\"button right\" data-dismiss=\"modal\" data-plenty-modal=\"confirm\">{{labelConfirm}}</button>\n" +
   "    {{#labelDismiss}}\n" +
   "    <button type=\"button\" class=\"button info\" data-dismiss=\"modal\">{{labelDismiss}}</button>\n" +
   "    {{/labelDismiss}}\n" +
   "    <a class=\"close-reveal-modal\" aria-label=\"{{#translate}}Close{{/translate}}\">&#215;</a>\n" +
   "</div>\n" +
   "";

TemplateCache["waitscreen/waitscreen.html"] = "<div id=\"PlentyWaitScreen\" class=\"overlay overlay-wait\"></div>";
