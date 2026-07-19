sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "com/sap/grc/sapgrcaccessmanagement/model/models"
], (UIComponent, JSONModel, models) => {
    "use strict";

    const MOCK_MODELS = {
        accessRequests: "/accessRequests.json",
        dashboard: "/dashboard.json",
        formConfig: "/formConfig.json",
        notifications: "/notifications.json",
        riskRules: "/riskRules.json",
        roles: "/roles.json",
        users: "/users.json",
        workflow: "/workflow.json"
    };

    /**
     * Root UIComponent. Initializes device, mock data models, and routing.
     */
    return UIComponent.extend("com.sap.grc.sapgrcaccessmanagement.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        /**
         * Initializes component models and routing.
         * @returns {void}
         */
        init() {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this._initMockModels();
            this.getRouter().initialize();
        },

        /**
         * Registers all mock JSON models used by the prototype.
         * @returns {void}
         */
        _initMockModels() {
            const sBasePath = sap.ui.require.toUrl("com/sap/grc/sapgrcaccessmanagement/mockdata");

            Object.entries(MOCK_MODELS).forEach(([sModelName, sModelPath]) => {
                const oModel = new JSONModel(`${sBasePath}${sModelPath}`);
                oModel.setSizeLimit(1000);
                this.setModel(oModel, sModelName);
            });
        }
    });
});
