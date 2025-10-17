import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SelectMenuOptionBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
import { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, MessageFlags, ComponentType } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('post_milestones')
    .setDescription('Display milestone information in discord.')
    .addIntegerOption(option => option
        .setName('event')
        .setDescription('Pull milestones from this event ID (number only - for PAT6, enter 6, PAT5 enter 5, etc)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Games Committee')) {
        const eventID = interaction.options.getInteger('event');

        const trackerData = await fetch(`https://tracker.preventathon.com/tracker/api/v2/events/${eventID}/milestones/`);
        const miData = await trackerData.json();

        let milestoneArray = new Array();
        for (let i = 0; i < miData.count; i++) {
            let cM = miData.results[i];
            let id = cM.id;
            let option = new SelectMenuOptionBuilder()
                .setLabel(cM.name)
                .setDescription(cM.description)
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

            for (let j = 0; j < miData.count; j++) { if (selectedMilestone == miData.results[j].id) { selectedData = miData.results[j]; }}

            const prevRun = selectedData.run - 1;

            const deadlineBlob = await fetch(`https://tracker.preventathon.com/tracker/api/v2/runs/${prevRun}/`);
            const deadlineData = await deadlineBlob.json();

            console.log(deadlineData.id);

            const newEmbed = new EmbedBuilder(deadlineData)
                    .setTitle(selectedData.name)
                    .setDescription(`Milestone Information for ${selectedData.name}`)
                    .addFields(
                        { name: 'Milestone Name: ', value: selectedData.name },
                        { name: 'Total Amount Required: ', value: `$${selectedData.amount}` },
                        { name: 'Description: ', value: selectedData.description ?? 'No Description Provided' },
                        { name: 'Deadline: ', value: `End of ${deadlineData.name}` }
                    )
                    .setTimestamp();

            console.log (newEmbed);

            const secondResponse = await i.reply({ content: 'Verify Milestone Information is Correct:', components: [buttonRow], embeds: [newEmbed], withResponse: true });

            const collectorFilter = (j) => j.user.id === interaction.user.id;

            try {
                const confirmation = await secondResponse.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 120_000});

                if (confirmation.customId === 'confirm') {
                    const liveChannel = interaction.client.channels.cache.find(channel => channel.name === 'dev-testing');
                    liveChannel.send({ content: 'NEW MILESTONE INFORMATION!!!', embeds: [newEmbed] });

                    await i.editReply({ content: `New milestone announced and pinned in live-production.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                } else if (confirmation.customId === 'cancel') {
                    await i.editReply({ content: `Post cancelled. Please run command again to select a different milestone.`, components: [], embeds: [], flags: MessageFlags.Ephemeral });
                }
            } catch {
                await i.editReply({ content: 'Confirmation Timeout (2 minute). Run command again to select milestone.', components: [], embeds: [], flags: MessageFlags.Ephemeral});
            }
        });
    } else {
        await interaction.reply('Not authorized to run this command!');
    }
};