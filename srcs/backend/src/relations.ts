import { relations } from "drizzle-orm/relations";
import { metricCategory, metric, pLanguage, player, country, pRole, status, matchMode, match, matchmetric, playerOrganization, organization, playerFriend, competitor, competitormetric } from "./schema";

export const metricRelations = relations(metric, ({one, many}) => ({
    metricCategory: one(metricCategory, {
        fields: [metric.metricCatFk],
        references: [metricCategory.metricCatePk]
    }),
    matchmetrics: many(matchmetric),
    competitormetrics: many(competitormetric),
}));

export const metricCategoryRelations = relations(metricCategory, ({many}) => ({
    metrics: many(metric),
}));

export const playerRelations = relations(player, ({one, many}) => ({
    pLanguage: one(pLanguage, {
        fields: [player.pLang],
        references: [pLanguage.langPk]
    }),
    country: one(country, {
        fields: [player.pCountry],
        references: [country.coun2Pk]
    }),
    pRole: one(pRole, {
        fields: [player.pRole],
        references: [pRole.rolePk]
    }),
    status: one(status, {
        fields: [player.pStatus],
        references: [status.statusPk]
    }),
    matches: many(match),
    playerOrganizations: many(playerOrganization),
    playerFriends_f1: many(playerFriend, {
        relationName: "playerFriend_f1_player_pPk"
    }),
    playerFriends_f2: many(playerFriend, {
        relationName: "playerFriend_f2_player_pPk"
    }),
    competitors: many(competitor),
}));

export const pLanguageRelations = relations(pLanguage, ({many}) => ({
    players: many(player),
}));

export const countryRelations = relations(country, ({many}) => ({
    players: many(player),
}));

export const pRoleRelations = relations(pRole, ({many}) => ({
    players: many(player),
}));

export const statusRelations = relations(status, ({many}) => ({
    players: many(player),
}));

export const matchmetricRelations = relations(matchmetric, ({one}) => ({
    match: one(match, {
        fields: [matchmetric.mmMatchFk],
        references: [match.mPk]
    }),
    metric: one(metric, {
        fields: [matchmetric.mmCodeFk],
        references: [metric.metricPk]
    }),
}));

export const matchModeRelations = relations(matchMode, ({many}) => ({
    matches: many(match),
}));

export const matchRelations = relations(match, ({one, many}) => ({
    matchmetrics: many(matchmetric),
    // CAMBIO: Renombrado de 'player' a 'winner' para mayor claridad
    winner: one(player, {
        fields: [match.mWinnerFk],
        references: [player.pPk]
    }),
    matchMode: one(matchMode, {
        fields: [match.mModeFk],
        references: [matchMode.mmodPk]
    }),
    competitors: many(competitor),
}));

export const playerOrganizationRelations = relations(playerOrganization, ({one}) => ({
    player: one(player, {
        fields: [playerOrganization.poPFk],
        references: [player.pPk]
    }),
    organization: one(organization, {
        fields: [playerOrganization.poOrgFk],
        references: [organization.orgPk]
    }),
}));

export const organizationRelations = relations(organization, ({many}) => ({
    playerOrganizations: many(playerOrganization),
}));

export const playerFriendRelations = relations(playerFriend, ({one}) => ({
    player_f1: one(player, {
        fields: [playerFriend.f1],
        references: [player.pPk],
        relationName: "playerFriend_f1_player_pPk"
    }),
    player_f2: one(player, {
        fields: [playerFriend.f2],
        references: [player.pPk],
        relationName: "playerFriend_f2_player_pPk"
    }),
}));

export const competitorRelations = relations(competitor, ({one, many}) => ({
    match: one(match, {
        fields: [competitor.mcMatchFk],
        references: [match.mPk]
    }),
    player: one(player, {
        fields: [competitor.mcPlayerFk],
        references: [player.pPk]
    }),
    competitormetrics: many(competitormetric),
}));

export const competitormetricRelations = relations(competitormetric, ({one}) => ({
    metric: one(metric, {
        fields: [competitormetric.mcmMetricFk],
        references: [metric.metricPk]
    }),
    // CAMBIO: Referencia compuesta correcta (Match + Player)
    competitor: one(competitor, {
        fields: [competitormetric.mcmMatchFk, competitormetric.mcmPlayerFk],
        references: [competitor.mcMatchFk, competitor.mcPlayerFk]
    }),
}));