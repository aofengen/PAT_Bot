const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
	.setName('create_runs')
	.setDescription('Creates threads for accepted marathon runs in a forum channel')
    .addIntegerOption(option =>
        option
            .setName('event')
            .setDescription('Pull runs from this event ID')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        let obj;
        const res = await fetch('https://tracker.preventathon.com/tracker/api/v2/runs/');

        const eventID = interaction.options.getInteger('event');
        obj = await res.json();
        
        for(let i = 0; i < obj.count; i++) {
            let newObj = new Object();

            if (obj.results[i].event.id === eventID && obj.results[i].runners[0].name != 'Staff') {
                // console.log(obj.results[i]);
                newObj.name = obj.results[i].name;
                newObj.estimate = obj.results[i].run_time;
                newObj.host = obj.results[i].hosts[0].name;

                if (obj.results[i].runners.length == 1) {
                    newObj.runner = obj.results[i].runners[0].name;
                } else {
                    let multipleRunners = "";
                    for (let j = 0; j < obj.results[i].runners.length; j++) {
                        multipleRunners += obj.results[i].runners[j].name + ", ";
                    }
                    newObj.runner = multipleRunners
                } 

                if (obj.results[i].commentators.length == 0) {
                    newObj.commentators = "No Commentators";
                } else if (obj.results[i].commentators.length == 1) {
                    newObj.commentators = obj.results[i].commentators[0].name;
                } else {
                    let multipleCommentators = "";
                    for (let j = 0; j < obj.results[i].commentators.length; j++) {
                        multipleCommentators += obj.results[i].commentators[j].name + ", ";
                    }
                    newObj.commentators = multipleCommentators
                } 
                // console.log(newObj);
            } else {
                continue;
            }
        }
        await interaction.reply('Runs for event #' + eventID + ' pulled!');
    }
}