const fs = require('fs');
fetch('https://open.spotify.com/album/0OAv7DCME2AV4q1KPO95HY')
    .then(r => r.text())
    .then(t => {
        fs.writeFileSync('test.html', t);
        console.log("Wrote test.html");
        
        // Try to extract initial state
        const match = t.match(/<script id="initial-state" type="text\/plain">(.*?)<\/script>/s);
        if (match) {
            fs.writeFileSync('initial-state.json', Buffer.from(match[1], 'base64').toString('utf-8'));
            console.log("Wrote initial-state.json from base64");
        } else {
            // some older versions just used JSON in a script
            const match2 = t.match(/<script type="application\/json" id="initial-state">(.*?)<\/script>/s);
            if (match2) {
                fs.writeFileSync('initial-state.json', match2[1]);
                console.log("Wrote initial-state.json");
            } else {
                console.log("No initial state found.");
            }
        }
    })
    .catch(console.error);
