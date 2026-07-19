sap.ui.define([
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], (Device, JSONModel) => {
    "use strict";

    return {
        /**
         * Creates the one-way device model used for responsive bindings.
         * @returns {sap.ui.model.json.JSONModel} Device model.
         */
        createDeviceModel() {
            const oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            return oDeviceModel;
        }
    };
});
