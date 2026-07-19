sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller"
], (SessionService, MessageToast, Controller) => {
    "use strict";

    /**
     * Controller for the mock Login page. Validates the entered username
     * against the users.json mock data (any password is accepted, since
     * there is no real authentication backend yet) and starts a session.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.Login", {

        /**
         * Validates the entered credentials and starts a session.
         * @returns {void}
         */
        onSignIn() {
            const oUsernameInput = this.byId("usernameInput");
            const oPasswordInput = this.byId("passwordInput");
            const sUsername = oUsernameInput.getValue().trim();
            const sPassword = oPasswordInput.getValue();

            oUsernameInput.setValueState("None");
            oPasswordInput.setValueState("None");

            if (!sUsername) {
                oUsernameInput.setValueState("Error");
                oUsernameInput.setValueStateText("Enter a username.");
                return;
            }

            if (!sPassword) {
                oPasswordInput.setValueState("Error");
                oPasswordInput.setValueStateText("Enter a password.");
                return;
            }

            const aUsers = this.getOwnerComponent().getModel("users").getProperty("/users") || [];
            const oUser = aUsers.find(
                (oItem) => oItem.userName.toLowerCase() === sUsername.toLowerCase()
            );

            if (!oUser) {
                oUsernameInput.setValueState("Error");
                oUsernameInput.setValueStateText("Unknown username. See the demo accounts below.");
                return;
            }

            if (oUser.status !== "Active") {
                oUsernameInput.setValueState("Error");
                oUsernameInput.setValueStateText(`This account is ${oUser.status.toLowerCase()}.`);
                return;
            }

            SessionService.login(oUser.userId);
            MessageToast.show(`Welcome, ${oUser.fullName}`);
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }

    });
});
