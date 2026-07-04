import { SlashCommandBuilder, PermissionFlagsBits} from 'discord.js';
import * as configModule from '../../config.json' with { type: "json" };

// ============================================================================
// CONFIGURATION
// ============================================================================
const STAFF_ROLE = configModule.default.config.staffRole;
const BASE_TRACKER_URL = configModule.default.config.baseTrackerUrl;
// ============================================================================

export const data = new SlashCommandBuilder()
    .setName('list_event_ids')
    .setDescription('List available Event IDs to pull from GDQ tracker.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
export async function execute(interaction) {
    let member = interaction.member.guild;
    let trackerData, obj;
    if (member.roles.cache.find(role => role.name === STAFF_ROLE)) {
        trackerData = await fetch(`${BASE_TRACKER_URL}/events/`);
        obj = await trackerData.json();
        let resp = "```\n";
        for (let i = 0; i < obj.count; i++) {
            let currentEvent = obj.results[i];
            resp = resp + "EventID:"+currentEvent.id+"\tName:"+currentEvent.name+"\t"+currentEvent.datetime+"\n"
        }
        resp = resp+"```";
        return await interaction.reply({
            content: resp,
        });
    } else {
        await interaction.reply({ content: 'Not authorized to run this command!', flags: MessageFlags.Ephemeral });
    }
}
