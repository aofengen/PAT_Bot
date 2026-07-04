import { SlashCommandBuilder, PermissionFlagsBits,MessageFlags,ComponentType} from 'discord.js';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, MentionableSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, SlashCommandStringOption } from '@discordjs/builders';
import { readFileSync } from 'node:fs';
import * as configModule from '../../config.json' with { type: "json" };

// ============================================================================
// CONFIGURATION
// ============================================================================
const STAFF_ROLE = configModule.default.config.staffRole;
const BASE_TRACKER_URL = configModule.default.config.baseTrackerUrl;
// ============================================================================

export const data = new SlashCommandBuilder()
	.setName('fetch_runs')
	.setDescription("Fetch run count from specific event.")
    .addBooleanOption(option => option
        .setName('fromfile')
        .setDescription('Create/Update backup runs from provided JSON File (must provide a filename if true or things blow up')
        .setRequired(true))
    .addStringOption(option => option
        .setName('filename')
        .setDescription('file must be present in the backup runs directory. do not include json extension')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);


async function fetchRuns(interaction,obj,eventName) {
    await interaction.editReply({
        content: `Found ${obj.count} runs from ${eventName}!`,
        flags: MessageFlags.Ephemeral,
        components:[],
        withResponse: false,
    });
}

export async function execute(interaction) {
    let member = interaction.member.guild;

    if (member.roles.cache.find(role => role.name === STAFF_ROLE)) {
        const fromFile = interaction.options.getBoolean('fromfile');
        const fileName = interaction.options.getString('filename');
        if (fromFile === true) {
            await interaction.reply({ content: 'looking for file...', flags: MessageFlags.Ephemeral });
            let trackerData = readFileSync(`./backup_runs/${fileName}.json`);
            let obj = JSON.parse(trackerData);
            await fetchRuns(interaction,obj,fileName);
            return;
        }
        //Not from file so fetch events from tracker...

        let eventsData = await fetch(`${BASE_TRACKER_URL}/events/`);
        let eventsobj = await eventsData.json();
        let events = new Array();
        for (let i=0;i<eventsobj.count;i++){
            let currentEvent = eventsobj.results[i];
            events[i] = new StringSelectMenuOptionBuilder()
                .setLabel(currentEvent.name)
                .setDescription("Event Date: "+currentEvent.datetime)
                .setValue(""+currentEvent.id);
        }
        const eventID_select = new StringSelectMenuBuilder()
            .setCustomId('eventList')
            .setPlaceholder('--Select Option--')
            .addOptions(...events);
        const eventIDRow = new ActionRowBuilder().addComponents(eventID_select);
        const response = await interaction.reply({
            content: 'Which event would you like to pull runs from?',
            components: [eventIDRow],
            flags: MessageFlags.Ephemeral,
            withResponse: true,
        });
        const eventFilter = (interaction) => interaction.customId === 'eventList';
        const eventID_Collector = response.resource.message.createMessageComponentCollector({ eventFilter, componentType: ComponentType.StringSelect, time: 120_000 });
        eventID_Collector.on('collect', async (i) => {
            let eventID = i.values[0];
            await i.deferUpdate();
            let eventData = await fetch(`${BASE_TRACKER_URL}/events/${eventID}/`);
            let eventobj = await eventData.json();
            let runsData = await fetch(`${BASE_TRACKER_URL}/events/${eventID}/runs/`);
            let obj = await runsData.json();
            await fetchRuns(interaction,obj,eventobj.name);
        });
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral });
    }
}
