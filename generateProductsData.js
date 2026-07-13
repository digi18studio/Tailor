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
  // Remove typical Unsplash photo IDs (11 alphanumeric characters, containing at least one digit)
  base = base.replace(/\b(?=[a-zA-Z0-9]*[0-9])[a-zA-Z0-9]{11}\b/g, '');
  // Clean double spaces
  base = base.replace(/\s+/g, ' ').trim();
  // Capitalize each word
  base = base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  if (!base) base = categoryName;
  return base;
}

// Parse the base product name and its angle from a filename
// E.g., "4.1.jpg" -> { base: "4", angle: 1 }
// E.g., "4.jpg" -> { base: "4", angle: null }
// E.g., "shirt_ (5.1).jpg" -> { base: "shirt_ (5)", angle: 1 }
function getProductBaseName(filename) {
  const ext = path.extname(filename);
  let base = path.basename(filename, ext);

  // Regex to match a trailing dot and digits before optional closing parenthesis
  // Examples:
  // "4.1" -> match[1] = "4", match[2] = "1", match[3] = ""
  // "shirt_ (5.1)" -> match[1] = "shirt_ (5", match[2] = "1", match[3] = ")"
  const match = base.match(/^(.*?)\.(\d+)(\)?)$/);
  if (match) {
    let basePart = match[1];
    let closingParen = match[3] || '';
    
    // If we had a closing parenthesis, and the base part ends with opening parenthesis
    // E.g. basePart = "shirt_ (5", closingParen = ")"
    // We should keep the closing parenthesis to balance it: "shirt_ (5)"
    if (closingParen === ')' && basePart.includes('(') && !basePart.endsWith(')')) {
      basePart = basePart + ')';
    }
    
    return {
      base: basePart.trim(),
      angle: parseInt(match[2])
    };
  }
  
  return {
    base: base,
    angle: null
  };
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

const shirtMetadata = {
  "shirt_ (1)": {
    name: "Navy Polka Dot Shirt",
    subtitle: "Navy blue polka dot casual shirt",
    work: "Short Sleeve Design",
    fabric: "Premium Cotton"
  },
  "shirt_ (2)": {
    name: "Blue Pinstripe Formal Shirt",
    subtitle: "Classic light blue pinstriped formal shirt",
    work: "Single-needle Stitching",
    fabric: "Egyptian Cotton"
  },
  "shirt_ (5)": {
    name: "Turquoise Checked Casual Shirt",
    subtitle: "Stylish turquoise checked shirt",
    work: "Contrast Cuff Lining",
    fabric: "Pure Linen"
  },
  "shirt_ (6)": {
    name: "White Linen Mandarin Shirt",
    subtitle: "Casual white linen shirt with band collar",
    work: "Mandarin Collar Stitching",
    fabric: "Pure Linen"
  },
  "shirt_ (16)": {
    name: "Red and White Checked Shirts",
    subtitle: "Pack of two checked casual shirts",
    work: "Double-needle Stitching",
    fabric: "Oxford Cotton"
  },
  "shirt_ (17)": {
    name: "Light Blue Oxford Shirt",
    subtitle: "Bespoke light blue oxford cotton shirt",
    work: "Hand-finished Placket",
    fabric: "Oxford Cotton"
  },
  "shirt_ (18)": {
    name: "Burgundy Solid Casual Shirt",
    subtitle: "Deep maroon casual button-down shirt",
    work: "Standard Curved Hem",
    fabric: "Cotton-Linen Blend"
  },
  "shirt_ (19)": {
    name: "Blue and Pink Striped Shirt",
    subtitle: "Light blue shirt with pink vertical stripes",
    work: "Front Pocket Accent",
    fabric: "Premium Cotton"
  },
  "shirt_ (20)": {
    name: "Tropical Leaf Hawaiian Shirt",
    subtitle: "Hawaiian resort wear floral print shirt",
    work: "Relaxed Camp Collar",
    fabric: "Soft Rayon"
  },
  "shirt_ (22)": {
    name: "Mandarin Collar White Shirt",
    subtitle: "Clean white casual shirt with band collar",
    work: "Concealed Button Placket",
    fabric: "Linen-Silk Blend"
  },
  "shirt_ (23)": {
    name: "Olive Green Slim Shirt",
    subtitle: "Tailored olive green long sleeve shirt",
    work: "Slim Fit Stitching",
    fabric: "Stretch Cotton"
  },
  "shirt_ (24)": {
    name: "Pastel Pink Dress Shirt",
    subtitle: "Classic pastel pink formal dress shirt",
    work: "Stiff Collar Construction",
    fabric: "Egyptian Cotton"
  },
  "shirt_ (25)": {
    name: "Premium Crisp White Shirt",
    subtitle: "Formal pure white cotton shirt",
    work: "French Cuffs Option",
    fabric: "Egyptian Cotton"
  },
  "shirt_ (26)": {
    name: "Navy Blue Formal Shirt",
    subtitle: "Deep navy blue long sleeve formal shirt",
    work: "Single-needle Stitching",
    fabric: "Egyptian Cotton"
  },
  "shirt_ (27)": {
    name: "Chinese Collar Linen Shirt",
    subtitle: "Linen shirt with traditional loop buttons",
    work: "Frog Loop Button Closures",
    fabric: "Pure Linen"
  },
  "shirt_ (28)": {
    name: "Multi Color Polo Shirts",
    subtitle: "Classic polo collar casual knit shirts",
    work: "Ribbed Collar Details",
    fabric: "Pima Cotton Knit"
  },
  "shirt_ (29)": {
    name: "Rugged Denim Trucker Jacket",
    subtitle: "Vintage denim jacket with corduroy collar",
    work: "Heavy Thread Topstitching",
    fabric: "Sturdy Denim Cotton"
  },
  "shirt_ (35)": {
    name: "Fern Leaf Print Shirt",
    subtitle: "Dark blue shirt with white fern prints",
    work: "Digital All-over Print",
    fabric: "Soft Rayon"
  },
  "shirt_ (36)": {
    name: "Multicolor Floral Satin Shirt",
    subtitle: "Short sleeve floral print satin shirt",
    work: "Silky Smooth Stitching",
    fabric: "Satin Silk Blend"
  },
  "shirt_ (37)": {
    name: "Vintage Floral Print Shirt",
    subtitle: "Vibrant floral long sleeve cotton shirt",
    work: "Vivid Digital Printing",
    fabric: "Premium Cotton"
  }
};

const ladiesShirtMetadata = {
  "alexandra-tran-dTaEjJeKus8-unsplash": {
    name: "Classic White Linen Shirt",
    subtitle: "Relaxed fit linen casual shirt",
    work: "Roll-up Sleeve Stitching",
    fabric: "Pure Linen"
  },
  "amin-naderloei-nn13uD5x_Tk-unsplash": {
    name: "Brown Crochet Lace Shirt",
    subtitle: "Chic open-knit crochet shirt",
    work: "Intricate Lace Knitting",
    fabric: "Crochet Cotton"
  },
  "dmytro-nushtaiev-tyv3bhizAx8-unsplash": {
    name: "Flowy White Cotton Shirt",
    subtitle: "Lightweight everyday casual shirt",
    work: "Side-slit Curved Hem",
    fabric: "Soft Cambric Cotton"
  },
  "imana-hceDyN0-dTU-unsplash": {
    name: "Paisley Print Tunic Shirt",
    subtitle: "Vibrant festive paisley tunic",
    work: "Mandarin Split V-Neck",
    fabric: "Premium Rayon"
  },
  "manito-silk-g4nUezDE0Yg-unsplash": {
    name: "Premium Sleeveless Silk Shirt",
    subtitle: "Elegant sleeveless mulberry silk shirt",
    work: "Seamless Edge Finishing",
    fabric: "Pure Mulberry Silk"
  },
  "rydale-clothing-Xz09f_BrIoE-unsplash": {
    name: "Ruffled Collar Blue Shirt",
    subtitle: "Classic equestrian ruffled shirt",
    work: "Ruffled Placket Details",
    fabric: "Premium Poplin Cotton"
  },
  "shirt_2": {
    name: "Classic Brown Cotton Shirt",
    subtitle: "Relaxed fit basic button-down shirt",
    work: "Single-needle Stitching",
    fabric: "Sturdy Twill Cotton"
  },
  "shirt_6": {
    name: "Vibrant Pink Polo Shirt",
    subtitle: "Bright long sleeve casual polo shirt",
    work: "Ribbed Knit Collar",
    fabric: "Pique Cotton Blend"
  }
};

const ladiesSuitMetadata = {
  "ikshana-productions-PO97e-4VdKg-unsplash": {
    name: "Pakistani Designer Suit",
    subtitle: "Elegant straight cut embroidered suit set",
    work: "Thread embroidery & pearls",
    fabric: "Silk Georgette"
  },
  "ikshana-productions-XmDZKCBFezg-unsplash": {
    name: "Royal Anarkali Suit",
    subtitle: "Floor-length flared anarkali suit set",
    work: "Zari embroidery & lace trims",
    fabric: "Premium Chanderi Silk"
  },
  "rupali-neelkanth-8c12YYpzMdk-unsplash": {
    name: "Festive Salwar Kameez",
    subtitle: "Classic traditional salwar suit set",
    work: "Handcrafted Gota Patti work",
    fabric: "Cambric Cotton"
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

    let categories = fs.readdirSync(genderPath).filter(item => {
      return fs.statSync(path.join(genderPath, item)).isDirectory();
    });

    if (gender === 'gents') {
      const order = ['suit', 'shirt', 'kurta', 'sherwani', 'tuxedo'];
      categories.sort((a, b) => {
        const idxA = order.indexOf(a.toLowerCase());
        const idxB = order.indexOf(b.toLowerCase());
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    }

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

      // We will group products inside this category
      const productsTempList = [];

      // Separate items into subdirectories and files
      const subdirs = [];
      const files = [];

      itemsInCat.forEach(item => {
        const itemFullPath = path.join(catPath, item);
        const itemStat = fs.statSync(itemFullPath);
        if (itemStat.isDirectory()) {
          subdirs.push(item);
        } else {
          files.push(item);
        }
      });

      // Process subdirectories (each subdirectory is a separate multi-angle product)
      subdirs.forEach(subdir => {
        const subdirFullPath = path.join(catPath, subdir);
        const subfiles = fs.readdirSync(subdirFullPath);
        const imageFiles = subfiles
          .filter(f => validExtensions.includes(path.extname(f).toLowerCase()))
          .sort();

        if (imageFiles.length === 0) return;

        const productImages = imageFiles.map(f => `images/${genderFolderName}/${catFolder}/${subdir}/${f}`);
        const productName = cleanName(subdir, catName);
        const productIdSeed = `${gender}-${catId}-${subdir.toLowerCase()}`;

        productsTempList.push({
          idSeed: productIdSeed,
          name: productName,
          images: productImages,
          originalBase: subdir
        });
      });

      // Process files: group files by base name (dot-notation, e.g. "4.1" and "4.2" grouped as "4")
      const fileGroups = {};
      files.forEach(f => {
        const ext = path.extname(f).toLowerCase();
        if (!validExtensions.includes(ext)) return; // Skip non-image files

        // Parse base name and angle using the helper
        const info = getProductBaseName(f);
        if (!fileGroups[info.base]) {
          fileGroups[info.base] = [];
        }
        fileGroups[info.base].push({
          filename: f,
          angle: info.angle || 0
        });
      });

      // For each group, sort images by angle, then create a product
      Object.keys(fileGroups).forEach(base => {
        const group = fileGroups[base];
        // Sort by angle ascending
        group.sort((a, b) => a.angle - b.angle);

        const productImages = group.map(item => `images/${genderFolderName}/${catFolder}/${item.filename}`);
        const productName = cleanName(base, catName);
        const productIdSeed = `${gender}-${catId}-${base.toLowerCase().replace(/\s+/g, '-')}`;

        productsTempList.push({
          idSeed: productIdSeed,
          name: productName,
          images: productImages,
          originalBase: base
        });
      });

      // Now generate details for all products in productsTempList and push to catalog
      productsTempList.forEach(prod => {
        // Generate details deterministically using string hashing
        const hash = hashString(prod.idSeed);
        const temp = templates[catFolder.toLowerCase()] || defaultTemplate;

        let name = prod.name;
        let subtitle = temp.subtitles[hash % temp.subtitles.length];
        let fabric = temp.fabrics[(hash + 1) % temp.fabrics.length];
        let work = temp.works[(hash + 2) % temp.works.length];
        let desc = temp.descs[(hash + 3) % temp.descs.length];

        if (catId === 'shirt') {
          if (gender === 'gents') {
            const meta = shirtMetadata[prod.originalBase];
            if (meta) {
              if (meta.name) name = meta.name;
              if (meta.subtitle) subtitle = meta.subtitle;
              if (meta.work) work = meta.work;
              if (meta.fabric) fabric = meta.fabric;
              desc = `A premium custom-fit shirt tailored from ${fabric.toLowerCase()} fabric, featuring detailed ${work.toLowerCase()} and master tailoring.`;
            }
          } else if (gender === 'ladies') {
            const meta = ladiesShirtMetadata[prod.originalBase];
            if (meta) {
              if (meta.name) name = meta.name;
              if (meta.subtitle) subtitle = meta.subtitle;
              if (meta.work) work = meta.work;
              if (meta.fabric) fabric = meta.fabric;
              desc = `A bespoke ladies custom-fit shirt tailored from ${fabric.toLowerCase()} fabric, featuring detailed ${work.toLowerCase()} and master tailoring.`;
            }
          }
        } else if (catId === 'suit') {
          if (gender === 'ladies') {
            const meta = ladiesSuitMetadata[prod.originalBase];
            if (meta) {
              if (meta.name) name = meta.name;
              if (meta.subtitle) subtitle = meta.subtitle;
              if (meta.work) work = meta.work;
              if (meta.fabric) fabric = meta.fabric;
              desc = `A premium custom-fit ladies suit tailored from ${fabric.toLowerCase()} fabric, featuring detailed ${work.toLowerCase()} and master tailoring.`;
            }
          }
        }

        const [minPrice, maxPrice] = temp.priceRange;
        // Step size of 100 for neat prices
        const priceSteps = Math.floor((maxPrice - minPrice) / 100);
        let price = minPrice + ((hash % (priceSteps + 1)) * 100);

        // Apply price division factors as requested by user
        if (gender === 'ladies') {
          if (catId === 'blouse' || catId === 'bridal-lehnga') {
            price = Math.round((price / 2) / 100) * 100;
          } else if (catId === 'co-ord-set') {
            price = Math.round((price / 4) / 100) * 100;
          } else if (catId === 'kurta' || catId === 'printed-shirt' || catId === 'shirt') {
            price = Math.round((price / 3) / 100) * 100;
          } else if (catId === 'suit') {
            price = Math.round((price / 12) / 100) * 100;
          }
        } else if (gender === 'gents') {
          if (catId === 'kurta' || catId === 'shirt') {
            price = Math.round((price / 3) / 100) * 100;
          } else if (catId === 'sherwani') {
            price = Math.round((price / 2) / 100) * 100;
          } else if (catId === 'tuxedo') {
            price = Math.round((price / 18) / 100) * 100;
          }
        }

        // Subtract 1 rupee if the price ends in a multiple of 100 (charm pricing)
        if (price % 100 === 0) {
          price -= 1;
        }

        const productImages = [...prod.images];
        if (gender === 'gents') {
          productImages.push("images/Gents/gents_size_chart.png");
        } else if (gender === 'ladies') {
          productImages.push("images/Ladies/ladies_size_chart.jpg");
        }

        catalog[gender].products[catId].push({
          id: `p-${prod.idSeed}`,
          name: name,
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
