/*global QUnit*/

sap.ui.define([
	"com/sap/grc/sapgrcaccessmanagement/controller/App.controller"
], function (Controller) {
	"use strict";

	QUnit.module("App Controller");

	QUnit.test("I should test the App controller", function (assert) {
		const oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});

