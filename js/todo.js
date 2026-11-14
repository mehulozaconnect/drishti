// Mumbai ideas, written for Drishti. Costs are rough guides per person; timings and fees change, so check before you go.
// who: solo, family, kids, couple · cost: 0 free, 1 under ₹300, 2 ₹300–1,000, 3 above ₹1,000
// when: morning, day, evening, any · indoor: good when it rains · weekend: best kept for a weekend (longer trip)
export const PLACES = [
  { n: 'Sanjay Gandhi National Park and Kanheri Caves', a: 'Borivali East', who: ['family', 'kids', 'solo'], cost: 1, when: 'morning', d: 'Forest trails, cycling and the 2,000-year-old Buddhist caves inside the city. Go early before it gets hot. The park is usually shut on Mondays.', near: true },
  { n: 'Global Vipassana Pagoda', a: 'Gorai', who: ['family', 'solo', 'couple'], cost: 0, when: 'day', indoor: true, d: 'A huge golden dome with a calm meditation hall. A short 10-minute guided meditation is often available for visitors. Free entry.', near: true },
  { n: 'Aksa and Madh Island beaches', a: 'Malad West', who: ['couple', 'family', 'solo'], cost: 0, when: 'evening', d: 'Quieter than Juhu and right next to home. Best for a sunset walk; avoid swimming as currents can be strong.', near: true },
  { n: 'Movie or arcade at Infiniti or Inorbit Mall', a: 'Malad West', who: ['family', 'kids', 'couple'], cost: 2, when: 'any', indoor: true, d: 'Easy rainy-day plan close to home: a film, the game zone, and dinner in the food court.', near: true },
  { n: 'EsselWorld and Water Kingdom', a: 'Gorai', who: ['family', 'kids'], cost: 3, when: 'day', weekend: true, d: 'Rides and a water park for a full day out. Book online for better prices and carry a change of clothes.', near: true },
  { n: 'Film City studio tour', a: 'Goregaon East', who: ['family', 'kids'], cost: 3, when: 'day', d: 'Guided tour of film and TV sets with shows along the way. Book a slot in advance.', near: true },
  { n: 'Lokhandwala Market shopping', a: 'Andheri West', who: ['couple', 'family', 'solo'], cost: 1, when: 'evening', d: 'Street shopping for clothes, shoes and accessories, plus plenty of cafés. Bargaining expected.' },
  { n: 'Prithvi Theatre play', a: 'Juhu', who: ['couple', 'solo'], cost: 2, when: 'evening', indoor: true, d: 'Intimate theatre with Hindi, English and Marathi plays most evenings. The Prithvi Café outside is a classic.' },
  { n: 'Juhu Beach and street food', a: 'Juhu', who: ['family', 'kids', 'couple'], cost: 1, when: 'evening', d: 'Pav bhaji, gola and bhel by the sea. Weekday evenings are less crowded.' },
  { n: 'Bandra Bandstand and Carter Road promenade', a: 'Bandra West', who: ['couple', 'solo', 'family'], cost: 0, when: 'evening', d: 'Sea-facing walk past Bandra Fort, with lots of cafés on Carter Road for dinner after.' },
  { n: 'Mount Mary Basilica and Bandra Fort', a: 'Bandra West', who: ['family', 'solo', 'couple'], cost: 0, when: 'day', d: 'Hilltop church with city views, and the old fort ruins with sea views close by.' },
  { n: 'Powai Lake promenade', a: 'Powai', who: ['couple', 'family', 'solo'], cost: 0, when: 'evening', d: 'Lakeside walk, then food at Hiranandani Gardens.' },
  { n: 'Nehru Science Centre', a: 'Worli', who: ['kids', 'family'], cost: 1, when: 'day', indoor: true, d: 'Hands-on science galleries and outdoor science park. Kids can easily spend half a day.' },
  { n: 'Nehru Planetarium', a: 'Worli', who: ['kids', 'family'], cost: 1, when: 'day', indoor: true, d: 'Sky shows in the dome theatre in Hindi, English and Marathi. Check show timings before you go.' },
  { n: 'Byculla Zoo (Rani Baug)', a: 'Byculla', who: ['kids', 'family'], cost: 1, when: 'morning', d: 'Botanical garden and zoo, with the Humboldt penguin enclosure the big draw. Check the weekly closing day before you go.' },
  { n: 'CSMVS Museum and Kala Ghoda galleries', a: 'Fort', who: ['solo', 'couple', 'family'], cost: 1, when: 'day', indoor: true, d: 'India’s art and history museum, then Jehangir Art Gallery (free) and the Kala Ghoda lanes.' },
  { n: 'Gateway of India and Colaba Causeway', a: 'Colaba', who: ['family', 'couple', 'solo'], cost: 0, when: 'evening', d: 'Classic Mumbai: the Gateway, Taj views, and street shopping on Colaba Causeway.' },
  { n: 'Elephanta Caves by ferry', a: 'From Gateway of India', who: ['family', 'solo', 'couple'], cost: 2, when: 'morning', weekend: true, d: 'Hour-long ferry ride to rock-cut temple caves on an island. Leave early, wear good shoes. The caves are usually closed on Mondays.' },
  { n: 'Marine Drive sunset', a: 'Churchgate', who: ['couple', 'solo', 'family'], cost: 0, when: 'evening', d: 'Sit on the sea wall for sunset, then the ‘Queen’s Necklace’ lights. Free.' },
  { n: 'Banganga Tank heritage walk', a: 'Walkeshwar', who: ['solo', 'couple'], cost: 0, when: 'morning', d: 'Ancient water tank surrounded by temples, a quiet corner of old Bombay.' },
  { n: 'Siddhivinayak, Mahalaxmi and Haji Ali', a: 'Prabhadevi to Mahalaxmi', who: ['family', 'solo'], cost: 0, when: 'morning', d: 'Three of the city’s best-known shrines close to each other. Weekday mornings are calmer.' },
  { n: 'NCPA concert or show', a: 'Nariman Point', who: ['couple', 'solo'], cost: 3, when: 'evening', indoor: true, d: 'Western classical, Indian music, dance and theatre at the city’s top performing arts centre.' },
  { n: 'Stand-up comedy show', a: 'Andheri, Bandra, Khar', who: ['couple', 'solo'], cost: 2, when: 'evening', indoor: true, d: 'Open mics and ticketed shows most nights; check BookMyShow or District for line-ups.' },
  { n: 'KidZania', a: 'R City Mall, Ghatkopar', who: ['kids'], cost: 3, when: 'day', indoor: true, d: 'Kids try out jobs like pilot, doctor and chef in a mini city. Plan 4 to 5 hours and book ahead.' },
  { n: 'Chor Bazaar and Crawford Market', a: 'Grant Road', who: ['solo', 'couple'], cost: 1, when: 'day', d: 'Antiques, vintage finds and the old market. Go before the afternoon heat; keep valuables close.' },
  { n: 'Yeoor Hills nature walk', a: 'Thane', who: ['solo', 'family'], cost: 1, when: 'morning', d: 'Green hill trails at the edge of the national park, popular for morning walks and birding.' },
  { n: 'Alibaug day trip by ferry', a: 'From Gateway of India', who: ['family', 'couple'], cost: 2, when: 'day', weekend: true, d: 'Ferry plus a short bus ride to beaches, forts and seafood. Start early to make a full day of it.' },
  { n: 'Matheran day trip', a: 'Near Karjat', who: ['family', 'couple', 'solo'], cost: 2, when: 'day', weekend: true, d: 'Car-free hill station with viewpoints and horse rides. Early local train to Neral, then the shuttle.' },
  { n: 'Board-game café evening', a: 'Andheri, Bandra', who: ['couple', 'solo', 'family'], cost: 2, when: 'evening', indoor: true, d: 'Hundreds of games to borrow over coffee and snacks; good for a rainy evening.' },
  { n: 'Gorai and Manori beach by ferry', a: 'From Marve jetty, Malad', who: ['family', 'couple'], cost: 1, when: 'day', d: 'A short ferry from Marve to quieter beaches and village lanes, close to home.', near: true }
];
export const COST = ['Free', '₹', '₹₹', '₹₹₹'];
export const COST_HINT = ['Free', 'under ₹300', '₹300–1,000', 'above ₹1,000'];
