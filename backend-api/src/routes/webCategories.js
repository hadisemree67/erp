const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// Bütün web kategorilerini alt kategorileri ve başlıklarıyla birlikte ağaç şeklinde getirir (Menü için)
router.get('/tree', async (req, res) => {
    try {
        const categories = await prisma.web_categories.findMany({
            where: { is_active: true },
            include: {
                web_subcategories: {
                    where: { is_active: true },
                    include: {
                        web_subtitles: {
                            where: { is_active: true }
                        }
                    }
                }
            }
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching web categories tree:', error);
        res.status(500).json({ error: 'Kategoriler yüklenemedi' });
    }
});

// Tüm kategorileri düz liste getirir
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.web_categories.findMany({
            where: { is_active: true }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, slug, icon } = req.body;
        const category = await prisma.web_categories.create({
            data: { name, slug, icon }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tüm alt kategorileri getirir
router.get('/subcategories', async (req, res) => {
    try {
        const { category_id } = req.query;
        const whereClause = { is_active: true };
        if (category_id) {
            whereClause.category_id = parseInt(category_id);
        }
        
        const subcategories = await prisma.web_subcategories.findMany({
            where: whereClause
        });
        res.json(subcategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/subcategories', async (req, res) => {
    try {
        const { category_id, name, slug } = req.body;
        const sub = await prisma.web_subcategories.create({
            data: { category_id: parseInt(category_id), name, slug }
        });
        res.json(sub);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tüm alt başlıkları getirir
router.get('/subtitles', async (req, res) => {
    try {
        const { subcategory_id } = req.query;
        const whereClause = { is_active: true };
        if (subcategory_id) {
            whereClause.subcategory_id = parseInt(subcategory_id);
        }
        
        const subtitles = await prisma.web_subtitles.findMany({
            where: whereClause
        });
        res.json(subtitles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/subtitles', async (req, res) => {
    try {
        const { subcategory_id, name, slug, url } = req.body;
        const subTitle = await prisma.web_subtitles.create({
            data: { subcategory_id: parseInt(subcategory_id), name, slug, url }
        });
        res.json(subTitle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
