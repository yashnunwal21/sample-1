sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, MessageToast, Controller, JSONModel) => {
    "use strict";

    /**
     * Read-only role detail controller: TCodes and authorization objects.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.RoleDetail", {
        formatter,

        /**
         * Sets up the detail model and listens for route changes.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({}), "role");

            this.getOwnerComponent().getRouter().getRoute("roleDetail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Loads the role matching the route's roleId parameter.
         * @param {sap.ui.base.Event} oEvent Route matched event.
         * @returns {void}
         */
        _onRouteMatched(oEvent) {
            const sRoleId = oEvent.getParameter("arguments").roleId;
            const oRolesModel = this.getOwnerComponent().getModel("roles");

            oRolesModel.dataLoaded().then(() => {
                const oRole = (oRolesModel.getProperty("/roles") || [])
                    .find((oItem) => oItem.roleId === sRoleId);

                if (!oRole) {
                    MessageToast.show("Role not found.");
                    return;
                }

                // wrap primitive string arrays (tcodes, authObject fields) into
                // {value} objects so the view can use the same unambiguous
                // "{role>value}" binding pattern used throughout the app,
                // rather than binding directly to a primitive array element
                const oDisplayRole = Object.assign({}, oRole, {
                    tcodes: (oRole.tcodes || []).map((sCode) => ({ value: sCode })),
                    authObjects: (oRole.authObjects || []).map((oAuthObject) => Object.assign({}, oAuthObject, {
                        fields: (oAuthObject.fields || []).map((sField) => ({ value: sField }))
                    }))
                });

                this.getView().getModel("role").setData(oDisplayRole);
            });
        },

        /**
         * Navigates back to the role catalog.
         * @returns {void}
         */
        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("roles");
        }
    });
});
