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
                selectedSubcategoryDescription: "",
                selectedSubcategoryId: "",
                subcategories: [],
                targetEmployee: null
            });
            this.getView().setModel(oFormViewModel, "formView");

            const oCurrentUser = this._getCurrentUser();
            if (oCurrentUser) {
                oFormViewModel.setProperty("/currentEmployee", {
                    employeeId: oCurrentUser.employeeId,
                    fullName: oCurrentUser.fullName,
                    department: oCurrentUser.department,
                    plant: oCurrentUser.plant
                });
            }

            const oFormConfigModel = this._getModel("formConfig");
            oFormConfigModel.dataLoaded().then(() => {
                this._aConfigTree = FormConfigService.buildConfigTree(oFormConfigModel.getData());
                oFormViewModel.setProperty("/businessAreas", this._aConfigTree.map(({ businessAreaId, description, name }) => ({
                    businessAreaId,
                    description,
                    name
                })));
            });
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
        },

        /**
         * Looks up an MSIL employee by their 6-digit Employee ID. This is a
         * mock lookup against the users mock data; replace with an OData
         * call to the employee master service once available.
         * @returns {void}
         */
        onEmployeeLookup() {
            const oFormViewModel = this._getFormViewModel();
            const sEmployeeId = (oFormViewModel.getProperty("/employeeIdInput") || "").trim();

            oFormViewModel.setProperty("/targetEmployee", null);

            if (!/^\d{6}$/.test(sEmployeeId)) {
                oFormViewModel.setProperty("/employeeLookupError", "Enter a valid 6-digit MSIL Employee ID.");
                return;
            }

            const aUsers = this._getModel("users").getProperty("/users") || [];
            const oEmployee = aUsers.find((oUser) => oUser.employeeId === sEmployeeId);

            if (!oEmployee) {
                oFormViewModel.setProperty("/employeeLookupError", "No MSIL employee found with that Employee ID.");
                return;
            }

            oFormViewModel.setProperty("/employeeLookupError", "");
            oFormViewModel.setProperty("/targetEmployee", {
                userId: oEmployee.userId,
                employeeId: oEmployee.employeeId,
                fullName: oEmployee.fullName,
                department: oEmployee.department,
                plant: oEmployee.plant,
                managerName: oEmployee.managerName
            });
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
            oFormViewModel.setProperty("/dynamicFields", []);
            this._clearDynamicFields();

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

            if (!oSubcategory) {
                oFormViewModel.setProperty("/selectedSubcategoryDescription", "");
                oFormViewModel.setProperty("/dynamicFields", []);
                this._clearDynamicFields();
                return;
            }

            oFormViewModel.setProperty("/selectedSubcategoryDescription", oSubcategory.description);
            oFormViewModel.setProperty("/dynamicFields", this._cloneFieldsWithInitialValues(oSubcategory.fields));
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
         * Navigates back to the access request list.
         * @returns {void}
         */
        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("requestList");
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
                    const oCurrentUser = this._getCurrentUser();
                    return {
                        type: "MSIL",
                        userId: oCurrentUser.userId,
                        fullName: oCurrentUser.fullName,
                        employeeId: oCurrentUser.employeeId,
                        department: oCurrentUser.department,
                        plant: oCurrentUser.plant
                    };
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
            const oSubcategory = FormConfigService.findSubcategory(this._aConfigTree, sSubcategoryId);

            if (!sBusinessAreaId) {
                MessageToast.show("Please select a business area.");
                return;
            }

            if (!sSubcategoryId || !oSubcategory) {
                MessageToast.show("Please select a subcategory.");
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
                    enablerId: sSubcategoryId,
                    fields: oResult.fields.map(({ fieldId, fieldType, label, mandatory, value }) => ({
                        fieldId,
                        fieldType,
                        label,
                        mandatory,
                        value
                    })),
                    name: `${sBusinessAreaName} - ${sSubcategoryName}`,
                    riskLevel: "Configured",
                    subcategoryId: sSubcategoryId,
                    subcategoryName: sSubcategoryName
                }]
            });

            aRequests.push(oNewRequest);
            oRequestsModel.setProperty("/accessRequests", aRequests);

            MessageBox.success(
                `Request ${sRequestNumber} submitted for ${oTarget.fullName}` +
                `${oNewRequest.approverName ? ` and routed to ${oNewRequest.approverName} for approval.` : "."}`,
                {
                    onClose: () => this.getOwnerComponent().getRouter().navTo("requestList")
                }
            );
        }
    });
});