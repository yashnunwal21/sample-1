sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], (formatter, Controller, Filter, FilterOperator, JSONModel) => {
    "use strict";

    /**
     * Controller for the read-only SAP role catalog.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Roles", {
        formatter,

        /**
         * Prepares role rows and local filter state.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({
                activeCount: 0,
                criticalCount: 0,
                modules: [],
                owners: [],
                roleCount: 0,
                selectedModule: "",
                selectedRisk: "",
                selectedStatus: "",
                tcodeCount: 0
            }), "roleView");

            const oRolesModel = this.getOwnerComponent().getModel("roles");
            oRolesModel.dataLoaded().then(() => this._prepareCatalogData());
        },

        /**
         * Enriches mock role rows for display and calculates catalog stats.
         * @returns {void}
         */
        _prepareCatalogData() {
            const oRolesModel = this.getOwnerComponent().getModel("roles");
            const aRoles = oRolesModel.getProperty("/roles") || [];
            const aModules = [];
            const aOwners = [];
            const aTcodes = [];

            aRoles.forEach((oRole) => {
                oRole.tcodesText = Array.isArray(oRole.tcodes) ? oRole.tcodes.join(", ") : "";
                oRole.businessPurpose = this.formatBusinessPurpose(oRole.businessProcess, oRole.description);

                if (oRole.businessProcess && aModules.indexOf(oRole.businessProcess) === -1) {
                    aModules.push(oRole.businessProcess);
                }

                if (oRole.ownerName && aOwners.indexOf(oRole.ownerName) === -1) {
                    aOwners.push(oRole.ownerName);
                }

                (oRole.tcodes || []).forEach((sTcode) => {
                    if (aTcodes.indexOf(sTcode) === -1) {
                        aTcodes.push(sTcode);
                    }
                });
            });

            oRolesModel.setProperty("/roles", aRoles);
            this.getView().getModel("roleView").setData({
                activeCount: aRoles.filter((oRole) => oRole.status === "Active").length,
                criticalCount: aRoles.filter((oRole) => oRole.riskLevel === "Critical").length,
                modules: [{ key: "", text: "All Modules" }].concat(aModules.sort().map((sModule) => ({ key: sModule, text: sModule }))),
                owners: aOwners.sort().map((sOwner) => ({ key: sOwner, text: sOwner })),
                roleCount: aRoles.length,
                selectedModule: "",
                selectedRisk: "",
                selectedStatus: "",
                tcodeCount: aTcodes.length
            });
        },

        /**
         * Applies role catalog search and filters.
         * @param {sap.ui.base.Event} oEvent Search/filter event.
         * @returns {void}
         */
        onSearch(oEvent) {
            const sQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || this.byId("roleSearchField").getValue() || "").trim();
            this._applyFilters(sQuery);
        },

        /**
         * Applies select filter changes.
         * @returns {void}
         */
        onFilterChange() {
            const sQuery = (this.byId("roleSearchField").getValue() || "").trim();
            this._applyFilters(sQuery);
        },

        /**
         * Clears search and filters.
         * @returns {void}
         */
        onClearFilters() {
            const oRoleViewModel = this.getView().getModel("roleView");
            this.byId("roleSearchField").setValue("");
            oRoleViewModel.setProperty("/selectedModule", "");
            oRoleViewModel.setProperty("/selectedRisk", "");
            oRoleViewModel.setProperty("/selectedStatus", "");
            this._applyFilters("");
        },

        /**
         * Opens role detail for the selected catalog row.
         * @param {sap.ui.base.Event} oEvent Row press event.
         * @returns {void}
         */
        onRolePress(oEvent) {
            const sRoleId = oEvent.getSource().getBindingContext("roles").getProperty("roleId");
            this.getOwnerComponent().getRouter().navTo("roleDetail", { roleId: sRoleId });
        },

        /**
         * Applies all current catalog filters to the role table.
         * @param {string} sQuery Search text.
         * @returns {void}
         */
        _applyFilters(sQuery) {
            const oRoleViewModel = this.getView().getModel("roleView");
            const aFilters = [];
            const sModule = oRoleViewModel.getProperty("/selectedModule");
            const sRisk = oRoleViewModel.getProperty("/selectedRisk");
            const sStatus = oRoleViewModel.getProperty("/selectedStatus");

            if (sQuery) {
                aFilters.push(new Filter({
                    and: false,
                    filters: [
                        new Filter("roleName", FilterOperator.Contains, sQuery),
                        new Filter("businessProcess", FilterOperator.Contains, sQuery),
                        new Filter("description", FilterOperator.Contains, sQuery),
                        new Filter("ownerName", FilterOperator.Contains, sQuery),
                        new Filter("tcodesText", FilterOperator.Contains, sQuery)
                    ]
                }));
            }

            if (sModule) {
                aFilters.push(new Filter("businessProcess", FilterOperator.EQ, sModule));
            }

            if (sRisk) {
                aFilters.push(new Filter("riskLevel", FilterOperator.EQ, sRisk));
            }

            if (sStatus) {
                aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
            }

            this.byId("rolesTable").getBinding("items").filter(aFilters);
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
