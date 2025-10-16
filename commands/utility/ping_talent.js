import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,  ButtonStyle, ComponentType } from 'discord.js';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, MentionableSelectMenuBuilder, ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('ping_talent')
    .setDescription('Ping those involved in the next run.')
    // .addStringOption(option =>
    //     option
    //         .setName('pingattempt')
    //         .setDescription('Which Ping Attempt? (Valid Options: first, second, or third)')
    //         .setRequired(true))
    // .addChannelOption(option =>
    //     option
    //         .setName('channel')
    //         .setDescription('Select Voice Channel')
    //         .addChannelTypes(ChannelType.GuildVoice)
    //         .setRequired(true))
    // .addUserOption(option =>
    //     option
    //         .setName('runner1')
    //         .setDescription('Optional: Enter name of runner here')
    //         .setRequired(false))
    // .addUserOption(option =>
    //     option
    //         .setName('runner2')
    //         .setDescription('Optional: Enter name of second runner here')
    //         .setRequired(false))
    // .addUserOption(option =>
    //     option
    //         .setName('com1')
    //         .setDescription('Optional: Enter name of first commentator here')
    //         .setRequired(false))
    // .addUserOption(option =>
    //     option
    //         .setName('com2')
    //         .setDescription('Optional: Enter name of second commentator here')
    //         .setRequired(false))
    // .addUserOption(option =>
    //     option
    //         .setName('com3')
    //         .setDescription('Optional: Enter name of third commentator here')
    //         .setRequired(false))
    // .addUserOption(option =>
    //     option
    //         .setName('host')
    //         .setDescription('Optional: If host swap, enter name here')
    //         .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === 'Moderator' || role.name === 'Producer' || role.name === 'Setup')) {
        const attemptSelect = new StringSelectMenuBuilder()
            .setCustomId('pingattempt')
            .setPlaceholder('Which ping attempt?')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('First')
                    .setDescription('First Ping Attempt.')
                    .setValue('first'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Second')
                    .setDescription('Second Ping Attempt.')
                    .setValue('second'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Third')
                    .setDescription('Third Ping Attempt')
                    .setValue('third')
            );

        const vcSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setupchannel')
            .setPlaceholder('Select which Setup VC to use')
            .setChannelTypes(ChannelType.GuildVoice);

        const talentSelect = new MentionableSelectMenuBuilder()
            .setCustomId('talent')
            .setPlaceholder('Select talent for next run')
            .setMinValues(0)
            .setMaxValues(8);

        const submitBtn = new ButtonBuilder().setCustomId('submitTalentToPing').setLabel('Submit').setStyle(ButtonStyle.Success);

        const attemptRow = new ActionRowBuilder().addComponents(attemptSelect);
        const vcRow = new ActionRowBuilder().addComponents(vcSelect);
        const talentRow = new ActionRowBuilder().addComponents(talentSelect);
        const submitRow = new ActionRowBuilder().addComponents(submitBtn);

        const response = await interaction.reply({
            content: 'Select users to ping:',
            components: [attemptRow, vcRow, talentRow, submitRow],
            flags: MessageFlags.Ephemeral,
            withResponse: true
        });

        const collectorFilter = (i) => i.user.id === interaction.user.id;

        const attemptFilter = (interaction) => interaction.customId === 'pingattempt';
        const vcFilter = (interaction) => interaction.customId === 'setupchannel';
        const talentFilter = (interaction) => interaction.customId === 'talent';

        let attemptValue, channelObj;
        let talentArray = new Array();

        const attemptCollector = response.resource.message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120_000 });
        const vcCollector = response.resource.message.createMessageComponentCollector({ vcFilter, componentType: ComponentType.ChannelSelect, time: 120_000 });
        const talentCollector = response.resource.message.createMessageComponentCollector({ talentFilter, componentType: ComponentType.UserSelect, time: 120_000 });
        const buttonAction = response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });

        attemptCollector.on('collect', async (i) => {
            attemptValue = i.values[0];
            const selectMsg = await i.reply({ content: `Selected ${attemptValue}`, flags: MessageFlags.Ephemeral });
            await selectMsg.delete();
        });
        vcCollector.on('collect', async (i) => {
            channelObj = i.values[0];
            const selectMsg = await i.reply({ content: `Selected ${channelObj}`, flags: MessageFlags.Ephemeral });
            await selectMsg.delete();
        });
        talentCollector.on('collect', async (i) => {
            console.log(i);
            for (let user in i.users) {
                talentArray.push(user);
                await i.reply({ content: `Selected ${user}`, flags: MessageFlags.Ephemeral });
            }
        });


        // const runner1Obj = interaction.options.getUser('runner1') ?? null;
        // const runner2Obj = interaction.options.getUser('runner2') ?? null;
        // const com1Obj = interaction.options.getUser('com1') ?? null;
        // const com2Obj = interaction.options.getUser('com2') ?? null;
        // const com3Obj = interaction.options.getUser('com3') ?? null;
        // const hostObj = interaction.options.getUser('host') ?? null;
        if (buttonAction.customId === 'submitTalentToPing') {
            let msg;

            switch (attemptValue) {
                case 'first':
                    msg = `Hello! Please join the ${channelObj.url} to start setup for the next run!`;
                    break;
                case 'second':
                    msg = `Second ping for run setup. Please join ${channelObj.url}!`;
                    break;
                case 'third':
                    msg = `Final ping for run setup. You are needed in ${channelObj.url} ASAP!!!`;
                    break;
                default:
                    throw new Error("Invalid option for pingAttempt");
            }

            let peopleToPing = ``;

            for (let talent in talentArray) {
                peopleToPing += `${talent} `;
            }

            // if (runner1Obj != null) {peopleToPing += `${runner1Obj} `};
            // if (runner2Obj != null) {peopleToPing += `${runner2Obj} `};
            // if (com1Obj != null) {peopleToPing += `${com1Obj} `};
            // if (com2Obj != null) {peopleToPing += `${com2Obj} `};
            // if (com3Obj != null) {peopleToPing += `${com3Obj} `};
            // if (hostObj != null) {peopleToPing += `${hostObj} `};
            try {
                const liveChannel = interaction.client.channels.cache.find(channel => channel.name === 'tech-department');
                const message = peopleToPing + msg;

                console.log(message);
                liveChannel.send({ content: message, allowed_mentions: true });
                await interaction.reply({ content: `Talent for next run pinged for the ${attemptValue} time.`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                console.error(e);
            }
        }
    } else {
        await interaction.reply('Not authorized to run this command!');
    }
}