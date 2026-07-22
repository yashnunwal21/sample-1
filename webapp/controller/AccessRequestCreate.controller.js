sap.ui.define([
    "com/sap/grc/sapgrcaccessmanagement/util/FormConfigService",
    "com/sap/grc/sapgrcaccessmanagement/util/SessionService",
    "com/sap/grc/sapgrcaccessmanagement/util/WorkflowService",
    "sap/m/CheckBox",
    "sap/m/DatePicker",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Select",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/VBox",
    "sap/ui/core/Item",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function () {
    "use strict";

    const [
        FormConfigService,
        SessionService,
        WorkflowService,
        CheckBox,
        DatePicker,
        Input,
        Label,
        MessageBox,
        MessageToast,
        Select,
        Text,
        TextArea,
        VBox,
        Item,
        Controller,
        JSONModel
    ] = Array.prototype.slice.call(arguments);
    const FIELD_TYPES = {
        CHECKBOX: "CheckBox",
        DATE: "Date",
        NUMBER: "Number",
        SELECT: "Select",
        TEXTAREA: "TextArea"
    };

    /**
     * Controller for the metadata-driven access request creation page.
     */
    return Controller.extend("com.sap.grc.sapgrcaccessmanagement.controller.AccessRequestCreate", {
        /**
         * Loads form metadata and initializes view state.
         * @returns {void}
         */
        onInit() {
            const oFormViewModel = new JSONModel({
                businessAreas: [],
                availableRoles: [],
                currentEmployee: null,
                dynamicFields: [],
                employeeIdInput: "",
                employeeLookupError: "",
                forSelfIndex: 0,
                outsiderEmail: "",
                outsiderMobile: "",
                outsiderName: "",
                outsiderOrganization: "",
                outsiderPurpose: "",
                requesterType: "MSIL",
                selectedBusinessAreaDescription: "",
                selectedBusinessAreaId: "",
                selectedRoleDescription: "",
                selectedRoleId: "",
                selectedRoleName: "",
                selectedSubcategoryDescription: "",
                selectedSubcategoryId: "",
                showConfigurationSteps: false,
                subcategories: [],
                targetEmployee: null,
                targetSummary: ""
            });
            this.getView().setModel(oFormViewModel, "formView");

            this._getModel("users").dataLoaded().then(() => this._loadSelfEmployeeDetails())
                .catch(() => {
                    oFormViewModel.setProperty("/employeeLookupError", "Unable to load logged-in employee details.");
                    this._updateStepState();
                });

            const oFormConfigModel = this._getModel("formConfig");
            oFormConfigModel.dataLoaded().then(() => {
                this._aConfigTree = FormConfigService.buildConfigTree(oFormConfigModel.getData());
                oFormViewModel.setProperty("/businessAreas", this._aConfigTree.map(({ businessAreaId, description, name }) => ({
                    businessAreaId,
                    description,
                    name
                })));
            });

            this.getOwnerComponent().getRouter().getRoute("requestCreate")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Re-runs the self-employee lookup on every visit to this page. A
         * view instance's onInit only fires once, so without this, a first
         * load that happened before login finished (e.g. a direct/bookmarked
         * link, or a page refresh while on this route) would leave the
         * "For Yourself" details permanently blank even after logging in
         * and returning here. Matches the same attachPatternMatched pattern
         * already used by AccessRequestDetail and Approvals.
         * @returns {void}
         */
        _onRouteMatched() {
            this._getModel("users").dataLoaded().then(() => this._loadSelfEmployeeDetails());
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
         * Returns the local view model used by the dynamic form.
         * @returns {sap.ui.model.json.JSONModel} Form view model.
         */
        _getFormViewModel() {
            return this.getView().getModel("formView");
        },

        /**
         * Returns the simulated logged-in user.
         * @returns {object|undefined} Current user row.
         */
        _getCurrentUser() {
            const aUsers = this._getModel("users").getProperty("/users") || [];
            return aUsers.find((oUser) => oUser.userId === SessionService.getCurrentUserId());
        },

        /**
         * Converts a user master row into the employee payload shown in the form.
         * @param {object} oUser User master row.
         * @returns {object} Employee details for the form.
         */
        _employeeDetailsFromUser(oUser) {
            return {
                department: oUser.department,
                designation: oUser.jobTitle,
                email: oUser.email,
                employeeId: oUser.employeeId,
                employmentType: "MSIL",
                fullName: oUser.fullName,
                managerName: oUser.managerName,
                plant: oUser.plant,
                userId: oUser.userId
            };
        },

        /**
         * Loads the logged-in user's own employee details for the Self flow.
         * @returns {void}
         */
        _loadSelfEmployeeDetails() {
            const oFormViewModel = this._getFormViewModel();
            const oCurrentUser = this._getCurrentUser();

            if (!oCurrentUser || !/^\d{6}$/.test(oCurrentUser.employeeId || "")) {
                oFormViewModel.setProperty("/currentEmployee", null);
                oFormViewModel.setProperty("/employeeLookupError", "Logged-in user's 6-digit MSIL Staff ID could not be found.");
                this._resetConfigurationSelections();
                this._updateStepState();
                return;
            }

            oFormViewModel.setProperty("/employeeLookupError", "");
            oFormViewModel.setProperty("/currentEmployee", this._employeeDetailsFromUser(oCurrentUser));
            this._updateStepState();
        },

        /**
         * Clears all request configuration selected after requester details.
         * @returns {void}
         */
        _resetConfigurationSelections() {
            const oFormViewModel = this._getFormViewModel();
            oFormViewModel.setProperty("/selectedBusinessAreaDescription", "");
            oFormViewModel.setProperty("/selectedBusinessAreaId", "");
            oFormViewModel.setProperty("/selectedSubcategoryDescription", "");
            oFormViewModel.setProperty("/selectedSubcategoryId", "");
            oFormViewModel.setProperty("/subcategories", []);
            this._resetRoleAndFields();
        },

        /**
         * Returns true once the request target section has enough information.
         * @returns {boolean} Whether employee details are complete.
         */
        _isEmployeeStepComplete() {
            const oFormViewModel = this._getFormViewModel();
            const sRequesterType = oFormViewModel.getProperty("/requesterType");

            if (sRequesterType === "MSIL") {
                const oEmployee = oFormViewModel.getProperty(oFormViewModel.getProperty("/forSelfIndex") === 0 ? "/currentEmployee" : "/targetEmployee");
                return !!(oEmployee && oEmployee.employeeId && oEmployee.fullName && oEmployee.department && oEmployee.designation && oEmployee.email);
            }

            const sEmail = (oFormViewModel.getProperty("/outsiderEmail") || "").trim();
            return !!(
                (oFormViewModel.getProperty("/outsiderName") || "").trim() &&
                (oFormViewModel.getProperty("/outsiderOrganization") || "").trim() &&
                /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sEmail) &&
                (oFormViewModel.getProperty("/outsiderMobile") || "").trim() &&
                (oFormViewModel.getProperty("/outsiderPurpose") || "").trim()
            );
        },

        /**
         * Refreshes the target summary and enables the next request steps.
         * @returns {void}
         */
        _updateStepState() {
            const oFormViewModel = this._getFormViewModel();
            const sRequesterType = oFormViewModel.getProperty("/requesterType");
            let sTargetSummary = "";

            if (sRequesterType === "MSIL" && oFormViewModel.getProperty("/forSelfIndex") === 0) {
                const oEmployee = oFormViewModel.getProperty("/currentEmployee");
                if (oEmployee) {
                    sTargetSummary = `${oEmployee.employeeId} - ${oEmployee.fullName} | ${oEmployee.department} | MSIL`;
                }
            } else if (sRequesterType === "MSIL") {
                const oEmployee = oFormViewModel.getProperty("/targetEmployee");
                if (oEmployee) {
                    sTargetSummary = `${oEmployee.employeeId} - ${oEmployee.fullName} | ${oEmployee.department} | MSIL`;
                }
            } else if (this._isEmployeeStepComplete()) {
                sTargetSummary = `${oFormViewModel.getProperty("/outsiderName")} | ${oFormViewModel.getProperty("/outsiderOrganization")} | External`;
            }

            oFormViewModel.setProperty("/showConfigurationSteps", this._isEmployeeStepComplete());
            oFormViewModel.setProperty("/targetSummary", sTargetSummary);
        },

        /**
         * Clears role and enabler selections when an earlier step changes.
         * @returns {void}
         */
        _resetRoleAndFields() {
            const oFormViewModel = this._getFormViewModel();
            oFormViewModel.setProperty("/availableRoles", []);
            oFormViewModel.setProperty("/selectedRoleDescription", "");
            oFormViewModel.setProperty("/selectedRoleId", "");
            oFormViewModel.setProperty("/selectedRoleName", "");
            oFormViewModel.setProperty("/dynamicFields", []);
            this._clearDynamicFields();
        },

        /**
         * Loads SAP catalog roles configured for the selected subcategory.
         * @param {string} sSubcategoryId Selected subcategory id.
         * @returns {void}
         */
        _loadRolesForSubcategory(sSubcategoryId) {
            const oFormConfigModel = this._getModel("formConfig");
            const oRolesModel = this._getModel("roles");

            oRolesModel.dataLoaded().then(() => {
                const aMappings = oFormConfigModel.getProperty("/subcategoryRoleConfig") || [];
                const aRoles = oRolesModel.getProperty("/roles") || [];
                const aAvailableRoles = aMappings
                    .filter((oMapping) => oMapping.subcategoryId === sSubcategoryId && oMapping.active)
                    .sort((oFirst, oSecond) => oFirst.sortOrder - oSecond.sortOrder)
                    .map((oMapping) => aRoles.find((oRole) => oRole.roleId === oMapping.roleId))
                    .filter(Boolean);

                this._getFormViewModel().setProperty("/availableRoles", aAvailableRoles);
            });
        },

        /**
         * Resets requester-specific fields when the requester type changes,
         * so stale lookups or outsider details don't leak between the two flows.
         * @returns {void}
         */
        onRequesterTypeChange() {
            const oFormViewModel = this._getFormViewModel();
            oFormViewModel.setProperty("/forSelfIndex", 0);
            oFormViewModel.setProperty("/employeeIdInput", "");
            oFormViewModel.setProperty("/employeeLookupError", "");
            oFormViewModel.setProperty("/targetEmployee", null);
            oFormViewModel.setProperty("/outsiderName", "");
            oFormViewModel.setProperty("/outsiderOrganization", "");
            oFormViewModel.setProperty("/outsiderEmail", "");
            oFormViewModel.setProperty("/outsiderMobile", "");
            oFormViewModel.setProperty("/outsiderPurpose", "");
            this._resetConfigurationSelections();

            if (oFormViewModel.getProperty("/requesterType") === "MSIL") {
                this._loadSelfEmployeeDetails();
                return;
            }

            oFormViewModel.setProperty("/currentEmployee", null);
            this._updateStepState();
        },

        /**
         * Looks up an MSIL employee by their 6-digit Staff ID. This is a
         * mock lookup against the users mock data; replace with an OData
         * call to the employee master service once available.
         * @returns {void}
         */
        onEmployeeLookup() {
            const oFormViewModel = this._getFormViewModel();
            const sEmployeeId = (oFormViewModel.getProperty("/employeeIdInput") || "").trim();

            oFormViewModel.setProperty("/targetEmployee", null);
            this._resetConfigurationSelections();
            this._updateStepState();

            if (!/^\d{6}$/.test(sEmployeeId)) {
                oFormViewModel.setProperty("/employeeLookupError", "Enter a valid 6-digit MSIL Staff ID.");
                this._updateStepState();
                return;
            }

            const aUsers = this._getModel("users").getProperty("/users") || [];
            const oEmployee = aUsers.find((oUser) => oUser.employeeId === sEmployeeId);

            if (!oEmployee) {
                oFormViewModel.setProperty("/employeeLookupError", "No MSIL employee found with that Staff ID.");
                this._updateStepState();
                return;
            }

            oFormViewModel.setProperty("/employeeLookupError", "");
            oFormViewModel.setProperty("/targetEmployee", this._employeeDetailsFromUser(oEmployee));
            this._updateStepState();
        },

        /**
         * Updates step completion while typing outsider details or changing self/other selection.
         * @returns {void}
         */
        onRequesterDetailsChange() {
            this._resetConfigurationSelections();
            this._updateStepState();
        },

        /**
         * Clones configured fields and initializes transient UI state.
         * @param {object[]} aFields Configured fields.
         * @returns {object[]} Field state for the dynamic form.
         */
        _cloneFieldsWithInitialValues(aFields = []) {
            return JSON.parse(JSON.stringify(aFields)).map((oField) => Object.assign(oField, {
                value: oField.defaultValue || "",
                valueState: "None",
                valueStateText: ""
            }));
        },

        /**
         * Removes all generated field controls.
         * @returns {void}
         */
        _clearDynamicFields() {
            this.byId("dynamicFieldsBox")?.removeAllItems();
        },

        /**
         * Builds common value-state bindings for generated input controls.
         * @param {string} sFieldPath Field model path.
         * @returns {object} Value-state binding settings.
         */
        _valueStateBindings(sFieldPath) {
            return {
                valueState: `{formView>${sFieldPath}/valueState}`,
                valueStateText: `{formView>${sFieldPath}/valueStateText}`
            };
        },

        /**
         * Creates exactly one UI control for one metadata field.
         * @param {string} sFieldPath Field model path.
         * @param {object} oField Field metadata.
         * @returns {sap.ui.core.Control} Generated field control.
         */
        _createFieldControl(sFieldPath, oField) {
            const mValueState = this._valueStateBindings(sFieldPath);
            const sValueBinding = `{formView>${sFieldPath}/value}`;
            let oControl;

            switch (oField.fieldType) {
                case FIELD_TYPES.SELECT:
                    oControl = new Select(Object.assign({
                        change: this.onDynamicFieldChange.bind(this),
                        forceSelection: false,
                        selectedKey: sValueBinding,
                        width: "100%"
                    }, mValueState));
                    oControl.bindAggregation("items", {
                        path: `formView>${sFieldPath}/options`,
                        template: new Item({
                            key: "{formView>key}",
                            text: "{formView>text}"
                        })
                    });
                    break;
                case FIELD_TYPES.TEXTAREA:
                    oControl = new TextArea(Object.assign({
                        growing: true,
                        growingMaxLines: 8,
                        liveChange: this.onDynamicFieldChange.bind(this),
                        placeholder: oField.placeholder || "",
                        rows: 4,
                        value: sValueBinding,
                        width: "100%"
                    }, mValueState));
                    break;
                case FIELD_TYPES.NUMBER:
                    oControl = new Input(Object.assign({
                        liveChange: this.onDynamicFieldChange.bind(this),
                        placeholder: oField.placeholder || "",
                        type: "Number",
                        value: sValueBinding
                    }, mValueState));
                    break;
                case FIELD_TYPES.DATE:
                    oControl = new DatePicker(Object.assign({
                        change: this.onDynamicFieldChange.bind(this),
                        displayFormat: "medium",
                        placeholder: oField.placeholder || "",
                        value: sValueBinding,
                        valueFormat: "yyyy-MM-dd"
                    }, mValueState));
                    break;
                case FIELD_TYPES.CHECKBOX:
                    oControl = new CheckBox({
                        select: this.onDynamicFieldChange.bind(this),
                        selected: sValueBinding,
                        text: oField.helpText || oField.label
                    });
                    break;
                default:
                    oControl = new Input(Object.assign({
                        liveChange: this.onDynamicFieldChange.bind(this),
                        placeholder: oField.placeholder || "",
                        value: sValueBinding
                    }, mValueState));
            }

            oControl.data("fieldPath", sFieldPath);
            return oControl;
        },

        /**
         * Renders all configured fields for the selected subcategory.
         * @returns {void}
         */
        _renderDynamicFields() {
            const oDynamicFieldsBox = this.byId("dynamicFieldsBox");
            const aFields = this._getFormViewModel().getProperty("/dynamicFields") || [];

            if (!oDynamicFieldsBox) {
                return;
            }

            oDynamicFieldsBox.removeAllItems();
            aFields.forEach((oField, iIndex) => {
                const sFieldPath = `/dynamicFields/${iIndex}`;
                const oWrapper = new VBox({
                    items: [
                        new Label({
                            required: `{formView>${sFieldPath}/mandatory}`,
                            text: `{formView>${sFieldPath}/label}`
                        }),
                        this._createFieldControl(sFieldPath, oField)
                    ]
                }).addStyleClass("grcDynamicField");

                if (oField.fieldType !== FIELD_TYPES.CHECKBOX && oField.helpText) {
                    oWrapper.addItem(new Text({
                        text: `{formView>${sFieldPath}/helpText}`
                    }).addStyleClass("grcFieldHelp sapUiTinyMarginTop"));
                }

                oDynamicFieldsBox.addItem(oWrapper);
            });
        },

        /**
         * Handles business area selection and loads dependent subcategories.
         * @param {sap.ui.base.Event} oEvent Select change event.
         * @returns {void}
         */
        onBusinessAreaChange(oEvent) {
            const sBusinessAreaId = oEvent.getParameter("selectedItem")?.getKey() || "";
            const oFormViewModel = this._getFormViewModel();
            const oBusinessArea = FormConfigService.findBusinessArea(this._aConfigTree, sBusinessAreaId);

            oFormViewModel.setProperty("/selectedBusinessAreaId", sBusinessAreaId);
            oFormViewModel.setProperty("/selectedSubcategoryId", "");
            oFormViewModel.setProperty("/selectedSubcategoryDescription", "");
            this._resetRoleAndFields();

            if (!oBusinessArea) {
                oFormViewModel.setProperty("/selectedBusinessAreaDescription", "");
                oFormViewModel.setProperty("/subcategories", []);
                return;
            }

            oFormViewModel.setProperty("/selectedBusinessAreaDescription", oBusinessArea.description);
            oFormViewModel.setProperty("/subcategories", (oBusinessArea.subcategories || []).map(({ description, name, subcategoryId }) => ({
                description,
                name,
                subcategoryId
            })));
        },

        /**
         * Handles subcategory selection and renders configured fields.
         * @param {sap.ui.base.Event} oEvent Select change event.
         * @returns {void}
         */
        onSubcategoryChange(oEvent) {
            const sSubcategoryId = oEvent.getParameter("selectedItem")?.getKey() || "";
            const oFormViewModel = this._getFormViewModel();
            const oSubcategory = FormConfigService.findSubcategory(this._aConfigTree, sSubcategoryId);

            oFormViewModel.setProperty("/selectedSubcategoryId", sSubcategoryId);
            this._resetRoleAndFields();

            if (!oSubcategory) {
                oFormViewModel.setProperty("/selectedSubcategoryDescription", "");
                return;
            }

            oFormViewModel.setProperty("/selectedSubcategoryDescription", oSubcategory.description);
            this._loadRolesForSubcategory(sSubcategoryId);
        },

        /**
         * Handles role selection and enables role enabler fields.
         * @param {sap.ui.base.Event} oEvent Select change event.
         * @returns {void}
         */
        onRoleChange(oEvent) {
            const sRoleId = oEvent.getParameter("selectedItem")?.getKey() || "";
            const oFormViewModel = this._getFormViewModel();
            const aRoles = oFormViewModel.getProperty("/availableRoles") || [];
            const oRole = aRoles.find((oItem) => oItem.roleId === sRoleId);
            const oSubcategory = FormConfigService.findSubcategory(this._aConfigTree, oFormViewModel.getProperty("/selectedSubcategoryId"));

            oFormViewModel.setProperty("/selectedRoleId", sRoleId);
            oFormViewModel.setProperty("/selectedRoleName", oRole?.roleName || "");
            oFormViewModel.setProperty("/selectedRoleDescription", oRole?.description || "");
            oFormViewModel.setProperty("/dynamicFields", oRole && oSubcategory ? this._cloneFieldsWithInitialValues(oSubcategory.fields) : []);
            this._renderDynamicFields();
        },

        /**
         * Clears validation state for a generated field after user input.
         * @param {sap.ui.base.Event} oEvent Generated control change event.
         * @returns {void}
         */
        onDynamicFieldChange(oEvent) {
            const sFieldPath = oEvent.getSource().data("fieldPath");
            const oFormViewModel = this._getFormViewModel();

            if (sFieldPath) {
                oFormViewModel.setProperty(`${sFieldPath}/valueState`, "None");
                oFormViewModel.setProperty(`${sFieldPath}/valueStateText`, "");
            }
        },

        /**
         * Navigates back to the dashboard.
         * @returns {void}
         */
        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Collects field values and validates configured mandatory fields.
         * @returns {object} Selected fields, missing field labels, and reason text.
         */
        _collectFieldValues() {
            const aFields = this._getFormViewModel().getProperty("/dynamicFields") || [];
            const aMissingFields = [];
            let sReason = "";

            aFields.forEach((oField) => {
                const vValue = typeof oField.value === "string" ? oField.value.trim() : oField.value;
                const bEmpty = vValue === undefined || vValue === null || vValue === "";

                oField.valueState = "None";
                oField.valueStateText = "";

                if (oField.mandatory && bEmpty) {
                    oField.valueState = "Error";
                    oField.valueStateText = `${oField.label} is required.`;
                    aMissingFields.push(oField.label);
                }

                if (oField.fieldId === "REASON") {
                    sReason = vValue || "";
                }
            });

            return {
                fields: aFields,
                missingFields: aMissingFields,
                reason: sReason
            };
        },

        /**
         * Validates the "who is this request for" section and builds the
         * target payload passed to WorkflowService. Returns null (after
         * showing the relevant message) if the section is incomplete.
         * @returns {object|null} Resolved target, or null if invalid.
         */
        _resolveTarget() {
            const oFormViewModel = this._getFormViewModel();
            const sRequesterType = oFormViewModel.getProperty("/requesterType");

            if (sRequesterType === "MSIL") {
                if (oFormViewModel.getProperty("/forSelfIndex") === 0) {
                    const oCurrentEmployee = oFormViewModel.getProperty("/currentEmployee");
                    if (!oCurrentEmployee) {
                        MessageToast.show("Logged-in employee details are not loaded yet.");
                        return null;
                    }

                    return Object.assign({ type: "MSIL" }, oCurrentEmployee);
                }

                const oTargetEmployee = oFormViewModel.getProperty("/targetEmployee");
                if (!oTargetEmployee) {
                    MessageToast.show("Look up and confirm the MSIL employee before submitting.");
                    return null;
                }

                return Object.assign({ type: "MSIL" }, oTargetEmployee);
            }

            const sName = (oFormViewModel.getProperty("/outsiderName") || "").trim();
            const sOrganization = (oFormViewModel.getProperty("/outsiderOrganization") || "").trim();
            const sEmail = (oFormViewModel.getProperty("/outsiderEmail") || "").trim();
            const sMobile = (oFormViewModel.getProperty("/outsiderMobile") || "").trim();
            const sPurpose = (oFormViewModel.getProperty("/outsiderPurpose") || "").trim();
            const aMissing = [];

            if (!sName) { aMissing.push("Full Name"); }
            if (!sOrganization) { aMissing.push("Organization / Company"); }
            if (!sEmail) { aMissing.push("Email"); }
            if (!sMobile) { aMissing.push("Mobile Number"); }
            if (!sPurpose) { aMissing.push("Purpose of Access"); }

            if (aMissing.length > 0) {
                MessageBox.error(`Please complete the following outsider details: ${aMissing.join(", ")}.`);
                return null;
            }

            return {
                type: "OUTSIDER",
                fullName: sName,
                organization: sOrganization,
                email: sEmail,
                mobile: sMobile,
                purpose: sPurpose
            };
        },

        /**
         * Validates and submits the metadata-driven access request.
         * @returns {void}
         */
        onSubmit() {
            const oFormViewModel = this._getFormViewModel();
            const oTarget = this._resolveTarget();

            if (!oTarget) {
                return;
            }

            const sBusinessAreaId = oFormViewModel.getProperty("/selectedBusinessAreaId");
            const sSubcategoryId = oFormViewModel.getProperty("/selectedSubcategoryId");
            const sRoleId = oFormViewModel.getProperty("/selectedRoleId");
            const aAvailableRoles = oFormViewModel.getProperty("/availableRoles") || [];
            const oSelectedRole = aAvailableRoles.find((oRole) => oRole.roleId === sRoleId);
            const oSubcategory = FormConfigService.findSubcategory(this._aConfigTree, sSubcategoryId);

            if (!sBusinessAreaId) {
                MessageToast.show("Please select a business area.");
                return;
            }

            if (!sSubcategoryId || !oSubcategory) {
                MessageToast.show("Please select a subcategory.");
                return;
            }

            if (!oSelectedRole) {
                MessageToast.show("Please select a SAP role.");
                return;
            }

            const oResult = this._collectFieldValues();
            oFormViewModel.refresh(true);

            if (oResult.missingFields.length > 0) {
                MessageBox.error(`Please complete the required fields: ${oResult.missingFields.join(", ")}.`);
                return;
            }

            const oRequestsModel = this._getModel("accessRequests");
            const aRequests = oRequestsModel.getProperty("/accessRequests") || [];
            const sRequestNumber = WorkflowService.generateRequestNumber(aRequests);
            const { businessAreaName: sBusinessAreaName, name: sSubcategoryName } = oSubcategory;
            const oNewRequest = WorkflowService.buildDynamicAccessRequest({
                businessJustification: oResult.reason || `${sBusinessAreaName} - ${sSubcategoryName}`,
                currentUser: this._getCurrentUser(),
                requestNumber: sRequestNumber,
                target: oTarget,
                selectedEnablers: [{
                    businessAreaId: sBusinessAreaId,
                    businessAreaName: sBusinessAreaName,
                    enablerId: sRoleId,
                    fields: oResult.fields.map(({ fieldId, fieldType, label, mandatory, value }) => ({
                        fieldId,
                        fieldType,
                        label,
                        mandatory,
                        value
                    })),
                    name: oSelectedRole.roleName,
                    roleDescription: oSelectedRole.description,
                    roleId: oSelectedRole.roleId,
                    riskLevel: oSelectedRole.riskLevel || "Configured",
                    subcategoryId: sSubcategoryId,
                    subcategoryName: sSubcategoryName
                }]
            });

            aRequests.push(oNewRequest);
            oRequestsModel.setProperty("/accessRequests", aRequests);

            const bAutoApproved = oNewRequest.status === "MANAGER_APPROVED";

            MessageBox.success(
                bAutoApproved
                    ? `Request ${sRequestNumber} submitted and auto-approved. Routed directly to the SAP GRC team (DE-DCG) for review.`
                    : `Request ${sRequestNumber} submitted for ${oTarget.fullName}` +
                        `${oNewRequest.approverName ? ` and routed to ${oNewRequest.approverName} for approval.` : "."}`,
                {
                    onClose: () => this.getOwnerComponent().getRouter().navTo("dashboard")
                }
            );
        }
    });
});