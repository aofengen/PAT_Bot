import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
import { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, MessageFlags, ComponentType } from "discord.js";

// ============================================================================
// CONFIGURATION
// ============================================================================
// Set the name of the channel where milestone announcements will be posted
const OUTPUT_CHANNEL = 'dev-testing';
// ============================================================================

export const data = new SlashCommandBuilder()
    .setName('post_milestones')
    .setDescription('Display milestone information in discord.')
    .addIntegerOption(option => option
        .setName('event')
        .setDescription('Pull milestones from this event ID (number only - for PAT6, enter 6, PAT5 enter 5, etc)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);

export async function execute(interaction) {
    const member = interaction.member;

    if (member.roles.cache.some(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Games Committee')) {
        const eventID = interaction.options.getInteger('event');

        const trackerData = await fetch(`https://tracker.preventathon.com/tracker/api/v2/events/${eventID}/milestones/`);

        if (!trackerData.ok) {
            return await interaction.reply({
                content: `Failed to fetch milestones for event ${eventID}. Please check the event ID.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const miData = await trackerData.json();

        if (!miData.results || miData.results.length === 0) {
            return await interaction.reply({
                content: `No milestones found for event ${eventID}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        let milestoneArray = new Array();
        for (let i = 0; i < miData.count; i++) {
            let cM = miData.results[i];
            let id = cM.id;
            let option = new StringSelectMenuOptionBuilder()
                .setLabel(cM.name.substring(0, 100))
                .setDescription((cM.description || 'No description').substring(0, 100))
                .setValue(id.toString());
            milestoneArray.push(option);
        }

        const confirm = new ButtonBuilder().setCustomId('confirm').setLabel('Yes').setStyle(ButtonStyle.Success);
        const cancel = new ButtonBuilder().setCustomId('cancel').setLabel('No').setStyle(ButtonStyle.Danger);
        const buttonRow = new ActionRowBuilder().addComponents(confirm, cancel);

        const milestoneSelect = new StringSelectMenuBuilder()
            .setCustomId('milestones')
            .setPlaceholder('Select Milestone')
            .setOptions(milestoneArray);

        const milestoneRow = new ActionRowBuilder().addComponents(milestoneSelect);
        const response = await interaction.reply({
            content: 'Select Milestone Information to Display:',
            components: [milestoneRow],
            flags: MessageFlags.Ephemeral,
            withResponse: true
        });

        const milestoneFilter = (interaction) => interaction.customId === 'milestones';
        const milestoneCollector = response.resource.message.createMessageComponentCollector({ filter: milestoneFilter, componentType: ComponentType.StringSelect, time: 120_000 });

        milestoneCollector.on('collect', async (i) => {
            const selectedMilestone = i.values[0];
            let selectedData;

            for (let j = 0; j < miData.count; j++) {
                if (selectedMilestone == miData.results[j].id) {
                    selectedData = miData.results[j];
                }
            }

            let deadlineText = 'No deadline specified';
            let deadlineData = null;

            if (selectedData.run) {
                try {
                    let targetRunId = selectedData.run;

                    console.log('Looking for run ID:', targetRunId);

                    let allRuns = [];
                    let nextUrl = `https://tracker.preventathon.com/tracker/api/v2/runs/?limit=500`;

                    // Fetch all pages
                    while (nextUrl) {
                        console.log('Fetching:', nextUrl);
                        let runsBlob = await fetch(nextUrl);

                        if (!runsBlob.ok) {
                            console.log('Failed to fetch runs list, status:', runsBlob.status);
                            deadlineText = 'Check tracker for deadline';
                            break;
                        }

                        let runsData = await runsBlob.json();
                        console.log('Fetched page with', runsData.results.length, 'results. Total count:', runsData.count);

                        allRuns = allRuns.concat(runsData.results);
                        nextUrl = runsData.next;

                        console.log('Total runs fetched so far:', allRuns.length);
                    }

                    console.log('Finished fetching. Total runs:', allRuns.length);

                    // Find the index of the run with the matching ID
                    let currentIndex = allRuns.findIndex(run => run.id === targetRunId);
                    console.log('Current run index in array:', currentIndex);

                    if (currentIndex !== -1) {
                        console.log('Current run at index', currentIndex, '- ID:', allRuns[currentIndex].id, 'Name:', allRuns[currentIndex].name);
                    }

                    if (currentIndex !== -1 && currentIndex > 0) {
                        // Get the previous run in the array (one position back)
                        let previousIndex = currentIndex - 1;
                        let targetRun = allRuns[previousIndex];
                        console.log('Previous run at index', previousIndex, '- ID:', targetRun.id, 'Name:', targetRun.name);

                        deadlineData = targetRun;
                        deadlineText = `End of ${targetRun.name || targetRun.display_name || 'run'}`;
                        console.log('Using previous run:', targetRun.name, 'ID:', targetRun.id);
                    } else if (currentIndex === 0) {
                        console.log('Run is first in list (index 0), no previous run available');
                        deadlineText = 'No deadline specified';
                    } else {
                        console.log('Run ID', targetRunId, 'not found in results (index returned:', currentIndex, ')');
                        deadlineText = 'No deadline specified';
                    }

                } catch (error) {
                    console.error('Error fetching deadline:', error);
                    deadlineText = 'Check tracker for deadline';
                }
            }

            const newEmbed = new EmbedBuilder()
                .setTitle(selectedData.name)
                .setColor(0x2ECC71)
                .addFields(
                    { name: 'Total Amount Required: ', value: `$${selectedData.amount}` },
                    { name: 'Description: ', value: (selectedData.description ?? 'No Description Provided').substring(0, 1024) },
                    { name: 'Deadline: ', value: deadlineText }
                )
                .setTimestamp();

            const secondResponse = await i.reply({ content: 'Verify Milestone Information is Correct:', components: [buttonRow], embeds: [newEmbed], flags: MessageFlags.Ephemeral, withResponse: true });

            const collectorFilter = (j) => j.user.id === interaction.user.id;

            try {
                const confirmation = await secondResponse.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });

                if (confirmation.customId === 'confirm') {
                    const liveChannel = interaction.client.channels.cache.find(channel => channel.name === OUTPUT_CHANNEL);

                    if (!liveChannel) {
                        return await i.editReply({
                            content: `Error: Could not find target channel (${OUTPUT_CHANNEL}).`,
                            components: [],
                            embeds: [],
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Send the message and capture the sent message object
                    const sentMessage = await liveChannel.send({ content: 'NEW MILESTONE INFORMATION!!!', embeds: [newEmbed] });

                    // Pin the message
                    try {
                        await sentMessage.pin();
                        await i.editReply({ content: `New milestone announced and pinned in ${OUTPUT_CHANNEL}.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                    } catch (pinError) {
                        console.error('Error pinning message:', pinError);
                        await i.editReply({ content: `New milestone announced in ${OUTPUT_CHANNEL} (could not pin).`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                    }
                } else if (confirmation.customId === 'cancel') {
                    await i.editReply({ content: `Post cancelled. Please run command again to select a different milestone.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                }
            } catch {
                await i.editReply({ content: 'Confirmation Timeout (2 minute). Run command again to select milestone.', components: [], embeds: [], flags: MessageFlags.Ephemeral });
            }
        });
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral });
    }
};
