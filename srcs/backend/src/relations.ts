import { relations } from "drizzle-orm/relations";
//import { metricCategory, metric, pLanguage, player, country, pRole, status, matchMode, match, matchmetric, playerOrganization, organization, playerFriend, competitor, competitormetric } from "./schema";
import { metricCategory, metric, pLanguage, player, country, pRole, status, matchMode, match, matchmetric, playerOrganization, organization, playerFriend, competitor, competitormetric, directMessage, channel, channelMember, 
    friendStatus } from "./schema";

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

// export const playerRelations = relations(player, ({one, many}) => ({
//     pLanguage: one(pLanguage, {
//         fields: [player.pLang],
//         references: [pLanguage.langPk]
//     }),
//     country: one(country, {
//         fields: [player.pCountry],
//         references: [country.coun2Pk]
//     }),
//     pRole: one(pRole, {
//         fields: [player.pRole],
//         references: [pRole.rolePk]
//     }),
//     status: one(status, {
//         fields: [player.pStatus],
//         references: [status.statusPk]
//     }),
//     matches: many(match),
//     playerOrganizations: many(playerOrganization),
//     playerFriends_f1: many(playerFriend, {
//         relationName: "playerFriend_f1_player_pPk"
//     }),
//     playerFriends_f2: many(playerFriend, {
//         relationName: "playerFriend_f2_player_pPk"
//     }),
//     competitors: many(competitor),
// }));

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
    // --- NUEVAS RELACIONES DE CHAT ---
    sentMessages: many(directMessage, { relationName: "sentMessages" }),
    receivedMessages: many(directMessage, { relationName: "receivedMessages" }),
    channelMemberships: many(channelMember), // Canales a los que pertenece
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


export const matchRelations = relations(match, ({one, many}) => ({
	matchMode: one(matchMode, {
		fields: [match.mModeFk],
		references: [matchMode.mmodPk]
	}),
	player: one(player, {
		fields: [match.mWinnerFk],
		references: [player.pPk]
	}),
	matchmetrics: many(matchmetric),
	competitors: many(competitor),
}));

export const matchModeRelations = relations(matchMode, ({many}) => ({
	matches: many(match),
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
	friendStatus: one(friendStatus, {
		fields: [playerFriend.fStatusFk],
		references: [friendStatus.fsPk]
	}),
}));

export const friendStatusRelations = relations(friendStatus, ({many}) => ({
	playerFriends: many(playerFriend),
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
	competitor: one(competitor, {
		fields: [competitormetric.mcmMatchFk],
		references: [competitor.mcMatchFk]
	}),
}));

// --- CHAT RELATIONS ---

export const directMessageRelations = relations(directMessage, ({ one }) => ({
    sender: one(player, {
        fields: [directMessage.senderId],
        references: [player.pPk],
        relationName: "sentMessages"
    }),
    receiver: one(player, {
        fields: [directMessage.receiverId],
        references: [player.pPk],
        relationName: "receivedMessages"
    }),
}));

export const channelRelations = relations(channel, ({ one, many }) => ({
    owner: one(player, {
        fields: [channel.ownerId],
        references: [player.pPk],
    }),
    members: many(channelMember),
}));

export const channelMemberRelations = relations(channelMember, ({ one }) => ({
    channel: one(channel, {
        fields: [channelMember.channelId],
        references: [channel.id],
    }),
    user: one(player, {
        fields: [channelMember.userId],
        references: [player.pPk],
    }),
}));

// // --- CHAT RELATIONS ---

// export const directMessageRelations = relations(directMessage, ({ one }) => ({
//     sender: one(player, {
//         fields: [directMessage.senderId],
//         references: [player.pPk],
//         relationName: "sentMessages"
//     }),
//     receiver: one(player, {
//         fields: [directMessage.receiverId],
//         references: [player.pPk],
//         relationName: "receivedMessages"
//     }),
// }));

// export const channelRelations = relations(channel, ({ one, many }) => ({
//     owner: one(player, {
//         fields: [channel.ownerId],
//         references: [player.pPk],
//     }),
//     members: many(channelMember),
// }));

// export const channelMemberRelations = relations(channelMember, ({ one }) => ({
//     channel: one(channel, {
//         fields: [channelMember.channelId],
//         references: [channel.id],
//     }),
//     user: one(player, {
//         fields: [channelMember.userId],
//         references: [player.pPk],
//     }),
// }));