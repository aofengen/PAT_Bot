import { SlashCommandBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration, EmbedBuilder, ChannelType, MessageFlags,ComponentType } from 'discord.js';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder,ActionRowBuilder} from '@discordjs/builders';
import { readFileSync } from 'node:fs';
import * as configModule from '../../config.json' with { type: "json" };

// ============================================================================
// CONFIGURATION
// ============================================================================
const STAFF_ROLE = configModule.default.config.staffRole;
const BASE_TRACKER_URL = configModule.default.config.baseTrackerUrl;
// ============================================================================

export const data = new SlashCommandBuilder()
    .setName('create_runs')
    .setDescription('Creates threads for accepted marathon runs in a forum channel')
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('Channel where threads will be created')
        .addChannelTypes(ChannelType.GuildForum)
        .setRequired(true))
    .addBooleanOption(option => option
        .setName('fromfile')
        .setDescription('Create/Update backup runs from provided JSON File (must provide a filename if true or things blow up')
        .setRequired(true))
    .addStringOption(option => option
        .setName('filename')
        .setDescription('file must be present in the backup runs directory. do not include json extension')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === STAFF_ROLE)) {
        const fromFile = interaction.options.getBoolean('fromfile');
        const fileName = interaction.options.getString('filename');
        if (fromFile === true) {
            let trackerData = readFileSync(`./backup_runs/${fileName}.json`);
            let obj = JSON.parse(trackerData);
            await interaction.reply({ content: 'looking for file...',flags: MessageFlags.Loading});
            create_runs(interaction,obj,fileName);
        } else {
            fetch_runs(interaction);
        }
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral });
    }
}
//Not pulling runs from a file so first ask the user which event on the tracker to pull runs from.
async function fetch_runs(interaction){
    let eventsData = await fetch(`${BASE_TRACKER_URL}/events/`);
    let eventsobj = await eventsData.json();
    let events = new Array();
    for (let i=0;i<eventsobj.count;i++){
        let currentEvent = eventsobj.results[i];
        events[i] = new StringSelectMenuOptionBuilder()
            .setLabel(currentEvent.name)
            .setDescription("Event Date: "+currentEvent.datetime)
            .setValue(""+currentEvent.id);
    }
    const eventID_select = new StringSelectMenuBuilder()
        .setCustomId('eventList')
        .setPlaceholder('--Select Option--')
        .addOptions(...events);
    const eventIDRow = new ActionRowBuilder().addComponents(eventID_select);
    const response = await interaction.reply({
        content: 'Which event would you like to pull runs from?',
        components: [eventIDRow],
        withResponse: true,
    });
    const eventFilter = (interaction) => interaction.customId === 'eventList';
    const eventID_Collector = response.resource.message.createMessageComponentCollector({ eventFilter, componentType: ComponentType.StringSelect, time: 120_000 });
    eventID_Collector.on('collect', async (i) => {
        let eventID = i.values[0];
        await i.deferUpdate();
        let eventData = await fetch(`${BASE_TRACKER_URL}/events/${eventID}/`);
        let eventobj = await eventData.json();
        let runsData = await fetch(`${BASE_TRACKER_URL}/events/${eventID}/runs/`);
        let obj = await runsData.json();
        await create_runs(interaction,obj,eventobj.name);
    });
}

async function create_runs(interaction,obj,eventName){

    const forum = interaction.options.getChannel('channel');
    const threadList = await forum.threads.fetchActive();
    const threadIds = new Map();

    threadList.threads.forEach((value, key) => {
        threadIds.set(value.name, key);
    });

    for (let i = 0; i < obj.count; i++) {
        await interaction.editReply({
            content: `Setup ${i} of ${obj.count} runs from ${eventName}...`,
            flags: MessageFlags.Loading,
            components:[],
            withResponse: false,
        });
        let newObj = new Object();
        let currentRun = obj.results[i];

        if (currentRun.runners[0].name != 'Staff') {
            let runnerNames = [];
            let runnerPronouns = [];

            let commentatorNames = [];
            let commentatorPronouns = [];

            newObj.name = currentRun.name;
            newObj.category = currentRun.category || "Not Provided";
            newObj.console = currentRun.console || "Not Provided";
            newObj.estimate = currentRun.run_time || "Not Provided";
            newObj.layout = currentRun.layout || "Not Provided";
            newObj.onsite = (currentRun.onsite === "ONSITE" ? "In Person" : "Online")  || "Not Provided";

            if (currentRun.hosts.length == 0) {
                newObj.host = "Not Assigned Yet";
                newObj.hostPronouns = "";
            } else {
                newObj.host = currentRun.hosts[0].name;
                newObj.hostPronouns = currentRun.hosts[0].pronouns != "" ? currentRun.hosts[0].pronouns : "No Pronouns Provided";
            }

            if (currentRun.runners.length == 1) {
                newObj.runners = currentRun.runners[0].name;
                newObj.runnerPronouns = currentRun.runners[0].pronouns != "" ? currentRun.runners[0].pronouns : "No Pronouns Provided";
            } else {
                for (let j = 0; j < currentRun.runners.length; j++) {
                    runnerNames.push(currentRun.runners[j].name);
                    runnerPronouns.push(currentRun.runners[j].pronouns != "" ? currentRun.runners[j].pronouns : "No Pronouns Provided");
                }
                newObj.runners = runnerNames;
                newObj.runnerPronouns = runnerPronouns;
            }

            if (currentRun.commentators.length == 0) {
                newObj.commentators = "None Provided";
                newObj.commentatorPronouns = "";
            } else if (currentRun.commentators.length == 1) {
                newObj.commentators = currentRun.commentators[0].name;
                newObj.commentatorPronouns = currentRun.commentators[0].pronouns != "" ? currentRun.commentators[0].pronouns : "No Pronouns Provided";
            } else {
                for (let j = 0; j < currentRun.commentators.length; j++) {
                    commentatorNames.push(currentRun.commentators[j].name);
                    commentatorPronouns.push(currentRun.commentators[j].pronouns != "" ? currentRun.commentators[j].pronouns : "No Pronouns Provided");
                }
                newObj.commentators = commentatorNames;
                newObj.commentatorPronouns = commentatorPronouns;
            }

            let runners = "";
            let comms = "";
            let hosts = "";

            if (!Array.isArray(newObj.runners)) {
                runners = `${newObj.runners} \(${newObj.runnerPronouns})`;
            } else {
                for (let i = 0; i < newObj.runners.length; i++) {
                    runners += `${newObj.runners[i]} \(${newObj.runnerPronouns[i]}), `;
                }
            }

            if (!Array.isArray(newObj.hosts)) {
                if (newObj.host == "Not Assigned Yet") {
                    hosts = `${newObj.host}`;
                } else {
                    hosts = `${newObj.host} \(${newObj.hostPronouns})`;
                }
            } else {
                for (let i = 0; i < newObj.hosts.length; i++) {
                    hosts += `${newObj.hosts[i]} \(${newObj.hostsPronouns[i]}), `;
                }
            }

            if (!Array.isArray(newObj.commentators)) {
                if (newObj.commentators == "None Provided") {
                    comms = `${newObj.commentators}`;
                } else {
                    comms = `${newObj.commentators} \(${newObj.commentatorPronouns})`;
                }
            } else {
                for (let i = 0; i < newObj.commentators.length; i++) {
                    comms += `${newObj.commentators[i]} \(${newObj.commentatorPronouns[i]}), `;
                }
            }

            //TODO - get tech notes field from private tracker API (look into DRF Knox)
            let techNotes = "";
            if (currentRun.name == "[BACKUP RUN] MASH VP! Re:VISION") {
                techNotes = "FLASHING LIGHTS WARNING NEEDED, no cam for runner";
            } else if (currentRun.priority_tag == "flashing_lights") {
                techNotes = "FLASHING LIGHTS WARNING NEEDED";
            }

            const newMessage = `Game: ${newObj.name}\nCategory: ${newObj.category}\nPlatform: ${newObj.console}\nRun Estimate: ${newObj.estimate}\n` +
                `Layout: ${newObj.layout}\nRun Location: ${newObj.onsite}\nRunners: ${runners}\nCommentators: ${comms}\nHost: ${hosts}\n\nTech Notes: ${techNotes}`.trimStart();

            console.log(`\nRun Info for ${newObj.name}:`);
            console.log(newMessage);

            // If able to use embeds, use the following instead of a generic message
            const newEmbed = new EmbedBuilder()
                .setTitle(newObj.name)
                .setDescription(`Run information for ${newObj.name}`)
                .addFields({ name: 'Run Info', value: newMessage })
                .setTimestamp();

            if (!threadIds.has(newObj.name)) {
                try {
                    const newThread = await forum.threads.create({
                        name: newObj.name,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        message: {
                            content: `Communication Thread for ${newObj.name}`,
                            embeds: [newEmbed]
                        },
                        reason: `Run information/discussion for ${newObj.name}`
                    });

                    console.log(`Created thread: ${newThread.name}`);

                    //keeping in case we ever need to not use embeds
                    //newThread.send(`Run information for ${newThread.name}:\n${newMessage}`);
                    //newThread.send({embeds: [newEmbed]});
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (e) {
                    console.error(e);
                }
            } else {
                let threadNum;
                threadIds.forEach((value, key) => {
                    if (key == newObj.name) {
                        threadNum = value;
                    }
                });
                try {
                    //Keeping in case we ever need to not use embeds for some reason
                    //changedThread.send(`Updated run information for ${newObj.name}:\n${newMessage}`);
                    // changedThreadId.send({embeds: [newEmbed]});
                    const changedThread = await forum.threads.fetch(threadNum);
                    let threadInitMsg = await changedThread.fetchStarterMessage();
                    await threadInitMsg.edit({ embeds: [newEmbed] });

                    console.log(`Updated embed in thread: ${newObj.name}`);
                    await interaction.reply('Runs for event #' + eventID + ' pulled!');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }
    await interaction.editReply({
        content: `Finished setting up all runs for ${eventName}!`,
        flags: 0,
        components:[],
        withResponse: false,
    });
}