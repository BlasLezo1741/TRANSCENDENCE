"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.competitormetricRelations = exports.competitorRelations = exports.playerFriendRelations = exports.organizationRelations = exports.playerOrganizationRelations = exports.matchmetricRelations = exports.matchModeRelations = exports.matchRelations = exports.metricCategoryRelations = exports.metricRelations = exports.statusRelations = exports.pRoleRelations = exports.countryRelations = exports.pLanguageRelations = exports.playerRelations = void 0;
var relations_1 = require("drizzle-orm/relations");
var schema_1 = require("./schema");
exports.playerRelations = (0, relations_1.relations)(schema_1.player, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        pLanguage: one(schema_1.pLanguage, {
            fields: [schema_1.player.pLang],
            references: [schema_1.pLanguage.langPk]
        }),
        country: one(schema_1.country, {
            fields: [schema_1.player.pCountry],
            references: [schema_1.country.coun2Pk]
        }),
        pRole: one(schema_1.pRole, {
            fields: [schema_1.player.pRole],
            references: [schema_1.pRole.rolePk]
        }),
        status: one(schema_1.status, {
            fields: [schema_1.player.pStatus],
            references: [schema_1.status.statusPk]
        }),
        matches: many(schema_1.match),
        playerOrganizations: many(schema_1.playerOrganization),
        playerFriends_f1: many(schema_1.playerFriend, {
            relationName: "playerFriend_f1_player_pPk"
        }),
        playerFriends_f2: many(schema_1.playerFriend, {
            relationName: "playerFriend_f2_player_pPk"
        }),
        competitors: many(schema_1.competitor),
    });
});
exports.pLanguageRelations = (0, relations_1.relations)(schema_1.pLanguage, function (_a) {
    var many = _a.many;
    return ({
        players: many(schema_1.player),
    });
});
exports.countryRelations = (0, relations_1.relations)(schema_1.country, function (_a) {
    var many = _a.many;
    return ({
        players: many(schema_1.player),
    });
});
exports.pRoleRelations = (0, relations_1.relations)(schema_1.pRole, function (_a) {
    var many = _a.many;
    return ({
        players: many(schema_1.player),
    });
});
exports.statusRelations = (0, relations_1.relations)(schema_1.status, function (_a) {
    var many = _a.many;
    return ({
        players: many(schema_1.player),
    });
});
exports.metricRelations = (0, relations_1.relations)(schema_1.metric, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        metricCategory: one(schema_1.metricCategory, {
            fields: [schema_1.metric.metricCatFk],
            references: [schema_1.metricCategory.metricCatePk]
        }),
        matchmetrics: many(schema_1.matchmetric),
        competitormetrics: many(schema_1.competitormetric),
    });
});
exports.metricCategoryRelations = (0, relations_1.relations)(schema_1.metricCategory, function (_a) {
    var many = _a.many;
    return ({
        metrics: many(schema_1.metric),
    });
});
exports.matchRelations = (0, relations_1.relations)(schema_1.match, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        matchMode: one(schema_1.matchMode, {
            fields: [schema_1.match.mModeFk],
            references: [schema_1.matchMode.mmodPk]
        }),
        player: one(schema_1.player, {
            fields: [schema_1.match.mWinnerFk],
            references: [schema_1.player.pPk]
        }),
        matchmetrics: many(schema_1.matchmetric),
        competitors: many(schema_1.competitor),
    });
});
exports.matchModeRelations = (0, relations_1.relations)(schema_1.matchMode, function (_a) {
    var many = _a.many;
    return ({
        matches: many(schema_1.match),
    });
});
exports.matchmetricRelations = (0, relations_1.relations)(schema_1.matchmetric, function (_a) {
    var one = _a.one;
    return ({
        match: one(schema_1.match, {
            fields: [schema_1.matchmetric.mmMatchFk],
            references: [schema_1.match.mPk]
        }),
        metric: one(schema_1.metric, {
            fields: [schema_1.matchmetric.mmCodeFk],
            references: [schema_1.metric.metricPk]
        }),
    });
});
exports.playerOrganizationRelations = (0, relations_1.relations)(schema_1.playerOrganization, function (_a) {
    var one = _a.one;
    return ({
        player: one(schema_1.player, {
            fields: [schema_1.playerOrganization.poPFk],
            references: [schema_1.player.pPk]
        }),
        organization: one(schema_1.organization, {
            fields: [schema_1.playerOrganization.poOrgFk],
            references: [schema_1.organization.orgPk]
        }),
    });
});
exports.organizationRelations = (0, relations_1.relations)(schema_1.organization, function (_a) {
    var many = _a.many;
    return ({
        playerOrganizations: many(schema_1.playerOrganization),
    });
});
exports.playerFriendRelations = (0, relations_1.relations)(schema_1.playerFriend, function (_a) {
    var one = _a.one;
    return ({
        player_f1: one(schema_1.player, {
            fields: [schema_1.playerFriend.f1],
            references: [schema_1.player.pPk],
            relationName: "playerFriend_f1_player_pPk"
        }),
        player_f2: one(schema_1.player, {
            fields: [schema_1.playerFriend.f2],
            references: [schema_1.player.pPk],
            relationName: "playerFriend_f2_player_pPk"
        }),
    });
});
exports.competitorRelations = (0, relations_1.relations)(schema_1.competitor, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        match: one(schema_1.match, {
            fields: [schema_1.competitor.mcMatchFk],
            references: [schema_1.match.mPk]
        }),
        player: one(schema_1.player, {
            fields: [schema_1.competitor.mcPlayerFk],
            references: [schema_1.player.pPk]
        }),
        competitormetrics: many(schema_1.competitormetric),
    });
});
exports.competitormetricRelations = (0, relations_1.relations)(schema_1.competitormetric, function (_a) {
    var one = _a.one;
    return ({
        metric: one(schema_1.metric, {
            fields: [schema_1.competitormetric.mcmMetricFk],
            references: [schema_1.metric.metricPk]
        }),
        competitor: one(schema_1.competitor, {
            fields: [schema_1.competitormetric.mcmMatchFk],
            references: [schema_1.competitor.mcMatchFk]
        }),
    });
});
