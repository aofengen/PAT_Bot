import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,  ButtonStyle, ComponentType } from 'discord.js';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, MentionableSelectMenuBuilder, ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';

// ============================================================================
// CONFIGURATION
// ============================================================================
// Set the name of the channel where talent pings will be posted
const OUTPUT_CHANNEL = 'dev-test';
// ============================================================================

export const data = new SlashCommandBuilder()
    .setName('ping_talent')
    .setDescription('Ping those involved in the next run.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);

export async function execute(interaction) {
    let member = interaction.member;
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
        const talentCollector = response.resource.message.createMessageComponentCollector({ talentFilter, componentType: ComponentType.MentionableSelect, time: 120_000 });

        attemptCollector.on('collect', async (i) => {
            attemptValue = i.values[0];
            await i.deferUpdate();
        });
        
        vcCollector.on('collect', async (i) => {
            channelObj = i.channels.first();
            await i.deferUpdate();
        });
        
        talentCollector.on('collect', async (i) => {
            talentArray = Array.from(i.values);
            await i.deferUpdate();
        });

        try {
            const buttonPress = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, componentType: ComponentType.Button, time: 120_000 });

            if (buttonPress.customId === 'submitTalentToPing') {
                let msg;

                switch (attemptValue) {
                    case 'first':
                        msg = `Hello! Please join the <#${channelObj.id}> to start setup for the next run!`;
                        break;
                    case 'second':
                        msg = `Second ping for run setup. Please join <#${channelObj.id}>!`;
                        break;
                    case 'third':
                        msg = `Final ping for run setup. You are needed in <#${channelObj.id}> ASAP!!!`;
                        break;
                    default:
                        throw new Error("Invalid option for pingAttempt");
                }

                let peopleToPing = ``;

                for (let talent of talentArray) {
                    peopleToPing += `<@${talent}> `;
                }
                
                const liveChannel = interaction.client.channels.cache.find(channel => channel.name === OUTPUT_CHANNEL);
                
                if (!liveChannel) {
                    return await buttonPress.update({
                        content: `Error: Could not find target channel (${OUTPUT_CHANNEL}).`,
                        components: [],
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const message = peopleToPing + msg;

                console.log(message);
                await liveChannel.send({ content: message });
                await buttonPress.update({ content: `Talent for next run pinged for the ${attemptValue} time.`, components: [], flags: MessageFlags.Ephemeral });
            }
        } catch (awaitError) {
            // Catch the timeout error from awaitMessageComponent
            if (awaitError.code === 'InteractionCollectorError') {
                console.log(`[ping_talent] Interaction timed out after 2 minutes for user ${interaction.user.tag}`);
            } else {
                console.error(`[ping_talent] Error waiting for button press:`, awaitError);
            }
            
            try {
                await interaction.editReply({ 
                    content: 'Interaction timed out or an error occurred.', 
                    components: [], 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (editError) {
                console.error(`[ping_talent] Could not edit reply:`, editError.message);
            }
        }
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral });
    }
}
