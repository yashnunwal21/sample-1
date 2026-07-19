sap.ui.define([], () => {
    "use strict";

    const STATUS_STATE = {
        Approved: "Success",
        CLOSED: "Success",
        Critical: "Error",
        Error: "Error",
        High: "Warning",
        MANAGER_APPROVED: "Success",
        MANAGER_REJECTED: "Error",
        Medium: "Warning",
        Pending: "Warning",
        "Pending Approval": "Warning",
        PROCESSING: "Warning",
        Provisioned: "Success",
        Rejected: "Error",
        SAP_APPROVED: "Success",
        SAP_REJECTED: "Error",
        SUBMITTED: "Warning",
        Success: "Success",
        Warning: "Warning",
        WITHDRAWN: "None"
    };
    const NOTIFICATION_ICON = {
        Approval: "sap-icon://task",
        Request: "sap-icon://document-text",
        Risk: "sap-icon://alert",
        System: "sap-icon://sys-help"
    };
    const PRIORITY_COLOR = {
        Critical: "#BB0000",
        High: "#BB0000",
        Low: "#107E3E",
        Medium: "#E9730C"
    };

    return {
        /**
         * Maps a business status string to a sap.ui.core.ValueState.
         * @param {string} sStatus Business status text.
         * @returns {string} SAPUI5 value state.
         */
        statusState(sStatus) {
            return STATUS_STATE[sStatus] || "None";
        },

        /**
         * Converts backend status codes into human-readable text.
         * @param {string} sStatus Status code.
         * @returns {string} Display label.
         */
        requestStatusText(sStatus) {
            return sStatus ? sStatus.split("_").map((sWord) =>
                sWord.charAt(0) + sWord.slice(1).toLowerCase()).join(" ") : "";
        },

        /**
         * Maps notification types to SAP icon URIs.
         * @param {string} sType Notification type.
         * @returns {string} Icon URI.
         */
        notificationIcon(sType) {
            return NOTIFICATION_ICON[sType] || "sap-icon://bell";
        },

        /**
         * Maps notification priority to a CSS color.
         * @param {string} sPriority Priority value.
         * @returns {string} CSS color value.
         */
        priorityColor(sPriority) {
            return PRIORITY_COLOR[sPriority] || "#556B82";
        },

        /**
         * Converts a mandatory flag into display text.
         * @param {boolean} bMandatory Mandatory flag.
         * @returns {string} Required/Optional text.
         */
        mandatoryText(bMandatory) {
            return bMandatory ? "Required" : "Optional";
        },

        /**
         * Formats unread notification count for a badge.
         * @param {int} iCount Unread count.
         * @returns {string} Badge text.
         */
        unreadBadgeText(iCount) {
            return iCount > 0 ? String(iCount) : "";
        },

        /**
         * Formats an ISO timestamp into a readable date/time.
         * @param {string} sTimestamp ISO timestamp.
         * @returns {string} Formatted date/time or original text.
         */
        formatDateTime(sTimestamp) {
            if (!sTimestamp) {
                return "";
            }

            const oDate = new Date(sTimestamp);
            if (isNaN(oDate.getTime())) {
                return sTimestamp;
            }

            return sap.ui.core.format.DateFormat.getDateTimeInstance({
                style: "medium"
            }).format(oDate);
        },

        /**
         * Formats a boolean as Yes/No.
         * @param {boolean} bValue Boolean value.
         * @returns {string} Yes/No text.
         */
        yesNo(bValue) {
            return bValue ? "Yes" : "No";
        }
    };
});
