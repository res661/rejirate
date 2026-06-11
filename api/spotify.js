export default async function handler(req, res) {
    // Включаем CORS для всех источников
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { albumId, playlistId } = req.query;
    if (!albumId && !playlistId) {
        return res.status(400).json({ error: 'Missing albumId or playlistId' });
    }

    const isPlaylist = !!playlistId;
    const entityId = isPlaylist ? playlistId : albumId;
    const typePath = isPlaylist ? 'playlist' : 'album';

    try {
        // Мы скачиваем HTML-страницу эмбеда напрямую и парсим ее. 
        // Это позволяет обойти ошибку авторизации и получить чистый JSON с метаданными.
        const response = await fetch(`https://open.spotify.com/embed/${typePath}/${entityId}`);
        if (!response.ok) {
            return res.status(response.status).json({ error: `Spotify fetch failed with status ${response.status}` });
        }
        const html = await response.text();

        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!nextDataMatch) {
            return res.status(500).json({ error: 'Failed to parse Spotify page data' });
        }

        const data = JSON.parse(nextDataMatch[1]);
        const entity = data.props?.pageProps?.state?.data?.entity;

        if (!entity) {
            return res.status(500).json({ error: 'Invalid state structure returned by Spotify' });
        }

        const title = entity.name || entity.title || (isPlaylist ? "Unknown Playlist" : "Unknown Album");
        
        let artist = "Spotify Creator";
        if (!isPlaylist) {
            artist = entity.subtitle || "Spotify Artist";
        } else {
            // Для плейлистов subtitle обычно выглядит как "Playlist · mavyax · 25 items"
            const subtitle = entity.subtitle || "";
            if (subtitle.startsWith("Playlist ·")) {
                const parts = subtitle.split("·").map(p => p.trim());
                if (parts.length > 1) {
                    artist = parts[1];
                }
            } else if (entity.authors && entity.authors.length > 0) {
                artist = entity.authors.map(a => a.name).join(", ");
            }
        }

        let coverUrl = "https://via.placeholder.com/300?text=No+Cover";
        if (entity.coverArt?.sources && entity.coverArt.sources.length > 0) {
            coverUrl = entity.coverArt.sources[0].url;
        } else if (entity.visualIdentity?.image && entity.visualIdentity.image.length > 0) {
            const img640 = entity.visualIdentity.image.find(img => img.maxWidth === 640);
            coverUrl = img640 ? img640.url : entity.visualIdentity.image[0].url;
        }

        let tracks = [];
        if (entity.trackList && Array.isArray(entity.trackList)) {
            tracks = entity.trackList.map((t, idx) => {
                let trackId = `track_${idx}`;
                if (t.uri) {
                    const parts = t.uri.split(':');
                    trackId = parts[parts.length - 1];
                }
                return {
                    id: trackId,
                    name: t.title || `Трек ${idx + 1}`,
                    artists: t.subtitle || artist
                };
            });
        }

        const formattedData = {
            id: entityId,
            name: title,
            artists: [{ name: artist }],
            images: [{ url: coverUrl }],
            tracks: {
                items: tracks
            }
        };

        res.status(200).json(formattedData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
