const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const restaurantId = 'eAYG5wfsfwlGOnj54x7j-0Rj';
  console.log(`Seeding analytics for restaurant ID: ${restaurantId}`);

  // 1. Get menus
  const { data: menus } = await supabase
    .from('Menu')
    .select('id')
    .eq('restaurantId', restaurantId);
  
  if (!menus || menus.length === 0) {
    console.error('No menus found for showcase restaurant!');
    process.exit(1);
  }

  // 2. Get categories
  const { data: categories } = await supabase
    .from('Category')
    .select('id')
    .in('menuId', menus.map(m => m.id));

  if (!categories || categories.length === 0) {
    console.error('No categories found for showcase restaurant!');
    process.exit(1);
  }

  // 3. Get menu items
  const { data: items } = await supabase
    .from('MenuItem')
    .select('id, name')
    .in('categoryId', categories.map(c => c.id));

  if (!items || items.length === 0) {
    console.error('No menu items found for showcase restaurant!');
    process.exit(1);
  }

  console.log(`Found ${items.length} items. Seeding views and clicks...`);

  const analyticsLogs = [];

  // Generate logs for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Page views (between 15 and 45 per day)
    const dailyViews = Math.floor(Math.random() * 30) + 15;
    for (let pv = 0; pv < dailyViews; pv++) {
      // stagger time throughout the day
      const logDate = new Date(date);
      logDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      analyticsLogs.push({
        id: nanoid(24),
        restaurantId,
        type: 'page_view',
        menuItemId: null,
        createdAt: logDate.toISOString()
      });
    }

    // Item clicks (between 8 and 25 per day)
    const dailyClicks = Math.floor(Math.random() * 18) + 8;
    for (let ic = 0; ic < dailyClicks; ic++) {
      const logDate = new Date(date);
      logDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      // select item to click with skewed probability for favorites
      let chosenItem = items[0];
      const rand = Math.random();
      if (rand < 0.3 && items.length > 2) {
        chosenItem = items[2]; // Truffle Tagliatelle
      } else if (rand < 0.55 && items.length > 3) {
        chosenItem = items[3]; // Bistecca
      } else if (rand < 0.75 && items.length > 4) {
        chosenItem = items[4]; // Tiramisu
      } else {
        chosenItem = items[Math.floor(Math.random() * items.length)];
      }

      analyticsLogs.push({
        id: nanoid(24),
        restaurantId,
        type: 'item_click',
        menuItemId: chosenItem.id,
        createdAt: logDate.toISOString()
      });
    }
  }

  console.log(`Inserting ${analyticsLogs.length} analytics logs into database...`);
  
  // Insert in batches of 50 to avoid payload limit
  const batchSize = 50;
  for (let start = 0; start < analyticsLogs.length; start += batchSize) {
    const batch = analyticsLogs.slice(start, start + batchSize);
    const { error } = await supabase
      .from('MenuAnalytics')
      .insert(batch);
    if (error) {
      console.error('Batch insert error:', error);
    }
  }

  // Also seed a couple of reviews for the showcase restaurant items so the feedback page is pre-populated!
  console.log('Seeding feedback/reviews for showcase items...');
  const feedbacks = [
    {
      id: nanoid(24),
      menuItemId: items.find(i => i.name.includes('Tagliatelle'))?.id || items[0].id,
      rating: 5,
      comment: 'Absolutely amazing Truffle Tagliatelle! The pasta is fresh and the truffle cream is rich and savory. A must try!',
      reviewerName: 'Marcus Aurelius',
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() // 36h ago
    },
    {
      id: nanoid(24),
      menuItemId: items.find(i => i.name.includes('Fiorentina'))?.id || items[0].id,
      rating: 5,
      comment: 'Bistecca was cooked to a perfect medium rare. Tender and delicious.',
      reviewerName: 'Sophia Loren',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24h ago
    },
    {
      id: nanoid(24),
      menuItemId: items.find(i => i.name.includes('Tiramisu'))?.id || items[0].id,
      rating: 4,
      comment: 'Very tasty tiramisu, could use slightly more espresso flavor but texture was incredible.',
      reviewerName: 'Leonardo D.',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4h ago
    }
  ];

  const { error: fbError } = await supabase
    .from('Feedback')
    .insert(feedbacks);

  if (fbError) {
    console.error('Feedback seeding error:', fbError);
  } else {
    console.log('Seeded 3 reviews successfully!');
  }

  console.log('Analytics and Feedback seeding finished!');
}

run();
