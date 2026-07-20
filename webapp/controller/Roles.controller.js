sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Filter, FilterOperator) => {
    "use strict";

    /**
     * Controller for the read-only role repository.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Roles", {

        /**
         * Prepares role rows for table search and display.
         * @returns {void}
         */
        onInit() {
            const oRolesModel = this.getOwnerComponent().getModel("roles");

            oRolesModel.dataLoaded().then(() => {
                const aRoles = oRolesModel.getProperty("/roles") || [];
                aRoles.forEach((oRole) => {
                    oRole.tcodesText = Array.isArray(oRole.tcodes) ? oRole.tcodes.join(", ") : "";
                });
                oRolesModel.setProperty("/roles", aRoles);
            });
        },

        /**
         * Applies role catalog search across role name, module, and T-Code.
         * @param {sap.ui.base.Event} oEvent Search event.
         * @returns {void}
         */
        onSearch(oEvent) {
            const sQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            const oTable = this.byId("rolesTable");
            const oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter(new Filter({
                and: false,
                filters: [
                    new Filter("roleName", FilterOperator.Contains, sQuery),
                    new Filter("businessProcess", FilterOperator.Contains, sQuery),
                    new Filter("description", FilterOperator.Contains, sQuery),
                    new Filter("tcodesText", FilterOperator.Contains, sQuery)
                ]
            }));
        },

        /**
         * Formats the role's transaction code list for display.
         * @param {string[]} aTcodes Transaction codes.
         * @returns {string} Comma-separated transaction codes.
         */
        formatTcodes(aTcodes) {
            return Array.isArray(aTcodes) ? aTcodes.join(", ") : "";
        },

        /**
         * Provides a concise business purpose from available mock metadata.
         * @param {string} sBusinessProcess Business process/module.
         * @param {string} sDescription Role description.
         * @returns {string} Business purpose text.
         */
        formatBusinessPurpose(sBusinessProcess, sDescription) {
            if (!sBusinessProcess && !sDescription) {
                return "Not maintained";
            }

            if (!sBusinessProcess) {
                return sDescription;
            }

            return `${sBusinessProcess} - ${sDescription}`;
        }
    });
});
