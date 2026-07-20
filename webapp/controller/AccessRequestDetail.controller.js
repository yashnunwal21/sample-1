sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "com/sap/grc/sapgrcaccessmanagement/util/WorkflowService",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, SessionService, WorkflowService, MessageBox, MessageToast, Controller, JSONModel) => {
    "use strict";

    /**
     * Request detail controller for approval actions and request display.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.AccessRequestDetail", {
        formatter,

        /**
         * Initializes request detail and action view models.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({}), "detail");
            this.getView().setModel(new JSONModel({
                completionComment: "",
                managerComment: "",
                securityComment: "",
                showCompleteAction: false,
                showManagerActions: false,
                showSecurityActions: false,
                showWithdrawAction: false
            }), "actionView");

            this.getOwnerComponent().getRouter().getRoute("requestDetail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Loads the selected request when the route changes.
         * @param {sap.ui.base.Event} oEvent Route matched event.
         * @returns {void}
         */
        _onRouteMatched(oEvent) {
            this._sRequestId = oEvent.getParameter("arguments").requestId;
            this._loadRequest();
        },

        /**
         * Returns the current mock user.
         * @returns {object|undefined} Current user row.
         */
        _getCurrentUser() {
            const aUsers = this.getOwnerComponent().getModel("users").getProperty("/users") || [];
            return aUsers.find((oUser) => oUser.userId === SessionService.getCurrentUserId());
        },

        /**
         * Returns all access requests from the model.
         * @returns {object[]} Access request rows.
         */
        _getRequestsArray() {
            return this.getOwnerComponent().getModel("accessRequests").getProperty("/accessRequests") || [];
        },

        /**
         * Loads the selected request and recalculates action visibility.
         * @returns {void}
         */
        _loadRequest() {
            const oRequestsModel = this.getOwnerComponent().getModel("accessRequests");
            const oUsersModel = this.getOwnerComponent().getModel("users");

            oRequestsModel.dataLoaded().then(() => {
                oUsersModel.dataLoaded().then(() => this._renderRequest());
            });
        },

        /**
         * Builds a simple workflow timeline for request tracking.
         * @param {string} sStatus Request status code.
         * @returns {object[]} Workflow step rows.
         */
        _buildWorkflowSteps(sStatus) {
            const aSteps = [
                { key: "DRAFT", title: "Draft" },
                { key: "SUBMITTED", title: "Submitted" },
                { key: "MANAGER", title: "Manager Approval" },
                { key: "GRC", title: "SAP GRC Review" },
                { key: "PROVISIONING", title: "Provisioning" },
                { key: "COMPLETED", title: "Completed" }
            ];
            const mCurrentIndex = {
                CLOSED: 5,
                MANAGER_APPROVED: 3,
                MANAGER_REJECTED: 2,
                SAP_APPROVED: 4,
                SAP_REJECTED: 3,
                SUBMITTED: 2,
                WITHDRAWN: 1
            };
            const iCurrentIndex = mCurrentIndex[sStatus] ?? 1;
            const bRejected = sStatus === "MANAGER_REJECTED" || sStatus === "SAP_REJECTED";

            return aSteps.map((oStep, iIndex) => {
                let sState = "None";
                let sText = "Not Started";

                if (iIndex < iCurrentIndex || sStatus === "CLOSED") {
                    sState = "Success";
                    sText = "Completed";
                }

                if (iIndex === iCurrentIndex && sStatus !== "CLOSED") {
                    sState = bRejected ? "Error" : "Warning";
                    sText = bRejected ? "Rejected" : "Current";
                }

                return {
                    state: sState,
                    text: sText,
                    title: oStep.title
                };
            });
        },

        /**
         * Returns date text for processed approval/rejection requests.
         * @param {object} oRequest Request row.
         * @returns {string} ISO date text or empty string.
         */
        _getProcessedOn(oRequest) {
            const aProcessedStatuses = ["MANAGER_APPROVED", "MANAGER_REJECTED", "SAP_APPROVED", "SAP_REJECTED", "CLOSED"];
            return aProcessedStatuses.indexOf(oRequest.status) !== -1 ? oRequest.updatedOn : "";
        },

        /**
         * Renders request data into the detail models.
         * @returns {void}
         */
        _renderRequest() {
            const oRequest = this._getRequestsArray().find((oItem) => oItem.requestId === this._sRequestId);

            if (!oRequest) {
                MessageToast.show("Request not found.");
                return;
            }

            const oActionModel = this.getView().getModel("actionView");
            const oCurrentUser = this._getCurrentUser();
            const oDetailData = Object.assign({}, oRequest, {
                processedOn: this._getProcessedOn(oRequest),
                workflowSteps: this._buildWorkflowSteps(oRequest.status)
            });
            this.getView().getModel("detail").setData(oDetailData);
            oActionModel.setProperty("/showManagerActions", WorkflowService.canManagerAct(oRequest, SessionService.getCurrentUserId()));
            oActionModel.setProperty("/showSecurityActions", WorkflowService.canSecurityAct(oRequest, oCurrentUser?.userType));
            oActionModel.setProperty("/showCompleteAction", WorkflowService.canComplete(oRequest, oCurrentUser?.userType));
            oActionModel.setProperty("/showWithdrawAction", WorkflowService.canWithdraw(oRequest, SessionService.getCurrentUserId()));
            oActionModel.setProperty("/managerComment", "");
            oActionModel.setProperty("/securityComment", "");
            oActionModel.setProperty("/completionComment", "");
        },

        /**
         * Navigates back to the dashboard.
         * @returns {void}
         */
        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Finds the current request, applies a mutation, and refreshes the model.
         * @param {Function} fnMutate Mutation callback.
         * @returns {void}
         */
        _findAndMutate(fnMutate) {
            const aRequests = this._getRequestsArray();
            const oRequest = aRequests.find((oItem) => oItem.requestId === this._sRequestId);

            if (!oRequest) {
                MessageToast.show("Request not found.");
                return;
            }

            fnMutate(oRequest);
            this.getOwnerComponent().getModel("accessRequests").setProperty("/accessRequests", aRequests);
            this._loadRequest();
        },

        /**
         * Approves the request as reporting manager.
         * @returns {void}
         */
        onManagerApprove() {
            const sComment = this.getView().getModel("actionView").getProperty("/managerComment");
            this._findAndMutate((oRequest) => WorkflowService.approveByManager(oRequest, sComment));
            MessageToast.show("Approved. Request moved to Security Review.");
        },

        /**
         * Rejects the request as reporting manager.
         * @returns {void}
         */
        onManagerReject() {
            const sComment = this.getView().getModel("actionView").getProperty("/managerComment");
            this._findAndMutate((oRequest) => WorkflowService.rejectByManager(oRequest, sComment));
            MessageToast.show("Request rejected.");
        },

        /**
         * Approves the request as SAP GRC reviewer.
         * @returns {void}
         */
        onSecurityApprove() {
            const sComment = this.getView().getModel("actionView").getProperty("/securityComment");
            this._findAndMutate((oRequest) => WorkflowService.approveBySecurity(oRequest, sComment));
            MessageToast.show("Approved. Provisioning is now in progress.");
        },

        /**
         * Rejects the request as SAP GRC reviewer.
         * @returns {void}
         */
        onSecurityReject() {
            const sComment = this.getView().getModel("actionView").getProperty("/securityComment");
            this._findAndMutate((oRequest) => WorkflowService.rejectBySecurity(oRequest, sComment));
            MessageToast.show("Request rejected.");
        },

        /**
         * Marks the request as provisioned in the target system, closing it.
         * @returns {void}
         */
        onCompleteProvisioning() {
            const sComment = this.getView().getModel("actionView").getProperty("/completionComment");
            this._findAndMutate((oRequest) => WorkflowService.completeProvisioning(oRequest, sComment));
            MessageToast.show("Request marked as provisioned and closed.");
        },

        /**
         * Withdraws the request on behalf of the requestor, after confirmation.
         * @returns {void}
         */
        onWithdraw() {
            MessageBox.confirm(
                "Withdraw this access request? This cannot be undone.",
                {
                    title: "Withdraw Request",
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            this._findAndMutate((oRequest) => WorkflowService.withdrawRequest(oRequest));
                            MessageToast.show("Request withdrawn.");
                        }
                    }
                }
            );
        }
    });
});
