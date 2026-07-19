sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "com/sap/grc/sapgrcaccessmanagement/util/FormConfigService",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, FormConfigService, Controller, JSONModel) => {
    "use strict";

    /**
     * Controller for read-only metadata configuration preview.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Settings", {
        formatter,

        /**
         * Loads dynamic form configuration into a preview tree model.
         * @returns {void}
         */
        onInit() {
            const oFormConfigModel = this.getOwnerComponent().getModel("formConfig");

            oFormConfigModel.dataLoaded().then(() => {
                const aConfigTree = FormConfigService.buildConfigTree(oFormConfigModel.getData());
                this.getView().setModel(new JSONModel(aConfigTree), "configTree");
            });
        }
    });
});
