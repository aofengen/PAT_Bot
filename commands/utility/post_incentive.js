import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SelectMenuOptionBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
import { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, MessageFlags, ComponentType } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('post_incentives')
    .setDescription('Display bidwar/incentive information in discord.')
    .addIntegerOption(option => option
        .setName('event')
        .setDescription('Pull incentives from this event ID (number only - for PAT6, enter 6, PAT5 enter 5, etc)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Games Committee')) {
        const eventID = interaction.options.getInteger('event');

        const trackerData = await fetch(`https://tracker.preventathon.com/tracker/api/v2/events/${eventID}/bids/?state=OPENED`);
        const incData = await trackerData.json();

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
            const selectedIncentive = i.values[0];
            let selectedData;

            for (let j = 0; j < incData.count; j++) { if (selectedIncentive == incData.results[j].id) { selectedData = incData.results[j]; }}

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
            console.log (newEmbed);

            const secondResponse = await i.reply({ content: 'Verify Incentive Information is Correct:', components: [buttonRow], embeds: [newEmbed], withResponse: true });

            const collectorFilter = (j) => j.user.id === interaction.user.id;

            try {
                const confirmation = await secondResponse.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 120_000});

                if (confirmation.customId === 'confirm') {
                    const liveChannel = interaction.client.channels.cache.find(channel => channel.name === 'dev-testing');
                    liveChannel.send({ content: 'NEW INCENTIVE INFORMATION!!!', embeds: [newEmbed] });

                    await i.editReply({ content: `New incentive announced and pinned in live-production.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                } else if (confirmation.customId === 'cancel') {
                    await i.editReply({ content: `Post cancelled. Please run command again to select a different incentive.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                }
            } catch {
                await i.editReply({ content: 'Confirmation Timeout (2 minute). Run command again to select incentive.', components: [], embeds: [], flags: MessageFlags.Ephemeral});
            }
        });
    } else {
        await interaction.reply('Not authorized to run this command!');
    }
};