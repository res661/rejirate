import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Проверка пароля Админа
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized: Неверный пароль' });
    }

    try {
        const { playlists } = req.body;
        if (!Array.isArray(playlists)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Supabase client not initialized' });
        }

        // Записываем или обновляем список плейлистов
        const { error } = await supabase
            .from('app_data')
            .upsert({ id: 'my_playlists', albums: playlists });

        if (error) {
            console.error("Supabase Write Error:", error);
            return res.status(500).json({ error: 'Failed to save to Supabase' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Supabase Save Error:", error);
        res.status(500).json({ error: 'Failed to save playlists' });
    }
}
