const fs = require('fs');
const path = require('path');
const https = require('https');

// UPDATED Map with working URLs (replacing 404s)
const imageMap = {
    // Product Images
    'momo_steam': "https://images.unsplash.com/photo-1496116218417-1a781b1c423c?auto=format&fit=crop&w=800&q=80", // Dumplings
    'momo_chili': "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=800&q=80",
    'momo_jhol': "https://images.unsplash.com/photo-1596627162243-14743a03841b?auto=format&fit=crop&w=800&q=80", // Soup dumplings
    'momo_fried': "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=800&q=80",
    'momo_kothey': "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=800&q=80",

    // REPLACED DEAD LINKS
    'thakali_set': "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80", // Indian Thali/Similar
    'mutton_thakali': "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    'dhindo_set': "https://images.unsplash.com/photo-1626804475297-411d8631c8df?auto=format&fit=crop&w=800&q=80", // Keep trying or fallback

    'newari_samay': "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80", // Platter fallback
    'choila': "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=80",
    'bara': "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=800&q=80", // Pancake/Fritter
    'yomari': "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80", // Dessert fallback

    'chowmein': "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80",
    'thukpa': "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80",

    'sel_roti': "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    'sausage': "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=800&q=80",

    // FRIES FIXED
    'fries': "https://images.unsplash.com/photo-1573080496987-a199f8cd75ec?auto=format&fit=crop&w=800&q=80",

    'burger': "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    'pizza': "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",

    // Restaurant Logos & Covers
    'res_nepal_logo': "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=60",
    'res_nepal_cover': "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",

    'res_thakali_logo': "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=60",
    'res_thakali_cover': "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",

    'res_momo_logo': "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
    'res_momo_cover': "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",

    // User Profiles
    'user_admin': "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    'user_customer': "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80"
};

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log(`Created directory: ${uploadDir}`);
}

const downloadImage = (filename, url) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(uploadDir, `${filename}.jpg`);

        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(filePath, () => { });
                console.log(`Failed to download ${filename} (Status: ${response.statusCode})`);
                resolve();
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${filename}.jpg`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { });
            console.error(`Error downloading ${url}: ${err.message}`);
            resolve();
        });
    });
};

(async () => {
    const keys = Object.keys(imageMap);
    console.log(`Starting download of ${keys.length} images to ${uploadDir}...`);

    for (const key of keys) {
        // Redownload everything to be safe/sure, or checking existence logic is fine. 
        // For this script, I removed the 'exists' check to FORCE redownload of broken 0-byte files if any.
        await downloadImage(key, imageMap[key]);
    }

    console.log('All downloads completed.');
})();
