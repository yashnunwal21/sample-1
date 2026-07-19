sap.ui.define([], () => {
    "use strict";

    const bySortOrder = (oFirst, oSecond) => (oFirst.sortOrder || 0) - (oSecond.sortOrder || 0);
    const activeOnly = (oItem) => oItem.active !== false;

    /**
     * Builds an id lookup for active metadata rows.
     * @param {object[]} aItems Metadata rows.
     * @param {string} sKey Id property name.
     * @returns {object} Lookup map keyed by id.
     */
    const indexById = (aItems = [], sKey) => aItems.reduce((mIndex, oItem) => {
        if (activeOnly(oItem)) {
            mIndex[oItem[sKey]] = oItem;
        }
        return mIndex;
    }, {});

    return {
        /**
         * Builds a Business Area -> Subcategory -> Field tree from normalized metadata.
         * @param {object} oFormConfig Raw configuration payload.
         * @returns {object[]} Nested metadata tree for UI binding.
         */
        buildConfigTree(oFormConfig = {}) {
            const aBusinessAreas = oFormConfig.businessAreas || [];
            const aSubcategories = oFormConfig.subcategories || [];
            const mRequestFields = indexById(oFormConfig.requestFields, "fieldId");
            const aFieldConfig = oFormConfig.subcategoryFieldConfig || [];

            return aBusinessAreas
                .filter(activeOnly)
                .slice()
                .sort(bySortOrder)
                .map((oBusinessArea) => {
                    const aSubcategoryTree = aSubcategories
                        .filter((oSubcategory) => activeOnly(oSubcategory) &&
                            oSubcategory.businessAreaId === oBusinessArea.businessAreaId)
                        .sort(bySortOrder)
                        .map((oSubcategory) => {
                            const aFields = aFieldConfig
                                .filter((oRule) => activeOnly(oRule) &&
                                    oRule.subcategoryId === oSubcategory.subcategoryId &&
                                    mRequestFields[oRule.fieldId])
                                .sort(bySortOrder)
                                .map((oRule) => Object.assign({}, mRequestFields[oRule.fieldId], {
                                    mandatory: !!oRule.mandatory,
                                    sortOrder: oRule.sortOrder,
                                    defaultValue: oRule.defaultValue || "",
                                    valueState: "None",
                                    valueStateText: ""
                                }));

                            return Object.assign({}, oSubcategory, { fields: aFields });
                        });

                    return Object.assign({}, oBusinessArea, { subcategories: aSubcategoryTree });
                });
        },

        /**
         * Finds a configured business area by id.
         * @param {object[]} aConfigTree Metadata tree.
         * @param {string} sBusinessAreaId Business area id.
         * @returns {object|null} Matching business area or null.
         */
        findBusinessArea(aConfigTree = [], sBusinessAreaId) {
            return aConfigTree.find((oBusinessArea) =>
                oBusinessArea.businessAreaId === sBusinessAreaId) || null;
        },

        /**
         * Finds a subcategory and enriches it with its parent business area name.
         * @param {object[]} aConfigTree Metadata tree.
         * @param {string} sSubcategoryId Subcategory id.
         * @returns {object|null} Matching subcategory or null.
         */
        findSubcategory(aConfigTree = [], sSubcategoryId) {
            for (const oBusinessArea of aConfigTree) {
                const oSubcategory = (oBusinessArea.subcategories || [])
                    .find((oItem) => oItem.subcategoryId === sSubcategoryId);

                if (oSubcategory) {
                    return Object.assign({ businessAreaName: oBusinessArea.name }, oSubcategory);
                }
            }

            return null;
        }
    };
});
