sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, SessionService, MessageToast, Controller, JSONModel) => {
    "use strict";

    const STATUS_LABELS = {
        CLOSED: "Completed",
        MANAGER_APPROVED: "Pending SAP GRC Review",
        MANAGER_REJECTED: "Manager Rejected",
        SAP_APPROVED: "In Progress",
        SAP_REJECTED: "SAP GRC Rejected",
        SUBMITTED: "Pending Manager Approval",
        WITHDRAWN: "Withdrawn"
    };
    const QUEUE_KPI_IDS = ["awaitingReview", "inProgress", "pendingApproval"];

    const isRejected = (oRequest) => ["MANAGER_REJECTED", "SAP_REJECTED"].indexOf(oRequest.status) !== -1;
    const isCompleted = (oRequest) => oRequest.status === "CLOSED";
    const isApproved = (oRequest) => ["MANAGER_APPROVED", "SAP_APPROVED"].indexOf(oRequest.status) !== -1 || isCompleted(oRequest);
    const statusLabel = (sStatus) => STATUS_LABELS[sStatus] || sStatus || "Draft";

    /**
     * Role-aware dashboard controller for employee, manager, and SAP GRC users.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Dashboard", {
        formatter,

        /**
         * Initializes the role dashboard model and route listener.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({
                kpis: [],
                myRequests: [],
                recentRequests: [],
                roleDescription: "",
                roleTitle: "",
                roleType: "",
                sections: [],
                userName: ""
            }), "roleDashboard");

            this.getOwnerComponent().getRouter().getRoute("dashboard")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Returns an owner component model by name.
         * @param {string} sModelName Model name.
         * @returns {sap.ui.model.Model} Requested model.
         */
        _getModel(sModelName) {
            return this.getOwnerComponent().getModel(sModelName);
        },

        /**
         * Rebuilds the dashboard after route navigation.
         * @returns {void}
         */
        _onRouteMatched() {
            const oUsersModel = this._getModel("users");
            const oRequestsModel = this._getModel("accessRequests");

            oUsersModel.dataLoaded().then(() => {
                oRequestsModel.dataLoaded().then(() => this._buildRoleDashboard());
            });
        },

        /**
         * Returns the simulated logged-in user.
         * @returns {object|undefined} Current user row.
         */
        _getCurrentUser() {
            return (this._getModel("users").getProperty("/users") || [])
                .find((oUser) => oUser.userId === SessionService.getCurrentUserId());
        },

        /**
         * Builds the dashboard for the current user's role.
         * @returns {void}
         */
        _buildRoleDashboard() {
            const oCurrentUser = this._getCurrentUser();
            const aRequests = this._getModel("accessRequests").getProperty("/accessRequests") || [];
            const aUsers = this._getModel("users").getProperty("/users") || [];

            if (!oCurrentUser) {
                return;
            }

            if (oCurrentUser.userType === "MANAGER") {
                this._buildManagerDashboard(oCurrentUser, aRequests, aUsers);
                return;
            }

            if (oCurrentUser.userType === "SECURITY") {
                this._buildGrcDashboard(oCurrentUser, aRequests);
                return;
            }

            this._buildEmployeeDashboard(oCurrentUser, aRequests);
        },

        /**
         * Builds dashboard data for an employee.
         * @param {object} oUser Current user.
         * @param {object[]} aRequests All requests.
         * @returns {void}
         */
        _buildEmployeeDashboard(oUser, aRequests) {
            const aMine = aRequests.filter((oRequest) => oRequest.requestorId === oUser.userId);

            this._setDashboardData(oUser, "MSIL Employee", "Create requests and track your own access approvals.", [
                this._kpi("new", "New Request", "sap-icon://add-document", "Neutral", "None", 0),
                this._kpi("my", "My Requests", "sap-icon://documents", "Neutral", "None", aMine.length)
            ], [], []);

            this.getView().getModel("roleDashboard").setProperty("/myRequests", this._myRequestRows(aMine));
        },

        /**
         * Builds dashboard data for a reporting manager.
         * @param {object} oUser Current user.
         * @param {object[]} aRequests All requests.
         * @param {object[]} aUsers All users.
         * @returns {void}
         */
        _buildManagerDashboard(oUser, aRequests, aUsers) {
            const aTeamIds = aUsers
                .filter((oEmployee) => oEmployee.managerId === oUser.userId)
                .map((oEmployee) => oEmployee.userId);
            const aTeamRequests = aRequests.filter((oRequest) => aTeamIds.indexOf(oRequest.requestorId) !== -1);
            const aPendingApproval = aRequests.filter((oRequest) =>
                oRequest.approverId === oUser.userId && oRequest.status === "SUBMITTED");
            const iCompleted = aTeamRequests.filter(isCompleted).length;
            const iApproved = aTeamRequests.filter(isApproved).length;
            const iRejected = aTeamRequests.filter(isRejected).length;
            const iFinished = iApproved + iRejected;
            const iApprovalRate = iFinished ? Math.round((iApproved / iFinished) * 100) : 0;

            this._setDashboardData(oUser, "MSIL Reporting Manager", "Review team requests and monitor approval performance.", [
                this._kpi("pendingApproval", "Pending Approval", "sap-icon://approvals", "Critical", "Up", aPendingApproval.length),
                this._kpi("teamSubmitted", "Team Requests", "sap-icon://group", "Neutral", "None", aTeamRequests.length),
                this._kpi("approved", "Approved", "sap-icon://accept", "Good", "None", iApproved),
                this._kpi("rejected", "Rejected", "sap-icon://decline", "Error", "None", iRejected),
                this._kpi("approvalRate", "Approval Rate", "sap-icon://business-objects-experience", "Good", "None", `${iApprovalRate}%`)
            ], [
                this._section("Request Review", this._statusRows(aPendingApproval.concat(aTeamRequests))),
                this._section("Team Overview", [
                    { label: "Requests submitted this month", state: "None", value: aTeamRequests.length },
                    { label: "Requests approved", state: "Success", value: iApproved },
                    { label: "Requests rejected", state: "Error", value: iRejected },
                    { label: "Requests awaiting approval", state: "Warning", value: aPendingApproval.length },
                    { label: "Monthly completed requests", state: "Success", value: iCompleted },
                    { label: "Average approval time", state: "None", value: "1 day" }
                ])
            ], aPendingApproval.concat(aTeamRequests));
        },

        /**
         * Builds dashboard data for SAP GRC team members.
         * @param {object} oUser Current user.
         * @param {object[]} aRequests All requests.
         * @returns {void}
         */
        _buildGrcDashboard(oUser, aRequests) {
            const aAwaitingReview = aRequests.filter((oRequest) => oRequest.status === "MANAGER_APPROVED");
            const aInProgress = aRequests.filter((oRequest) => oRequest.status === "SAP_APPROVED");
            const aCompleted = aRequests.filter(isCompleted);
            const aRejected = aRequests.filter((oRequest) => oRequest.status === "SAP_REJECTED");
            const aWorkQueue = aAwaitingReview.concat(aInProgress);

            this._setDashboardData(oUser, "SAP GRC Team Member", "Review manager-approved requests and track access processing.", [
                this._kpi("awaitingReview", "Awaiting Review", "sap-icon://inspection", "Critical", "Up", aAwaitingReview.length),
                this._kpi("inProgress", "In Progress", "sap-icon://process", "Critical", "None", aInProgress.length),
                this._kpi("completed", "Completed", "sap-icon://complete", "Good", "None", aCompleted.length),
                this._kpi("rejected", "Rejected", "sap-icon://decline", "Error", "None", aRejected.length),
                this._kpi("processed", "Processed Requests", "sap-icon://activity-individual", "Good", "None", aCompleted.length + aRejected.length)
            ], [
                this._section("Work Queue", [
                    { label: "Requests awaiting review", state: "Warning", value: aAwaitingReview.length },
                    { label: "In progress", state: "Warning", value: aInProgress.length },
                    { label: "Completed", state: "Success", value: aCompleted.length },
                    { label: "Rejected", state: "Error", value: aRejected.length }
                ]),
                this._section("Processing", [
                    { label: "Assign request to self", state: "None", value: "Available in request detail" },
                    { label: "Update processing status", state: "None", value: "In Progress / Completed" },
                    { label: "Add implementation comments", state: "None", value: "Required for closure" },
                    { label: "Monthly processing metrics", state: "Success", value: `${aCompleted.length} completed` }
                ])
            ], aWorkQueue.concat(aCompleted).concat(aRejected));
        },

        /**
         * Writes computed dashboard data into the view model.
         * @param {object} oUser Current user.
         * @param {string} sRoleTitle Role display name.
         * @param {string} sDescription Role description.
         * @param {object[]} aKpis KPI tiles.
         * @param {object[]} aSections Dashboard sections.
         * @param {object[]} aRequests Recent request source rows.
         * @returns {void}
         */
        _setDashboardData(oUser, sRoleTitle, sDescription, aKpis, aSections, aRequests) {
            this.getView().getModel("roleDashboard").setData({
                kpis: aKpis,
                recentRequests: this._recentRequests(aRequests),
                roleDescription: sDescription,
                roleTitle: sRoleTitle,
                roleType: oUser.userType,
                sections: aSections,
                userName: oUser.fullName
            });
        },

        /**
         * Creates a KPI tile payload.
         * @param {string} sId KPI id.
         * @param {string} sTitle KPI title.
         * @param {string} sIcon SAP icon URI.
         * @param {string} sState NumericContent state.
         * @param {string} sTrend NumericContent trend.
         * @param {string|number} vValue KPI value.
         * @returns {object} KPI payload.
         */
        _kpi(sId, sTitle, sIcon, sState, sTrend, vValue) {
            return {
                icon: sIcon,
                id: sId,
                state: sState,
                title: sTitle,
                trend: sTrend,
                value: String(vValue)
            };
        },

        /**
         * Creates a dashboard section payload.
         * @param {string} sTitle Section title.
         * @param {object[]} aRows Section rows.
         * @returns {object} Section payload.
         */
        _section(sTitle, aRows) {
            return {
                rows: aRows,
                title: sTitle
            };
        },

        /**
         * Aggregates requests by display status.
         * @param {object[]} aRequests Request rows.
         * @returns {object[]} Status count rows.
         */
        _statusRows(aRequests = []) {
            const mCounts = aRequests.reduce((mResult, oRequest) => {
                const sLabel = statusLabel(oRequest.status);
                mResult[sLabel] = (mResult[sLabel] || 0) + 1;
                return mResult;
            }, {});

            return Object.keys(mCounts).map((sLabel) => ({
                label: sLabel,
                state: formatter.statusState(sLabel),
                value: mCounts[sLabel]
            }));
        },

        /**
         * Builds workflow steps shown inside each My Requests row.
         * @param {string} sStatus Request status code.
         * @returns {object[]} Workflow step rows.
         */
        _requestWorkflowSteps(sStatus) {
            const aSteps = [
                { title: "Draft" },
                { title: "Submitted" },
                { title: "Manager Approval" },
                { title: "SAP GRC Review" },
                { title: "Provisioning" },
                { title: "Completed" }
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
         * Returns all of the current user's own requests, newest first, for
         * the Employee dashboard's My Requests list.
         * @param {object[]} aRequests Request rows already filtered to the current user.
         * @returns {object[]} My Requests payloads.
         */
        _myRequestRows(aRequests = []) {
            return aRequests
                .slice()
                .sort((oFirst, oSecond) => new Date(oSecond.updatedOn || oSecond.createdOn) - new Date(oFirst.updatedOn || oFirst.createdOn))
                .map((oRequest) => ({
                    createdOn: oRequest.createdOn,
                    description: oRequest.roleName || "Access Request",
                    requestId: oRequest.requestId,
                    status: oRequest.status,
                    statusText: statusLabel(oRequest.status),
                    targetUserName: oRequest.targetUserName,
                    title: oRequest.requestNumber,
                    workflowSteps: this._requestWorkflowSteps(oRequest.status)
                }));
        },

        /**
         * Returns the latest five requests for the dashboard side panel.
         * @param {object[]} aRequests Request rows.
         * @returns {object[]} Recent request payloads.
         */
        _recentRequests(aRequests = []) {
            return aRequests
                .slice()
                .sort((oFirst, oSecond) => new Date(oSecond.updatedOn || oSecond.createdOn) - new Date(oFirst.updatedOn || oFirst.createdOn))
                .slice(0, 5)
                .map((oRequest) => ({
                    description: `${oRequest.requestorName} | ${statusLabel(oRequest.status)}`,
                    requestId: oRequest.requestId,
                    status: oRequest.status,
                    title: `${oRequest.requestNumber} - ${oRequest.roleName || "Access Request"}`
                }));
        },

        /**
         * Handles KPI tile navigation.
         * @param {sap.ui.base.Event} oEvent Tile press event.
         * @returns {void}
         */
        onKpiPress(oEvent) {
            const sId = oEvent.getSource().getBindingContext("roleDashboard").getProperty("id");

            if (sId === "new") {
                this.getOwnerComponent().getRouter().navTo("requestCreate");
                return;
            }

            if (QUEUE_KPI_IDS.indexOf(sId) !== -1) {
                this.getOwnerComponent().getRouter().navTo("approvals");
            }
        },

        /**
         * Opens a recent request from the dashboard list.
         * @param {sap.ui.base.Event} oEvent List item press event.
         * @returns {void}
         */
        onRecentRequestPress(oEvent) {
            const sRequestId = oEvent.getSource().getBindingContext("roleDashboard").getProperty("requestId");
            this.getOwnerComponent().getRouter().navTo("requestDetail", { requestId: sRequestId });
        },

        /**
         * Opens the request creation page.
         * @returns {void}
         */
        onCreatePress() {
            this.getOwnerComponent().getRouter().navTo("requestCreate");
        },

        /**
         * Opens the approvals/review queue.
         * @returns {void}
         */
        onQueuePress() {
            this.getOwnerComponent().getRouter().navTo("approvals");
        },

        /**
         * Displays placeholder action text for future dashboard commands.
         * @param {sap.ui.base.Event} oEvent Button press event.
         * @returns {void}
         */
        onPlaceholderAction(oEvent) {
            MessageToast.show(oEvent.getSource().getText());
        }
    });
});
