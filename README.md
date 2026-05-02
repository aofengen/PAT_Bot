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
        "baseTrackerUrl": "", //base URL for tracker instance being used
        "eventID": "" //tracker event ID being used
    }
}
```