import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SelectMenuOptionBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
import { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, MessageFlags, ComponentType } from "discord.js";

// ============================================================================
// CONFIGURATION
// ============================================================================
// Set the name of the channel where milestone announcements will be posted
const OUTPUT_CHANNEL = isProd ? 'pat6-live-production' : 'dev-testing';
// Set the tracker eventID for this marathon
const eventID = 6;
// ============================================================================

export const data = new SlashCommandBuilder()
    .setName('post_incentives')
    .setDescription('Display bidwar/incentive information in discord.')
    // .addIntegerOption(option => option
    //     .setName('event')
    //     .setDescription('Pull incentives from this event ID (number only - for PAT6, enter 6, PAT5 enter 5, etc)')
    //     .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Games Committee')) {
        // const eventID = interaction.options.getInteger('event');

        const trackerData = await fetch(`https://tracker.preventathon.com/tracker/api/v2/events/${eventID}/bids/?state=OPENED`);

        if (!trackerData.ok) {
            return await interaction.reply({
                content: `Failed to fetch milestones for event ${eventID}. Please check the event ID.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const incData = await trackerData.json();

        if (!incData.results || incData.results.length === 0) {
            return await interaction.reply({
                content: `No milestones found for event ${eventID}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        let incentiveArray = new Array();
        for (let i = 0; i < incData.count; i++) {
            let inc = incData.results[i];
            if (inc.bid_type === 'challenge' || inc.bid_type === 'choice') {
                let id = inc.id;
                let option = new SelectMenuOptionBuilder()
                    .setLabel(inc.full_name)
                    .setDescription(inc.description)
                    .setValue(id.toString());
                incentiveArray.push(option);
            }
        }

        const confirm = new ButtonBuilder().setCustomId('confirm').setLabel('Yes').setStyle(ButtonStyle.Success);
        const cancel = new ButtonBuilder().setCustomId('cancel').setLabel('No').setStyle(ButtonStyle.Danger);
        const buttonRow = new ActionRowBuilder().addComponents(confirm, cancel);

        const incentiveSelect = new StringSelectMenuBuilder()
            .setCustomId('incentives')
            .setPlaceholder('Select Incentive')
            .setOptions(incentiveArray);

        const incentiveRow = new ActionRowBuilder().addComponents(incentiveSelect);
        const response = await interaction.reply({
            content: 'Select Incentive Information to Display:',
            components: [incentiveRow],
            flags: MessageFlags.Ephemeral,
            withResponse: true
        });

        const incentiveFilter = (interaction) => interaction.customId === 'incentives'; 
        const incentiveCollector = response.resource.message.createMessageComponentCollector({ filter: incentiveFilter, componentType: ComponentType.StringSelect, time: 120_000 });

        incentiveCollector.on('collect', async (i) => {
            await interaction.deleteReply();
            const selectedIncentive = i.values[0];
            let selectedData;

            for (let j = 0; j < incData.count; j++) { 
                if (selectedIncentive == incData.results[j].id) 
                { 
                    selectedData = incData.results[j]; 
                }
            }

            let newEmbed = new EmbedBuilder()
                    .setTitle(`${selectedData.full_name}`)
                    .addFields(
                        { name: 'Deadline: ', value: selectedData.close_at ?? 'End of Run' },
                        { name: 'Description: ', value: selectedData.description ?? 'No Description Provided' },
                    )
                    .setTimestamp();

            if (selectedData.bid_type === 'challenge') {
                newEmbed.addFields({ name: 'Total Amount Required: ', value: `$${selectedData.goal}` });
            } else if (selectedData.bid_type === 'choice') {
                let options;
                for (let i = 0; i < incData.count; i++) {
                    if (incData.results[i].parent == selectedIncentive) {
                        options += `${incData.results[i].name}\n`
                    }
                }
                newEmbed.addFields(
                    { name: 'Options: ', value: options ?? 'Donators will submit. Check total watch page for submissions.'},
                    { name: 'Accepted Options: ', value: `Top ${selectedData.accepted_number}`}
                )
            }
            
            const secondResponse = await i.reply({ content: 'Verify Incentive Information is Correct:', components: [buttonRow], embeds: [newEmbed], withResponse: true });
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
                    const sentMessage = await liveChannel.send({ content: 'NEW INCENTIVE INFORMATION!!!', embeds: [newEmbed] });

                    // Pin the message
                    try {
                        await sentMessage.pin();
                        await i.editReply({ content: `New incentive announced and pinned in ${OUTPUT_CHANNEL}.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                    } catch (pinError) {
                        console.error('Error pinning message:', pinError);
                        await i.editReply({ content: `New incentive announced in ${OUTPUT_CHANNEL} (could not pin).`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                    }
                } else if (confirmation.customId === 'cancel') {
                    await i.editReply({ content: `Post cancelled. Please run command again to select a different incentive.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                }
            } catch {
                await i.editReply({ content: 'Confirmation Timeout (2 minute). Run command again to select incentive.', components: [], embeds: [], flags: MessageFlags.Ephemeral });
            }
        });
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral});
    }
};