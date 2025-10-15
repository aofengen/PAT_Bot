const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping_talent')
    .setDescription('Ping those involved in the next run.')
    .addStringOption(option =>
        option
            .setName('pingattempt')
            .setDescription('Which Ping Attempt? (Valid Options: first, second, or third)')
            .setRequired(true))
    .addChannelOption(option =>
        option
            .setName('channel')
            .setDescription('Select Voice Channel')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true))
    .addUserOption(option =>
        option
            .setName('runner1')
            .setDescription('Optional: Enter name of runner here')
            .setRequired(false))
    .addUserOption(option =>
        option
            .setName('runner2')
            .setDescription('Optional: Enter name of second runner here')
            .setRequired(false))
    .addUserOption(option =>
        option
            .setName('com1')
            .setDescription('Optional: Enter name of first commentator here')
            .setRequired(false))
    .addUserOption(option =>
        option
            .setName('com2')
            .setDescription('Optional: Enter name of second commentator here')
            .setRequired(false))
    .addUserOption(option =>
        option
            .setName('com3')
            .setDescription('Optional: Enter name of third commentator here')
            .setRequired(false))
    .addUserOption(option =>
        option
            .setName('host')
            .setDescription('Optional: If host swap, enter name here')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
    async execute(interaction) {
        let member = interaction.member.guild;
        if (member.roles.cache.find(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Setup')) {
            const attemptNumber = interaction.options.getString('pingattempt');
            const channelObj = interaction.options.getChannel('channel');
            const runner1Obj = interaction.options.getUser('runner1') ?? null;
            const runner2Obj = interaction.options.getUser('runner2') ?? null;
            const com1Obj = interaction.options.getUser('com1') ?? null;
            const com2Obj = interaction.options.getUser('com2') ?? null;
            const com3Obj = interaction.options.getUser('com3') ?? null;
            const hostObj = interaction.options.getUser('host') ?? null;

            let msg;

            switch(attemptNumber) {
                case 'first':
                    msg = `Hello! Please join the ${channelObj.url} to start setup for the next run!`;
                    break;
                case 'second':
                    msg = `Second ping for run setup. Please join ${channelObj.url}!`
                    break;
                case 'third':
                    msg = `Final ping for run setup. You are needed in ${channelObj.url} ASAP!!!`
                    break;
                default:
                    throw new Error("Invalid option for pingAttempt");
            }

            let peopleToPing = ``;

            if (runner1Obj != null) {peopleToPing += `${runner1Obj} `};
            if (runner2Obj != null) {peopleToPing += `${runner2Obj} `};
            if (com1Obj != null) {peopleToPing += `${com1Obj} `};
            if (com2Obj != null) {peopleToPing += `${com2Obj} `};
            if (com3Obj != null) {peopleToPing += `${com3Obj} `};
            if (hostObj != null) {peopleToPing += `${hostObj} `};

            try {
                const liveChannel = interaction.client.channels.cache.find(channel => channel.name === 'tech-department');
                //const liveChannel = interaction.client.channels.cache.get('1254852170877112412');
                const message = peopleToPing + msg;
                
                console.log(message);
                liveChannel.send({content: message, allowed_mentions: true});
                await interaction.reply({content: `Talent for next run pinged for the ${attemptNumber} time.`, flags: MessageFlags.Ephemeral})
            } catch (e) {
                console.error(e);
            }
        } else {
            await interaction.reply('Not authorized to run this command!');
        }
    }
}