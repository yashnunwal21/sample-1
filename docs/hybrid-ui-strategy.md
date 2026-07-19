# SAP GRC Access Management - Hybrid UI Strategy

This project is currently a Freestyle SAPUI5 application. It should remain Freestyle for the parts of the solution that need custom user experience, workflow behavior, dynamic form rendering, notifications, or role-based dashboards.

For production SAP landscape integration, data-heavy maintenance and reporting screens should be moved to separate Fiori Elements applications once the OData services and annotations are available.

## Recommended Application Split

### Freestyle UI5

Keep these capabilities in the current Freestyle UI5 app:

- Dashboard
- Dynamic Access Request Create page
- Approval Workflow
- Risk Dashboard
- Notifications
- Shell Navigation

Reason: these screens need custom behavior, role-specific cards, workflow actions, dynamic metadata-driven controls, and custom navigation.

### Fiori Elements

Build these as Fiori Elements apps when the OData services are ready:

- Access Request List
- Role Catalog
- User Management
- Reports
- Risk Rules

Reason: these are mostly list, filter, object page, and reporting scenarios where OData annotations can drive the UI with less custom code.

## Navigation Approach

In production, launch all apps from SAP Fiori Launchpad using semantic objects and actions.

Recommended examples:

| Capability | App Type | Semantic Object | Action |
| --- | --- | --- | --- |
| Dashboard | Freestyle UI5 | `GRCRequest` | `displayDashboard` |
| Create Access Request | Freestyle UI5 | `GRCRequest` | `create` |
| Approval Workflow | Freestyle UI5 | `GRCApproval` | `review` |
| Access Request List | Fiori Elements List Report | `GRCRequest` | `display` |
| Role Catalog | Fiori Elements List Report | `GRCRole` | `display` |
| User Management | Fiori Elements List Report/Object Page | `GRCUser` | `manage` |
| Reports | Fiori Elements Analytical List Page | `GRCReport` | `analyze` |
| Risk Rules | Fiori Elements List Report | `GRCRiskRule` | `manage` |

## OData Service Recommendation

Use one clean SAP Gateway service or RAP service for the GRC domain. Keep business rules in SAP backend.

Suggested entity sets:

- `AccessRequests`
- `AccessRequestFieldValues`
- `BusinessAreas`
- `Subcategories`
- `RequestFields`
- `SubcategoryFieldConfigs`
- `Roles`
- `Users`
- `RiskRules`
- `ApprovalLogs`
- `Notifications`

Suggested actions:

- `SubmitRequest`
- `ApproveByManager`
- `RejectByManager`
- `ApproveByGRC`
- `RejectByGRC`
- `SetInProgress`
- `CompleteRequest`

## Development Rule

Do not move a screen to Fiori Elements only because it is possible. Move it only when the screen is mostly CRUD/list/reporting and can be cleanly represented by OData annotations.

Keep custom workflow screens Freestyle.
