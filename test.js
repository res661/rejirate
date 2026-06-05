const fs = require('fs');
const html = fs.readFileSync('spotify.html', 'utf8');

const regex = /aria-labelledby="listrow-title-track-spotify:track:([^"]+)" aria-label="([^"]+)" data-testid="track-row"/g;
const tracks = [...html.matchAll(regex)].map(m => ({ id: m[1], title: m[2].replace(/&amp;/g, '&') }));

let title = "Unknown Album";
const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
if (titleMatch) title = titleMatch[1].replace(" - Album by ", " - ").split(" | Spotify")[0];

let coverUrl = "https://via.placeholder.com/300";
const coverMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
if (coverMatch) coverUrl = coverMatch[1];

let artist = "Spotify Artist";
const artistMatch = html.match(/<a draggable="false" href="\/artist\/[^"]+">([^<]+)<\/a>/);
if (artistMatch) artist = artistMatch[1];

console.log({title, artist, coverUrl, tracks: tracks.length});
