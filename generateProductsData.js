const fs = require('fs');
const path = require('path');

// Helper to hash string deterministically
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Clean up image/folder names into elegant titles
function cleanName(str, categoryName) {
  let base = path.parse(str).name;
  if (/^\d+$/.test(base)) {
    return `${categoryName} ${base}`;
  }
  // Replace dashes and underscores with spaces
  base = base.replace(/[-_]/g, ' ');
  // Remove unsplash/pexels markers
  base = base.replace(/\b(unsplash|pexels)\b/gi, '');
  // Remove typical Unsplash photo IDs (11 alphanumeric characters)
  base = base.replace(/\b[a-zA-Z0-9]{11}\b/g, '');
  // Clean double spaces
  base = base.replace(/\s+/g, ' ').trim();
  // Capitalize each word
  base = base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  if (!base) base = categoryName;
  return base;
}

// Standard icons for categories
const categoryIcons = {
  blouse: 'fa-vest',
  'bridal lehnga': 'fa-person-dress',
  'co-ord set': 'fa-shirt',
  lehnga: 'fa-person-dress',
  'printed shirt': 'fa-shirt',
  shirt: 'fa-shirt',
  suit: 'fa-user-tie',
  kurta: 'fa-person',
  sherwani: 'fa-person',
  tuxedo: 'fa-user-tie'
};

// Templates for details generation based on category keys (lowercased)
const templates = {
  blouse: {
    subtitles: ['Princess Cut custom fit', 'Classic simple traditional style', 'Trending V-neck design', 'Elegant collar neck blouse'],
    fabrics: ['Silk / Brocade', 'Banarasi Silk', 'Premium Velvet', 'Raw Silk', 'Pure Cotton'],
    works: ['Seamless Piping', 'Zari / Lace Trim', 'Hand Embroidery', 'Zardozi Hand Work'],
    descs: [
      'Features seamless curved stitching and a clean custom fit, providing a smooth and highly flattering shape.',
      'A classic style that pairs beautifully with all sarees, ideal for weddings, festivals, and special occasions.',
      'Elegant custom neck design crafted to your measurements, with hand-finished piping and premium lining.'
    ],
    priceRange: [1200, 2500]
  },
  'bridal lehnga': {
    subtitles: ['Regal bridal lehenga choli', 'Heavy hand-embroidered wedding set', 'Heritage zardozi wedding lehenga'],
    fabrics: ['Premium Velvet', 'Raw Silk & Organza', 'Silk Brocade'],
    works: ['Zardozi & Dabka', 'Aari & Resham', 'Hand Quilting & Embroidery'],
    descs: [
      'Intricately detailed bridal lehenga featuring hand embroidery, custom-fitted blouse, and a matching border dupatta. Tailored over 6-8 weeks.',
      'A majestic wedding outfit crafted with traditional craftsmanship, designed to make you stand out on your big day.'
    ],
    priceRange: [35000, 48000]
  },
  'co-ord set': {
    subtitles: ['Chic modern matching set', 'Comfortable designer co-ord set', 'Premium casual top & trouser set'],
    fabrics: ['Crepe & Satin', 'Linen Blend', 'Pure Cotton', 'Soft Rayon'],
    works: ['Minimalist Stitching', 'Pearl Detailing', 'Printed Patterns', 'Garment Washed'],
    descs: [
      'A perfect blend of modern patterns and comfortable custom tailoring. Ideal for casual outings or semi-formal dinners.',
      'Premium matching shirt and trousers, designed for a modern relaxed silhouette and customized to your exact measurements.'
    ],
    priceRange: [2800, 6500]
  },
  lehnga: {
    subtitles: ['Elegant designer lehenga set', 'Lightweight festive lehenga choli', 'Modern style layered lehenga'],
    fabrics: ['Georgette & Organza', 'Raw Silk', 'Net & Satin'],
    works: ['Mirror & Thread Work', 'Gota Patti Work', 'Resham Embroidery'],
    descs: [
      'Exquisite custom lehenga with delicate embroidery and high-quality lining. Beautifully draped and customized to your size.',
      'Perfect for engagements, mehendi functions, and sangeet nights, combining comfort and heritage styling.'
    ],
    priceRange: [15000, 28000]
  },
  'printed shirt': {
    subtitles: ['Designer printed shirt', 'Casual floral print shirt', 'Premium cotton printed shirt'],
    fabrics: ['Pure Cotton', 'Soft Rayon', 'Satin Silk'],
    works: ['Digital Print', 'Block Print', 'Single-needle Stitching'],
    descs: [
      'Featuring premium printed motifs and custom collar options, tailored for a relaxed yet polished appearance.',
      'Comfortable everyday printed shirt, pre-washed for softness and stitched to fit your body type perfectly.'
    ],
    priceRange: [1500, 2600]
  },
  shirt: {
    subtitles: ['Tailor-made casual shirt', 'Premium custom formal shirt', 'Crisp cotton formal shirt'],
    fabrics: ['Egyptian Cotton', 'Oxford Cotton', 'Pure Linen', 'Linen-Silk Blend'],
    works: ['Single-needle Stitching', 'Hand-finished Placket', 'Garment Washed'],
    descs: [
      'Bespoke casual or formal shirt with mother-of-pearl buttons and custom collar/cuff designs.',
      'Stitched from high-thread-count cotton with clean, high-density stitching for a premium, sharp look.'
    ],
    priceRange: [1800, 3200]
  },
  suit: {
    subtitles: ['Elegant custom suit set', 'Pakistani style straight suit', 'Bespoke three-piece formal suit'],
    fabrics: ['Italian Wool Blend', 'Cambric Cotton', 'Silk Chanderi', 'Wool Tweed'],
    works: ['Zari & Resham Work', 'Full-canvas Construction', 'Resham & Pearl Details'],
    descs: [
      'Custom tailored formal wear. Includes matching top, trousers/salwar, and dupatta or jacket, styled for sophistication.',
      'A classic silhouette tailored to your exact fit, featuring premium linings and hand-finished details.'
    ],
    priceRange: [8000, 24000]
  },
  kurta: {
    subtitles: ['Traditional gents kurta', 'Festive embroidered kurta', 'Comfortable linen casual kurta'],
    fabrics: ['Pure Linen', 'Cotton Silk', 'Tussar Silk', 'Pure Cotton'],
    works: ['Thread Work & Embroidery', 'Hand Block Print', 'Mirror Work Yoke'],
    descs: [
      'Classic straight-cut kurta with fine tailored details and side pockets. Perfect for festivals and family functions.',
      'Lightweight and breathable traditional wear, styled with a modern mandarin collar and hand-finished placket.'
    ],
    priceRange: [2200, 4800]
  },
  sherwani: {
    subtitles: ['Intricately hand-embroidered wedding sherwani', 'Velvet majesty royal sherwani', 'Asymmetric fusion Indo-Western sherwani'],
    fabrics: ['Raw Silk & Organza', 'Premium Velvet', 'Silk-Wool Blend'],
    works: ['Zardozi & Resham', 'Aari & Dabka', 'Hand Quilting'],
    descs: [
      'Regal wedding sherwani with detailed hand embroidery on collar, chest, and cuffs. Comes with churidar pants and a matching dupatta.',
      'A heritage-inspired design crafted for grooms, featuring premium fabrics, structured shoulders, and custom-fit trousers.'
    ],
    priceRange: [24000, 38000]
  },
  tuxedo: {
    subtitles: ['Black-tie evening tuxedo', 'Midnight blue shawl lapel tuxedo', 'Burgundy velvet dinner jacket'],
    fabrics: ['Wool & Satin', 'Premium Velvet', 'Tropical Wool'],
    works: ['Satin Lapel Hand-stitched', 'Frog Closures', 'Hand-finished Satin Trim'],
    descs: [
      'Sophisticated double or single-breasted tuxedo with premium satin lapels, tailored to perfection for formal galas.',
      'Premium velvet dinner jacket set with satin-stripe trousers, custom pocket squares, and satin-covered buttons.'
    ],
    priceRange: [28000, 38000]
  }
};

const defaultTemplate = {
  subtitles: ['Custom tailored outfit', 'Premium bespoke couture', 'Handcrafted traditional wear'],
  fabrics: ['Premium Cotton', 'Silk Blend', 'Linen Blend'],
  works: ['Hand-finishing', 'Custom Stitching', 'Detail Piping'],
  descs: [
    'Expertly tailored custom outfit made from premium fabrics. Stitched to your exact measurements with modern equipment.',
    'High-quality bespoke design featuring custom accents and a highly comfortable tailored fit.'
  ],
  priceRange: [2000, 8000]
};

// Main function to generate the products catalog JSON structure
function generateProductsCatalog(imagesDir) {
  const catalog = {
    ladies: {
      hero: {
        eyebrow: 'Ladies Collection · 2026',
        title: 'New Latest <em>Tailors</em>',
        desc: 'Beautiful custom outfits tailored for you. From hand-embroidered blouses to designer lehengas, each piece is made to your exact measurements with the beauty of traditional Indian stitching.'
      },
      categories: [{ id: 'all', name: 'All', icon: 'fa-border-all' }],
      products: {}
    },
    gents: {
      hero: {
        eyebrow: 'Gents Collection · 2026',
        title: 'Latest <em>Tailor</em>',
        desc: 'Stylish clothes for modern men — from custom sherwanis to three-piece suits. Every piece is handmade and fits you perfectly.'
      },
      categories: [{ id: 'all', name: 'All', icon: 'fa-border-all' }],
      products: {}
    }
  };

  const genders = ['ladies', 'gents'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  genders.forEach(gender => {
    // Read the gender folder (case-insensitive find since folders are Gents / Ladies)
    const genderFolderName = gender === 'ladies' ? 'Ladies' : 'Gents';
    const genderPath = path.join(imagesDir, genderFolderName);

    if (!fs.existsSync(genderPath)) {
      console.warn(`Gender folder does not exist: ${genderPath}`);
      return;
    }

    const categories = fs.readdirSync(genderPath).filter(item => {
      return fs.statSync(path.join(genderPath, item)).isDirectory();
    });

    categories.forEach(catFolder => {
      const catId = catFolder.toLowerCase().replace(/\s+/g, '-');
      const catName = catFolder.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const icon = categoryIcons[catFolder.toLowerCase()] || 'fa-shirt';

      // Push to categories list
      catalog[gender].categories.push({
        id: catId,
        name: catName,
        icon: icon
      });

      // Prepare products array for this category
      catalog[gender].products[catId] = [];

      const catPath = path.join(genderPath, catFolder);
      const itemsInCat = fs.readdirSync(catPath);

      itemsInCat.forEach(item => {
        const itemFullPath = path.join(catPath, item);
        const itemStat = fs.statSync(itemFullPath);
        let productImages = [];
        let isMultiAngle = false;
        let productName = '';
        let productIdSeed = '';

        if (itemStat.isDirectory()) {
          // This is a subfolder, e.g., sherwani1. It represents a single product with multiple images
          isMultiAngle = true;
          const subfolderFiles = fs.readdirSync(itemFullPath);
          const imageFiles = subfolderFiles
            .filter(f => validExtensions.includes(path.extname(f).toLowerCase()))
            .sort();

          if (imageFiles.length === 0) return; // Skip empty folders

          productImages = imageFiles.map(f => `images/${genderFolderName}/${catFolder}/${item}/${f}`);
          productName = cleanName(item, catName);
          productIdSeed = `${gender}-${catId}-${item.toLowerCase()}`;
        } else {
          // This is a single image file
          const ext = path.extname(item).toLowerCase();
          if (!validExtensions.includes(ext)) return; // Skip non-image files

          productImages = [`images/${genderFolderName}/${catFolder}/${item}`];
          productName = cleanName(item, catName);
          productIdSeed = `${gender}-${catId}-${path.parse(item).name.toLowerCase()}`;
        }

        // Generate details deterministically using string hashing
        const hash = hashString(productIdSeed);
        const temp = templates[catFolder.toLowerCase()] || defaultTemplate;

        const subtitle = temp.subtitles[hash % temp.subtitles.length];
        const fabric = temp.fabrics[(hash + 1) % temp.fabrics.length];
        const work = temp.works[(hash + 2) % temp.works.length];
        const desc = temp.descs[(hash + 3) % temp.descs.length];

        const [minPrice, maxPrice] = temp.priceRange;
        // Step size of 100 for neat prices
        const priceSteps = Math.floor((maxPrice - minPrice) / 100);
        const price = minPrice + ((hash % (priceSteps + 1)) * 100);

        catalog[gender].products[catId].push({
          id: `p-${productIdSeed}`,
          name: productName,
          subtitle: subtitle,
          price: price,
          work: work,
          fabric: fabric,
          desc: desc,
          images: productImages
        });
      });
    });
  });

  return catalog;
}

// Generate the script content that defines window.productsData
function generateScriptContent(imagesDir) {
  const data = generateProductsCatalog(imagesDir);
  return `// Automatically generated from images directory. Do not edit directly.\nconst productsData = ${JSON.stringify(data, null, 2)};\n`;
}

module.exports = {
  generateProductsCatalog,
  generateScriptContent
};

// If run directly, generate a static file
if (require.main === module) {
  try {
    const imagesDir = path.join(__dirname, 'images');
    const content = generateScriptContent(imagesDir);
    fs.writeFileSync(path.join(__dirname, 'productsData.js'), content);
    console.log('Successfully generated productsData.js static file!');
  } catch (err) {
    console.error('Error executing standalone script:', err);
  }
}
