import { SlashCommandBuilder,MessageFlags,PermissionFlagsBits} from 'discord.js';
export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Test command to ping this bot, to verify it is running.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    return await interaction.reply({
        content: "Pong!\n-# Bot is live!",
        flags: MessageFlags.Ephemeral
    });

}