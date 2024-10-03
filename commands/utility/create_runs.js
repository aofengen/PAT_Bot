const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
	.setName('create_runs')
	.setDescription('Creates threads for accepted marathon runs in a forum channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
}