## Config File
### Create config.json at top of repo and add the following:

```json
{
    "config": {
        "token": "", //your app token from the discord developer portal
        "clientId": "", //your clientId from the discord developer portal
        "isProd": <true/false>, //true for use in production, false for dev testing. 
        "prodOutputChannel": "", //production discord channel to output posts 
        "testOutputChannel": "", //testing production discord channel to output posts
        "safetyStaffChannel": "", //safety staff channel in your server
        "baseTrackerUrl": "", //base URL for tracker instance being used
        "eventID": "", //tracker event ID being used
        "staffRole": "", //name of staff role in your server
        "safetyRole": "", //name of safety staff role in your server
        "gcRole": "", //name of Games Committee role in your server
        "producerRole": "", //name of Producer role in your server
        "setupRole": //name of setup volunteer role in your server
    }
}
```