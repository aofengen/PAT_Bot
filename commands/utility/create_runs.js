const { SlashCommandBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration } = require('discord.js');
const { cubsUserId } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
	.setName('create_runs')
	.setDescription('Creates threads for accepted marathon runs in a forum channel')
    .addIntegerOption(option =>
        option
            .setName('event')
            .setDescription('Pull runs from this event ID')
            .setRequired(true))
    .addStringOption(option =>
        option
            .setName('channel')
            .setDescription('Channel ID number where threads will be created')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        if (interaction.user.id === cubsUserId) {
            const res = await fetch('https://tracker.preventathon.com/tracker/api/v2/runs/');
            const eventID = interaction.options.getInteger('event');
            const forum = interaction.client.channels.cache.get(interaction.options.getString('channel'));
            const obj = await res.json();
            const threadList = await forum.threads.fetchActive();
            const threadIds = new Map();

            threadList.threads.forEach((value, key) => {
                threadIds.set(value.name, key); 
            });

            for(let i = 0; i < obj.count; i++) {
                let newObj = new Object();
                let currentRun = obj.results[i];
                
                if (currentRun.event.id === eventID && currentRun.runners[0].name != 'Staff') {
                    let runnerNames = [];
                    let runnerPronouns = [];

                    let commentatorNames = [];
                    let commentatorPronouns = [];

                    newObj.name = currentRun.name;
                    newObj.category = currentRun.category;
                    newObj.console = currentRun.console;
                    newObj.estimate = currentRun.run_time;
                    newObj.host = currentRun.hosts[0].name;
                    newObj.hostPronouns = currentRun.hosts[0].pronouns != "" ? currentRun.hosts[0].pronouns : "No Pronouns";

                    if (currentRun.runners.length == 1) {
                        newObj.runners = currentRun.runners[0].name;
                        newObj.runnerPronouns = currentRun.runners[0].pronouns != "" ? currentRun.runners[0].pronouns : "No Pronouns";
                    } else {
                        for (let j = 0; j < currentRun.runners.length; j++) {
                            runnerNames.push(currentRun.runners[j].name);
                            runnerPronouns.push(currentRun.runners[j].pronouns != "" ? currentRun.runners[j].pronouns : "No Pronouns");
                        }
                        newObj.runners = runnerNames;
                        newObj.runnerPronouns = runnerPronouns
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
                            commentatorPronouns.push(currentRun.commentators[j].pronouns != "" ? currentRun.commentators[j].pronouns : "No Pronouns")
                        }
                        newObj.commentators = commentatorNames;
                        newObj.commentatorPronouns = commentatorPronouns;
                    } 

                    let runners = "";
                    let comms = "";

                    if (!Array.isArray(newObj.runners)) {
                        runners = `@${newObj.runners} \(${newObj.runnerPronouns})`
                    } else {
                        for (let i = 0; i < newObj.runners.length; i++) {
                            runners += `@${newObj.runners[i]} \(${newObj.runnerPronouns[i]}), `
                        }
                    }

                    if (!Array.isArray(newObj.commentators)) {
                        if (newObj.commentators == "None") {
                            comms = `${newObj.commentators}`;
                        } else {
                            comms = `@${newObj.commentators} \(${newObj.commentatorPronouns})`
                        }
                    } else {
                        for (let i = 0; i < newObj.commentators.length; i++) {
                            comms += `@${newObj.commentators[i]} \(${newObj.commentatorPronouns[i]}), `
                        }
                    }

                    const newMessage = `Game: ${newObj.name}\nCategory: ${newObj.category}\nPlatform: ${newObj.console}\nRun Estimate: ${newObj.estimate}\n` + 
                                    `Runners: ${runners}\nCommentators: ${comms}\nHost: @${newObj.host} \(${newObj.hostPronouns}\)`.trimStart();

                    
                    console.log(`\nRun Info for ${newObj.name}:`)
                    console.log(newMessage);

                    if (!threadIds.has(newObj.name)) {
                        try {
                            const newThread = await forum.threads.create({
                                    name: newObj.name,
                                    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                                    message: {
                                        content: newMessage
                                    },
                                    reason: `Run information/discussion for ${newObj.name}`
                            });
                            
                            console.log(`Created thread: ${newThread.name}`);
                        } catch (e) {
                            console.error(e);
                        }
                    } else {
                        let threadIdNum;
                        threadIds.forEach((value, key) => {
                            if (key == newObj.name) {
                                threadIdNum = value;
                            }
                        });

                        try {
                            const changedThread = await forum.threads.fetch(threadIdNum);
                            console.log(changedThread.messages);

                            /*  Currently does not work because discord doesn't allow thread descriptions to be changed. If this changes in the future,
                                this method would be much more prefered over adding a new message to the bottom
                            changedThread.edit({
                                message: {
                                    content: newMessage
                                }
                            }); */

                            changedThread.send(`Updated run information for ${newObj.name}:\n${newMessage}`);

                            console.log(`Added updated message to thread: ${newObj.name}`);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                } else {
                    continue;
                }
            }
            await interaction.reply('Runs for event #' + eventID + ' pulled!');
        } else {
            await interaction.reply('Not authorized to run this command!');
        }
    }
}