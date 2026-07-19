sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/formatter/formatter",
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (formatter, SessionService, MessageBox, MessageToast, Fragment, Controller, JSONModel) => {
    "use strict";

    const KEY_TO_ROUTE = {
        approvals: "approvals",
        dashboard: "dashboard",
        reports: "reports",
        requests: "requestList",
        risk: "riskAnalysis",
        roles: "roles",
        settings: "settings"
    };
    const ROUTE_TO_KEY = {
        approvals: "approvals",
        dashboard: "dashboard",
        reports: "reports",
        requestCreate: "requests",
        requestDetail: "requests",
        requestList: "requests",
        riskAnalysis: "risk",
        roleDetail: "roles",
        roles: "roles",
        settings: "settings"
    };
    // routes only available to Managers and the SAP GRC Team; a normal
    // Employee is redirected to the dashboard if they reach these directly
    const MANAGER_GRC_ONLY_ROUTES = new Set(["approvals", "riskAnalysis", "reports", "settings"]);

    /**
     * Shell controller for navigation, authentication, notifications, and
     * app-level state.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.App", {
        formatter,

        /**
         * Initializes shell state and guards routes behind login.
         * @returns {void}
         */
        onInit() {
            this.getView().setModel(new JSONModel({
                currentUserId: null,
                currentUserInitials: "",
                currentUserName: "",
                isManagerOrGrc: false,
                showShellChrome: true,
                unreadCount: 0
            }), "appView");

            this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
        },

        /**
         * Returns a named owner component model.
         * @param {string} sModelName Model name.
         * @returns {sap.ui.model.Model} Requested model.
         */
        _getModel(sModelName) {
            return this.getOwnerComponent().getModel(sModelName);
        },

        /**
         * Guards routes behind login, toggles shell chrome for the login
         * page, keeps side navigation in sync, and loads the current
         * user's display info.
         * @param {sap.ui.base.Event} oEvent Route matched event.
         * @returns {void}
         */
        _onRouteMatched(oEvent) {
            const sRouteName = oEvent.getParameter("name");
            const oAppViewModel = this.getView().getModel("appView");
            const oRouter = this.getOwnerComponent().getRouter();

            if (sRouteName !== "login" && !SessionService.isLoggedIn()) {
                oRouter.navTo("login");
                return;
            }

            oAppViewModel.setProperty("/showShellChrome", sRouteName !== "login");

            if (sRouteName === "login") {
                return;
            }

            this._loadCurrentUserDisplay(sRouteName);
            this._loadUnreadCount();

            const oSideNav = this.byId("sideNavigation");
            oSideNav?.setSelectedKey(ROUTE_TO_KEY[sRouteName] || "dashboard");
        },

        /**
         * Loads the logged-in user's name and initials for the shell header,
         * and redirects Employees away from Manager/SAP GRC-only routes.
         * @param {string} sRouteName Name of the route that was just matched.
         * @returns {void}
         */
        _loadCurrentUserDisplay(sRouteName) {
            const sUserId = SessionService.getCurrentUserId();
            const oAppViewModel = this.getView().getModel("appView");
            const oUsersModel = this._getModel("users");

            oAppViewModel.setProperty("/currentUserId", sUserId);

            oUsersModel.dataLoaded().then(() => {
                const oUser = (oUsersModel.getProperty("/users") || [])
                    .find((oItem) => oItem.userId === sUserId);

                if (!oUser) {
                    return;
                }

                const bIsManagerOrGrc = oUser.userType !== "EMPLOYEE";
                oAppViewModel.setProperty("/isManagerOrGrc", bIsManagerOrGrc);

                if (!bIsManagerOrGrc && MANAGER_GRC_ONLY_ROUTES.has(sRouteName)) {
                    MessageToast.show("You don't have access to that page.");
                    this.getOwnerComponent().getRouter().navTo("dashboard");
                    return;
                }

                const aNameParts = oUser.fullName.split(" ").filter(Boolean);
                const sInitials = aNameParts.length > 1
                    ? aNameParts[0][0] + aNameParts[aNameParts.length - 1][0]
                    : oUser.fullName.slice(0, 2);

                oAppViewModel.setProperty("/currentUserName", oUser.fullName);
                oAppViewModel.setProperty("/currentUserInitials", sInitials.toUpperCase());
            });
        },

        /**
         * Toggles the shell side navigation.
         * @returns {void}
         */
        onSideNavButtonPress() {
            const oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        /**
         * Navigates to the route selected in the side navigation.
         * @param {sap.ui.base.Event} oEvent Navigation item press event.
         * @returns {void}
         */
        onNavigate(oEvent) {
            const sKey = oEvent.getParameter("item").getKey();
            this.getOwnerComponent().getRouter().navTo(KEY_TO_ROUTE[sKey] || "dashboard");
        },

        /**
         * Confirms and performs sign-out, returning to the login page.
         * @returns {void}
         */
        onAvatarPress() {
            MessageBox.confirm("Sign out of SAP GRC Access Management?", {
                title: "Sign Out",
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        SessionService.logout();
                        this.getOwnerComponent().getRouter().navTo("login");
                    }
                }
            });
        },

        /**
         * Opens the current user's notifications popover.
         * @param {sap.ui.base.Event} oEvent Notification button press event.
         * @returns {void}
         */
        onNotificationPress(oEvent) {
            const oView = this.getView();
            const oButton = oEvent.getSource();

            this._refreshUserNotifications();

            if (!this._pNotificationsPopover) {
                this._pNotificationsPopover = Fragment.load({
                    controller: this,
                    id: oView.getId(),
                    name: "com.sap.grc.sapgrcaccessmanagement.fragments.NotificationsPopover"
                }).then((oPopover) => {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pNotificationsPopover.then((oPopover) => oPopover.openBy(oButton));
        },

        /**
         * Marks the selected notification as read and navigates to its request if present.
         * @param {sap.ui.base.Event} oEvent Notification list item press event.
         * @returns {void}
         */
        onNotificationItemPress(oEvent) {
            const oNotification = oEvent.getSource().getBindingContext("userNotifications").getObject();
            this._markNotificationRead(oNotification.notificationId);

            this._pNotificationsPopover?.then((oPopover) => oPopover.close());

            if (oNotification.relatedRequestId) {
                this.getOwnerComponent().getRouter().navTo("requestDetail", {
                    requestId: oNotification.relatedRequestId
                });
            }
        },

        /**
         * Marks every notification for the current user as read.
         * @returns {void}
         */
        onMarkAllRead() {
            const sUserId = SessionService.getCurrentUserId();
            this._updateNotifications((oNotification) => {
                if (oNotification.userId === sUserId) {
                    oNotification.read = true;
                }
            });
            this._refreshUserNotifications();
        },

        /**
         * Marks a single notification as read.
         * @param {string} sNotificationId Notification id.
         * @returns {void}
         */
        _markNotificationRead(sNotificationId) {
            this._updateNotifications((oNotification) => {
                if (oNotification.notificationId === sNotificationId) {
                    oNotification.read = true;
                }
            });
        },

        /**
         * Mutates notification rows and refreshes the unread badge.
         * @param {Function} fnMutate Mutation callback.
         * @returns {void}
         */
        _updateNotifications(fnMutate) {
            const oNotificationModel = this._getModel("notifications");
            const aNotifications = oNotificationModel.getProperty("/notifications") || [];
            aNotifications.forEach(fnMutate);
            oNotificationModel.setProperty("/notifications", aNotifications);
            this._loadUnreadCount();
        },

        /**
         * Loads unread notification count for the current user.
         * @returns {void}
         */
        _loadUnreadCount() {
            const sUserId = SessionService.getCurrentUserId();
            const oNotificationModel = this._getModel("notifications");
            const oAppViewModel = this.getView().getModel("appView");

            oNotificationModel.dataLoaded().then(() => {
                const aNotifications = oNotificationModel.getProperty("/notifications") || [];
                const iUnread = aNotifications.filter((oNotification) =>
                    oNotification.userId === sUserId && !oNotification.read).length;
                oAppViewModel.setProperty("/unreadCount", iUnread);
            });
        },

        /**
         * Refreshes popover data with notifications for the current user.
         * @returns {void}
         */
        _refreshUserNotifications() {
            const sUserId = SessionService.getCurrentUserId();
            const oView = this.getView();
            const oNotificationModel = this._getModel("notifications");

            oNotificationModel.dataLoaded().then(() => {
                const aNotifications = oNotificationModel.getProperty("/notifications") || [];
                const aMine = aNotifications
                    .filter((oNotification) => oNotification.userId === sUserId)
                    .sort((oFirst, oSecond) => new Date(oSecond.timestamp) - new Date(oFirst.timestamp));
                const oData = {
                    hasUnread: aMine.some((oNotification) => !oNotification.read),
                    items: aMine
                };
                const oUserNotificationModel = oView.getModel("userNotifications");

                if (oUserNotificationModel) {
                    oUserNotificationModel.setData(oData);
                    return;
                }

                oView.setModel(new JSONModel(oData), "userNotifications");
            });
        }
    });
});
