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
        const data = await trackerData.json();

        let milestoneArray = new Array();
        for (let i = 0; i < data.count; i++) {
            let cM = data.results[i];
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

        let newEmbed;
        milestoneCollector.on('collect', async (i) => {
            let selectedMilestone = i.values[0];
            const miBlob = await fetch(`https://tracker.preventathon.com/tracker/api/v2/milestones/${selectedMilestone}`);
            const miData = await miBlob.json();

            let prevRun = miData.run - 1;
            const deadlineBlob = await fetch(`https://tracker.preventathon.com/tracker/api/v2/runs/${prevRun}/`);
            const deadlineData = await deadlineBlob.json();


            let miName = miData.name;
            let miAmount = miData.amount;
            let miDesc = miData.description ?? 'No Description Provided';
            let deadline = deadlineData.name;

            console.log(`deadline = ${deadline}`);

            newEmbed = new EmbedBuilder()
                    .setTitle(miName)
                    .setDescription(`Milestone Information for ${miName}`)
                    .addFields(
                        { name: 'Milestone Name: ', value: miName },
                        { name: 'Total Amount Required: ', value: `$${miAmount}` },
                        { name: 'Description: ', value: miDesc },
                        { name: 'Deadline: ', value: `End of ${deadline}` }
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