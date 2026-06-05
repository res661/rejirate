export default async function handler(req, res) {
    // Включаем CORS для всех источников, чтобы работало откуда угодно
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { albumId } = req.query;
    if (!albumId) {
        return res.status(400).json({ error: 'Missing albumId' });
    }

    const SPOTIFY_CLIENT_ID = '32d19146cf584f9794541397051e3eeb';
    const SPOTIFY_CLIENT_SECRET = '1fd07b7cb50e460e98d9d2ed753d353a';

    try {
        // 1. Получаем токен
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to fetch Spotify token');
        }

        const tokenData = await tokenResponse.json();
        const token = tokenData.access_token;

        // 2. Получаем данные об альбоме
        const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!albumResponse.ok) {
            throw new Error('Failed to fetch Album data from Spotify');
        }

        const albumData = await albumResponse.json();
        
        // Отправляем данные клиенту
        res.status(200).json(albumData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
