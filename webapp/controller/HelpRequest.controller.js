sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, SessionService, MessageBox, MessageToast, Controller, JSONModel) => {
    "use strict";

    /**
     * Controller for the lightweight SAP GRC help desk page.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.HelpRequest", {
        formatter,

        /**
         * Initializes the local help request view model.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({
                currentUser: null,
                isGrcUser: false,
                message: "",
                replyMessage: "",
                selectedTicket: null,
                subject: "",
                tickets: []
            }), "helpView");

            this.getOwnerComponent().getRouter().getRoute("helpRequests")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Refreshes visible help tickets when the page is opened.
         * @returns {void}
         */
        _onRouteMatched() {
            const oUsersModel = this.getOwnerComponent().getModel("users");
            const oHelpModel = this.getOwnerComponent().getModel("helpRequests");

            oUsersModel.dataLoaded().then(() => {
                oHelpModel.dataLoaded().then(() => this._loadTickets())
                    .catch(() => MessageBox.error("Unable to load help requests."));
            }).catch(() => MessageBox.error("Unable to load users."));
        },

        /**
         * Loads tickets visible for the current user.
         * @returns {void}
         */
        _loadTickets() {
            const sCurrentUserId = SessionService.getCurrentUserId();
            const aUsers = this.getOwnerComponent().getModel("users").getProperty("/users") || [];
            const aTickets = this.getOwnerComponent().getModel("helpRequests").getProperty("/helpRequests") || [];
            const oCurrentUser = aUsers.find((oUser) => oUser.userId === sCurrentUserId);

            if (!oCurrentUser) {
                return;
            }

            const bIsGrcUser = oCurrentUser.userType === "SECURITY";
            const aVisibleTickets = bIsGrcUser
                ? aTickets
                : aTickets.filter((oTicket) => oTicket.createdBy === sCurrentUserId);

            this.getView().getModel("helpView").setData({
                currentUser: oCurrentUser,
                isGrcUser: bIsGrcUser,
                message: "",
                replyMessage: "",
                selectedTicket: aVisibleTickets[0] || null,
                subject: "",
                tickets: aVisibleTickets
            });
        },

        /**
         * Returns to the dashboard from the help desk page.
         * @returns {void}
         */
        onBackToDashboard() {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Clears the new help request draft.
         * @returns {void}
         */
        onClearDraft() {
            const oHelpViewModel = this.getView().getModel("helpView");
            oHelpViewModel.setProperty("/subject", "");
            oHelpViewModel.setProperty("/message", "");
        },

        /**
         * Selects a ticket from the list.
         * @param {sap.ui.base.Event} oEvent List selection event.
         * @returns {void}
         */
        onTicketPress(oEvent) {
            const oTicket = oEvent.getSource().getBindingContext("helpView").getObject();
            this.getView().getModel("helpView").setProperty("/selectedTicket", oTicket);
            this.getView().getModel("helpView").setProperty("/replyMessage", "");
        },

        /**
         * Creates a new help request for the SAP GRC team.
         * @returns {void}
         */
        onSubmitHelpRequest() {
            const oHelpViewModel = this.getView().getModel("helpView");
            const oCurrentUser = oHelpViewModel.getProperty("/currentUser");
            const sSubject = (oHelpViewModel.getProperty("/subject") || "").trim();
            const sMessage = (oHelpViewModel.getProperty("/message") || "").trim();

            if (!sSubject || !sMessage) {
                MessageBox.error("Please enter both subject and message.");
                return;
            }

            const oHelpModel = this.getOwnerComponent().getModel("helpRequests");
            const aTickets = oHelpModel.getProperty("/helpRequests") || [];
            const sNow = new Date().toISOString();
            const sTicketNumber = `HELP-2026-${String(aTickets.length + 1).padStart(4, "0")}`;
            const oTicket = {
                assignedGroup: "SAP GRC Team",
                createdBy: oCurrentUser.userId,
                createdByName: oCurrentUser.fullName,
                createdOn: sNow,
                helpRequestId: `HD-${Date.now()}`,
                messages: [{
                    authorName: oCurrentUser.fullName,
                    authorType: "USER",
                    createdOn: sNow,
                    message: sMessage
                }],
                status: "Open",
                subject: sSubject,
                ticketNumber: sTicketNumber,
                updatedOn: sNow
            };

            aTickets.push(oTicket);
            oHelpModel.setProperty("/helpRequests", aTickets);
            this._loadTickets();
            MessageToast.show(`${sTicketNumber} sent to SAP GRC Team.`);
        },

        /**
         * Adds a reply to the selected ticket.
         * @returns {void}
         */
        onSendReply() {
            const oHelpViewModel = this.getView().getModel("helpView");
            const oCurrentUser = oHelpViewModel.getProperty("/currentUser");
            const oSelectedTicket = oHelpViewModel.getProperty("/selectedTicket");
            const sReply = (oHelpViewModel.getProperty("/replyMessage") || "").trim();

            if (!oSelectedTicket || !sReply) {
                MessageBox.error("Please select a ticket and enter a reply.");
                return;
            }

            const oHelpModel = this.getOwnerComponent().getModel("helpRequests");
            const aTickets = oHelpModel.getProperty("/helpRequests") || [];
            const oTicket = aTickets.find((oItem) => oItem.helpRequestId === oSelectedTicket.helpRequestId);

            if (!oTicket) {
                MessageBox.error("Selected help request could not be found.");
                return;
            }

            const sNow = new Date().toISOString();
            oTicket.messages.push({
                authorName: oCurrentUser.fullName,
                authorType: oCurrentUser.userType === "SECURITY" ? "GRC" : "USER",
                createdOn: sNow,
                message: sReply
            });
            oTicket.status = oCurrentUser.userType === "SECURITY" ? "Answered" : "Open";
            oTicket.updatedOn = sNow;

            oHelpModel.setProperty("/helpRequests", aTickets);
            oHelpViewModel.setProperty("/replyMessage", "");
            this._loadTickets();
            MessageToast.show("Reply added.");
        }
    });
});
