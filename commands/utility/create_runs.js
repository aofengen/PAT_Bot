import { SlashCommandBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration, EmbedBuilder, ChannelType } from 'discord.js';
import { readFileSync } from 'node:fs';

export const data = new SlashCommandBuilder()
    .setName('create_runs')
    .setDescription('Creates threads for accepted marathon runs in a forum channel')
    .addIntegerOption(option => option
        .setName('event')
        .setDescription('Pull runs from this event ID')
        .setRequired(true))
    .addChannelOption(option => option
        .setName('channel')
        .setDescription('Channel ID number where threads will be created')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
export async function execute(interaction) {
    let member = interaction.member.guild;
    if (member.roles.cache.find(role => role.name === 'Moderator')) {

        const eventID = interaction.options.getInteger('event');
        const forum = interaction.options.getChannel('channel');
        const fromFile = interaction.options.getBoolean('fromfile');
        const threadList = await forum.threads.fetchActive();
        const threadIds = new Map();
        const fileName = interaction.options.getString('filename');

        let trackerData, obj;
        if (fromFile === true) {
            trackerData = readFileSync(`./backup_runs/${fileName}.json`);
            obj = JSON.parse(trackerData);
        } else {
            trackerData = await fetch(`https://tracker.preventathon.com/tracker/api/v2/events/${eventID}/runs/`);
            obj = await trackerData.json();
        }

        threadList.threads.forEach((value, key) => {
            threadIds.set(value.name, key);
        });


        for (let i = 0; i < obj.count; i++) {
            let newObj = new Object();
            let currentRun = obj.results[i];

            if (currentRun.runners[0].name != 'Staff') {
                let runnerNames = [];
                let runnerPronouns = [];

                let commentatorNames = [];
                let commentatorPronouns = [];

                newObj.name = currentRun.name;
                newObj.category = currentRun.category || "";
                newObj.console = currentRun.console || "";
                newObj.estimate = currentRun.run_time || "";
                newObj.layout = currentRun.layout || "";

                if (currentRun.hosts.length == 0) {
                    newObj.host = "None";
                    newObj.hostPronouns = "";
                } else {
                    newObj.host = currentRun.hosts[0].name;
                    newObj.hostPronouns = currentRun.hosts[0].pronouns != "" ? currentRun.hosts[0].pronouns : "No Pronouns";
                }

                if (currentRun.runners.length == 1) {
                    newObj.runners = currentRun.runners[0].name;
                    newObj.runnerPronouns = currentRun.runners[0].pronouns != "" ? currentRun.runners[0].pronouns : "No Pronouns";
                } else {
                    for (let j = 0; j < currentRun.runners.length; j++) {
                        runnerNames.push(currentRun.runners[j].name);
                        runnerPronouns.push(currentRun.runners[j].pronouns != "" ? currentRun.runners[j].pronouns : "No Pronouns");
                    }
                    newObj.runners = runnerNames;
                    newObj.runnerPronouns = runnerPronouns;
                }

                if (currentRun.commentators.length == 0) {
                    newObj.commentators = "None";
                    newObj.commentatorPronouns = "";
                } else if (currentRun.commentators.length == 1) {
                    newObj.commentators = currentRun.commentators[0].name;
                    newObj.commentatorPronouns = currentRun.commentators[0].pronouns != "" ? currentRun.commentators[0].pronouns : "No Pronouns";
                } else {
                    for (let j = 0; j < currentRun.commentators.length; j++) {
                        commentatorNames.push(currentRun.commentators[j].name);
                        commentatorPronouns.push(currentRun.commentators[j].pronouns != "" ? currentRun.commentators[j].pronouns : "No Pronouns");
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
                    if (newObj.host == "None") {
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
                    if (newObj.commentators == "None") {
                        comms = `${newObj.commentators}`;
                    } else {
                        comms = `${newObj.commentators} \(${newObj.commentatorPronouns})`;
                    }
                } else {
                    for (let i = 0; i < newObj.commentators.length; i++) {
                        comms += `${newObj.commentators[i]} \(${newObj.commentatorPronouns[i]}), `;
                    }
                }

                let techNotes = "";
                if (currentRun.priority_tag == "flashing_lights") {
                    techNotes = "FLASHING LIGHTS WARNING NEEDED";
                }

                const newMessage = `Game: ${newObj.name}\nCategory: ${newObj.category}\nPlatform: ${newObj.console}\nRun Estimate: ${newObj.estimate}\n` +
                    `Layout: ${newObj.layout}\nRunners: ${runners}\nCommentators: ${comms}\nHost: ${hosts}\n\nTech Notes: ${techNotes}`.trimStart();

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
    } else {
        await interaction.reply('Not authorized to run this command!');
    }
}