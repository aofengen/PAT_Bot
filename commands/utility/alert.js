import { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Ping Safety Staff for any reason.')
    .addStringOption(option => option
        .setName('reason')
        .setDescription('OPTIONAL: Reason for report')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);

export async function execute(interaction) {
    const safetyChannel = interaction.client.channels.cache.find(channel => channel.name === 'safety-general');
    const safetyStaffRole = interaction.guild.roles.cache.find(role => role.name === 'Safety Staff');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!safetyChannel) {
        return await i.editReply({
            content: `Error: Could not find target channel (${safetyChannel}).`,
            components: [],
            embeds: [],
            flags: MessageFlags.Ephemeral
        });
    }

    if (!safetyStaffRole) {
        return await i.editReply({
            content: `Error: Could not find role (${safetyStaffRole}).`,
            components: [],
            embeds: [],
            flags: MessageFlags.Ephemeral
        });
    }

    await safetyChannel.send({ content: `${safetyStaffRole} attention needed in channel ${interaction.channel}. Report filed by ${interaction.user}. Reason: ${reason} ` });

    await interaction.reply({ content: 'Safety Staff alerted. Thank you for the report. This message cannot be seen by anyone else.', flags: MessageFlags.Ephemeral });
}
