sap.ui.define([], () => {
    "use strict";

    /**
     * Holds the current session's logged-in user for the lifetime of the
     * page. This is a simple in-memory singleton, not localStorage or
     * sessionStorage: SAP Fiori applications are not permitted to use
     * browser storage (see the project's ESLint sap-no-localstorage /
     * sap-no-sessionstorage rules), since a Fiori Launchpad shell expects
     * apps to be stateless and backend-driven. The session therefore
     * resets on a page reload - this is the correct behavior until a real
     * backend authentication/session service is introduced.
     */
    let sCurrentUserId = null;

    return {
        /**
         * Starts a session for the given user.
         * @param {string} sUserId User id to log in as.
         * @returns {void}
         */
        login(sUserId) {
            sCurrentUserId = sUserId;
        },

        /**
         * Ends the current session.
         * @returns {void}
         */
        logout() {
            sCurrentUserId = null;
        },

        /**
         * Returns the logged-in user's id, or null if nobody is logged in.
         * @returns {string|null} Current user id.
         */
        getCurrentUserId() {
            return sCurrentUserId;
        },

        /**
         * Returns whether a user is currently logged in.
         * @returns {boolean} True if logged in.
         */
        isLoggedIn() {
            return sCurrentUserId !== null;
        }
    };
});
