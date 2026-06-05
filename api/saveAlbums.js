import clientPromise from '../lib/mongodb.js';

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
        const { albums } = req.body;
        if (!Array.isArray(albums)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const client = await clientPromise;
        const db = client.db('rejirate');
        
        // Записываем или обновляем список альбомов
        await db.collection('data').updateOne(
            { _id: 'my_albums' },
            { $set: { albums: albums } },
            { upsert: true }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: 'Failed to save albums' });
    }
}
