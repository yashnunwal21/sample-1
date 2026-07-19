sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "sap/ui/core/mvc/Controller"
], (formatter, Controller) => {
    "use strict";

    /**
     * Controller for the access request list page.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.AccessRequestList", {
        formatter,

        /**
         * Opens the create request page.
         * @returns {void}
         */
        onCreatePress() {
            this.getOwnerComponent().getRouter().navTo("requestCreate");
        },

        /**
         * Opens the selected access request detail page.
         * @param {sap.ui.base.Event} oEvent Request item press event.
         * @returns {void}
         */
        onRequestPress(oEvent) {
            const sRequestId = oEvent.getSource().getBindingContext("accessRequests").getProperty("requestId");
            this.getOwnerComponent().getRouter().navTo("requestDetail", { requestId: sRequestId });
        }
    });
});
