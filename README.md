## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Wed Jul 01 2026 11:27:34 GMT+0530 (India Standard Time)|
|**App Generator**<br>SAP Fiori Application Generator|
|**App Generator Version**<br>1.27.0|
|**Generation Platform**<br>Visual Studio Code|
|**Template Used**<br>Basic|
|**Service Type**<br>None|
|**Service URL**<br>N/A|
|**Module Name**<br>sap-grc-access-management|
|**Application Title**<br>SAP GRC Access Management|
|**Namespace**<br>com.sap.grc|
|**UI5 Theme**<br>sap_horizon|
|**UI5 Version**<br>1.149.1|
|**Enable TypeScript**<br>False|
|**Add Eslint configuration**<br>True, see https://www.npmjs.com/package/@sap-ux/eslint-plugin-fiori-tools#rules for the eslint rules.|

## sap-grc-access-management

An SAP Fiori application.

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  To launch the generated application, run the following from the generated application root folder:

```
    npm start
```

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)



## Hybrid UI Strategy

This application should follow a practical hybrid SAP Fiori architecture:

- **Freestyle UI5** for custom workflow and experience-heavy screens: Dashboard, Dynamic Access Request Create, Approval Workflow, Risk Dashboard, Notifications, and Shell Navigation.
- **Fiori Elements** for data-heavy OData-driven screens: Access Request List, Role Catalog, User Management, Reports, and Risk Rules.

The current project remains the Freestyle UI5 shell and workflow application. Future Fiori Elements applications should be generated separately once the SAP OData service and annotations are available.

See [docs/hybrid-ui-strategy.md](docs/hybrid-ui-strategy.md) for the recommended split, semantic object/action mapping, and OData entity design.
