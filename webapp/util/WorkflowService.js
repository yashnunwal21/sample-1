sap.ui.define([], () => {
    "use strict";

    const now = () => new Date().toISOString();

    // MSIL hierarchy designations authorized to self-approve: if a DPM or DVM
    // raises an access request for themselves, it is auto-approved and routed
    // directly to the SAP GRC team (DE-DCG), skipping the normal manager
    // approval stage - matching the DPM/DVM chain-of-command already sitting
    // at or near the top of their own reporting line.
    const SELF_APPROVING_DESIGNATIONS = ["DPM", "DVM"];

    /**
     * Checks whether a request qualifies for DPM/DVM self-approval: the
     * requestor must be requesting for themselves (not another employee or
     * an outsider), and must hold a self-approving designation.
     * @param {object} oCurrentUser The requestor.
     * @param {object} oTarget The resolved request target.
     * @returns {boolean} Whether the request should be auto-approved.
     */
    const isSelfApprovingRequest = (oCurrentUser, oTarget) =>
        oTarget.type === "MSIL" &&
        oTarget.userId === oCurrentUser.userId &&
        SELF_APPROVING_DESIGNATIONS.indexOf(oCurrentUser.designation) !== -1;

    /**
     * Creates the common request envelope used by both static and dynamic requests.
     * @param {object} mParams Request build parameters.
     * @param {object} mExtras Additional request fields.
     * @returns {object} New access request payload.
     */
    const buildRequestEnvelope = (mParams, mExtras) => {
        const oTarget = mParams.target || {
            type: "MSIL",
            userId: mParams.currentUser.userId,
            fullName: mParams.currentUser.fullName,
            employeeId: mParams.currentUser.employeeId,
            department: mParams.currentUser.department,
            plant: mParams.currentUser.plant
        };

        const bAutoApproved = isSelfApprovingRequest(mParams.currentUser, oTarget);

        return Object.assign({
            requestId: `AR-${Date.now()}`,
            requestNumber: mParams.requestNumber,
            requestorId: mParams.currentUser.userId,
            requestorName: mParams.currentUser.fullName,
            targetType: oTarget.type,
            targetUserId: oTarget.userId || null,
            targetUserName: oTarget.fullName,
            targetDetails: oTarget,
            approverId: mParams.currentUser.managerId || null,
            approverName: mParams.currentUser.managerName || null,
            businessJustification: mParams.businessJustification,
            managerComment: bAutoApproved
                ? `Auto-approved: ${mParams.currentUser.fullName} (${mParams.currentUser.designation}) requested access for themselves. Routed directly to the SAP GRC team (DE-DCG) for review.`
                : null,
            securityComment: null,
            status: bAutoApproved ? "MANAGER_APPROVED" : "SUBMITTED",
            createdOn: now(),
            updatedOn: now()
        }, mExtras);
    };

    return {
        /**
         * Generates the next sequential request number.
         * @param {object[]} aExistingRequests Existing request rows.
         * @returns {string} Next request number.
         */
        generateRequestNumber(aExistingRequests = []) {
            const iMaxSeq = aExistingRequests.reduce((iMax, oRequest) => {
                const [, sSequence = "0"] = (oRequest.requestNumber || "").match(/REQ-2026-(\d+)/) || [];
                return Math.max(iMax, parseInt(sSequence, 10));
            }, 0);

            return `REQ-2026-${String(iMaxSeq + 1).padStart(4, "0")}`;
        },

        /**
         * Builds a legacy single-role access request.
         * @param {object} mParams Request build parameters.
         * @returns {object} New request payload.
         */
        buildNewRequest(mParams) {
            return buildRequestEnvelope(mParams, {
                roleId: mParams.role.roleId,
                roleName: mParams.role.roleName
            });
        },

        /**
         * Builds an access request from metadata-driven form selections.
         * @param {object} mParams Request build parameters.
         * @returns {object} New dynamic request payload.
         */
        buildDynamicAccessRequest(mParams) {
            const aSelectedEnablers = mParams.selectedEnablers || [];
            const sRoleNameSummary = aSelectedEnablers
                .map((oEnabler) => oEnabler.name)
                .join(", ");

            return buildRequestEnvelope(mParams, {
                roleId: aSelectedEnablers[0]?.roleId || null,
                roleName: sRoleNameSummary,
                selectedEnablers: aSelectedEnablers
            });
        },

        /**
         * Checks whether the current manager can act on the request.
         * @param {object} oRequest Request row.
         * @param {string} sCurrentUserId Current user id.
         * @returns {boolean} Whether manager action is allowed.
         */
        canManagerAct(oRequest, sCurrentUserId) {
            return oRequest.status === "SUBMITTED" && oRequest.approverId === sCurrentUserId;
        },

        /**
         * Approves a request at manager stage.
         * @param {object} oRequest Request row.
         * @param {string} sComment Approval comment.
         * @returns {object} Updated request row.
         */
        approveByManager(oRequest, sComment) {
            oRequest.managerComment = sComment || null;
            oRequest.status = "MANAGER_APPROVED";
            oRequest.updatedOn = now();
            return oRequest;
        },

        /**
         * Rejects a request at manager stage.
         * @param {object} oRequest Request row.
         * @param {string} sComment Rejection comment.
         * @returns {object} Updated request row.
         */
        rejectByManager(oRequest, sComment) {
            oRequest.managerComment = sComment || null;
            oRequest.status = "MANAGER_REJECTED";
            oRequest.updatedOn = now();
            return oRequest;
        },

        /**
         * Checks whether the current user can perform SAP GRC review.
         * @param {object} oRequest Request row.
         * @param {string} sCurrentUserType Current user type.
         * @returns {boolean} Whether SAP GRC action is allowed.
         */
        canSecurityAct(oRequest, sCurrentUserType) {
            return oRequest.status === "MANAGER_APPROVED" && sCurrentUserType === "SECURITY";
        },

        /**
         * Approves a request at SAP GRC stage.
         * @param {object} oRequest Request row.
         * @param {string} sComment Review comment.
         * @returns {object} Updated request row.
         */
        approveBySecurity(oRequest, sComment) {
            oRequest.securityComment = sComment || null;
            oRequest.status = "SAP_APPROVED";
            oRequest.updatedOn = now();
            return oRequest;
        },

        /**
         * Rejects a request at SAP GRC stage.
         * @param {object} oRequest Request row.
         * @param {string} sComment Review comment.
         * @returns {object} Updated request row.
         */
        rejectBySecurity(oRequest, sComment) {
            oRequest.securityComment = sComment || null;
            oRequest.status = "SAP_REJECTED";
            oRequest.updatedOn = now();
            return oRequest;
        },

        /**
         * Checks whether the SAP GRC team can mark a request as provisioned.
         * @param {object} oRequest Request row.
         * @param {string} sCurrentUserType Current user type.
         * @returns {boolean} Whether the complete action is allowed.
         */
        canComplete(oRequest, sCurrentUserType) {
            return oRequest.status === "SAP_APPROVED" && sCurrentUserType === "SECURITY";
        },

        /**
         * Marks a request as provisioned and closes it.
         * @param {object} oRequest Request row.
         * @param {string} sComment Completion comment.
         * @returns {object} Updated request row.
         */
        completeProvisioning(oRequest, sComment) {
            oRequest.securityComment = sComment || oRequest.securityComment;
            oRequest.status = "CLOSED";
            oRequest.updatedOn = now();
            return oRequest;
        },

        /**
         * Checks whether the requestor can withdraw their own request.
         * A request can only be withdrawn before a manager has acted on it.
         * @param {object} oRequest Request row.
         * @param {string} sCurrentUserId Current user id.
         * @returns {boolean} Whether withdrawal is allowed.
         */
        canWithdraw(oRequest, sCurrentUserId) {
            return oRequest.status === "SUBMITTED" && oRequest.requestorId === sCurrentUserId;
        },

        /**
         * Withdraws a request on behalf of its requestor.
         * @param {object} oRequest Request row.
         * @returns {object} Updated request row.
         */
        withdrawRequest(oRequest) {
            oRequest.status = "WITHDRAWN";
            oRequest.updatedOn = now();
            return oRequest;
        }
    };
});
