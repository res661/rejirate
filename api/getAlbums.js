import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (!clientPromise) {
            return res.status(200).json([]); // Если база еще не подключена, возвращаем пустой массив
        }

        const client = await clientPromise;
        const db = client.db('rejirate');
        
        const data = await db.collection('data').findOne({ _id: 'my_albums' });
        
        if (!data || !data.albums) {
            return res.status(200).json([]);
        }

        res.status(200).json(data.albums);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
}
