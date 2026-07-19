sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "com/sap/grc/sapgrcaccessmanagement/util/WorkflowService",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (SessionService, WorkflowService, Controller, JSONModel) => {
    "use strict";

    /**
     * Controller for manager and SAP GRC approval queues.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Approvals", {
        /**
         * Initializes queue model and route refresh.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({
                managerQueue: [],
                provisioningQueue: [],
                securityQueue: []
            }), "approvalsView");

            this.getOwnerComponent().getRouter().getRoute("approvals")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Refreshes approval queues after route navigation.
         * @returns {void}
         */
        _onRouteMatched() {
            this._refreshQueues();
        },

        /**
         * Returns the simulated logged-in user.
         * @returns {object|undefined} Current user row.
         */
        _getCurrentUser() {
            const aUsers = this.getOwnerComponent().getModel("users").getProperty("/users") || [];
            return aUsers.find((oUser) => oUser.userId === SessionService.getCurrentUserId());
        },

        /**
         * Rebuilds manager and SAP GRC work queues.
         * @returns {void}
         */
        _refreshQueues() {
            const oRequestsModel = this.getOwnerComponent().getModel("accessRequests");
            const oUsersModel = this.getOwnerComponent().getModel("users");
            const oApprovalsViewModel = this.getView().getModel("approvalsView");

            oRequestsModel.dataLoaded().then(() => {
                oUsersModel.dataLoaded().then(() => {
                    const aAllRequests = oRequestsModel.getProperty("/accessRequests") || [];
                    const sUserType = this._getCurrentUser()?.userType;

                    oApprovalsViewModel.setData({
                        managerQueue: aAllRequests.filter((oRequest) => WorkflowService.canManagerAct(oRequest, SessionService.getCurrentUserId())),
                        provisioningQueue: aAllRequests.filter((oRequest) => WorkflowService.canComplete(oRequest, sUserType)),
                        securityQueue: aAllRequests.filter((oRequest) => WorkflowService.canSecurityAct(oRequest, sUserType))
                    });
                });
            });
        },

        /**
         * Opens the selected request detail page.
         * @param {sap.ui.base.Event} oEvent Row press event.
         * @returns {void}
         */
        onRowPress(oEvent) {
            const sRequestId = oEvent.getSource().getBindingContext("approvalsView").getProperty("requestId");
            this.getOwnerComponent().getRouter().navTo("requestDetail", { requestId: sRequestId });
        }
    });
});
