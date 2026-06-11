import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (!supabase) {
            return res.status(200).json([]); // Если Supabase еще не подключен, возвращаем пустой массив
        }

        const { data, error } = await supabase
            .from('app_data')
            .select('albums')
            .eq('id', 'my_playlists')
            .single();

        if (error || !data || !data.albums) {
            return res.status(200).json([]);
        }

        res.status(200).json(data.albums);
    } catch (error) {
        console.error("Supabase Fetch Error:", error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
}
