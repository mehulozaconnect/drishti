// Trusted publishers and the feeds Drishti reads for each section.
// Only items from TRUSTED domains are ever shown.

export const TRUSTED = {
  'timesofindia.indiatimes.com': 'Times of India',
  'hindustantimes.com': 'Hindustan Times',
  'indianexpress.com': 'Indian Express',
  'thehindu.com': 'The Hindu',
  'mid-day.com': 'Mid-day',
  'ndtv.com': 'NDTV',
  'indiatoday.in': 'India Today',
  'freepressjournal.in': 'Free Press Journal',
  'mumbailive.com': 'Mumbai Live',
  'deccanherald.com': 'Deccan Herald',
  'thequint.com': 'The Quint',
  'scroll.in': 'Scroll',
  'news18.com': 'News18',
  'ptinews.com': 'PTI',
  'aninews.in': 'ANI',
  'pib.gov.in': 'PIB (Govt of India)',
  'livemint.com': 'Mint',
  'economictimes.indiatimes.com': 'Economic Times',
  'moneycontrol.com': 'Moneycontrol',
  'business-standard.com': 'Business Standard',
  'financialexpress.com': 'Financial Express',
  'businesstoday.in': 'Business Today',
  'valueresearchonline.com': 'Value Research',
  'cnbctv18.com': 'CNBC-TV18',
  'reuters.com': 'Reuters',
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'apnews.com': 'AP',
  'aljazeera.com': 'Al Jazeera',
  'theguardian.com': 'The Guardian',
  'cnn.com': 'CNN',
  'nytimes.com': 'New York Times',
  'washingtonpost.com': 'Washington Post',
  'dw.com': 'DW',
  'france24.com': 'France 24',
  'timesofisrael.com': 'Times of Israel',
  'bloomberg.com': 'Bloomberg',
  'cnbc.com': 'CNBC',
  'gadgets360.com': 'Gadgets 360',
  'gadgets.ndtv.com': 'Gadgets 360',
  '91mobiles.com': '91mobiles',
  'gsmarena.com': 'GSMArena',
  'theverge.com': 'The Verge',
  'engadget.com': 'Engadget',
  'techcrunch.com': 'TechCrunch',
  'digit.in': 'Digit',
  'beebom.com': 'Beebom',
  'smartprix.com': 'Smartprix',
  'androidauthority.com': 'Android Authority',
  'bollywoodhungama.com': 'Bollywood Hungama',
  'filmfare.com': 'Filmfare',
  'pinkvilla.com': 'Pinkvilla',
  'koimoi.com': 'Koimoi',
  'filmcompanion.in': 'Film Companion',
  'who.int': 'WHO',
  'icmr.gov.in': 'ICMR',
  'mohfw.gov.in': 'Health Ministry',
  'speakingtree.in': 'Speaking Tree',
  'boomlive.in': 'BOOM',
  'altnews.in': 'Alt News',
  'factly.in': 'Factly',
  'vishvasnews.com': 'Vishvas News',
  'youtube.com': 'YouTube'
};

const g = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:2d')}&hl=en-IN&gl=IN&ceid=IN:en`;

export const SECTIONS = [
  {
    id: 'mumbai', name: 'Mumbai and Malad', short: 'Mumbai', color: '#0F3B3C', tint: '#7EE0C8', icon: 'city', weight: 1.2,
    local: ['malad', 'marve', 'orlem', 'kandivali', 'goregaon', 'borivali', 'andheri', 'western line', 'western railway', 'link road', 'mindspace', 'aksa', 'madh island', 'manori'],
    feeds: [
      'https://timesofindia.indiatimes.com/rssfeeds/-2128838597.cms',
      'https://www.hindustantimes.com/feeds/rss/cities/mumbai-news/rssfeed.xml',
      'https://indianexpress.com/section/cities/mumbai/feed/',
      'https://www.thehindu.com/news/cities/mumbai/feeder/default.rss',
      'https://www.freepressjournal.in/stories.rss?section=mumbai',
      g('Malad Mumbai'),
      g('Kandivali OR Goregaon OR Borivali Mumbai'),
      g('Mumbai local train Western Railway'),
      g('Mumbai BMC')
    ]
  },
  {
    id: 'india', name: 'India', short: 'India', color: '#3A2A12', tint: '#FFC48A', icon: 'flag', weight: 1.1,
    feeds: [
      'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
      'https://www.thehindu.com/news/national/feeder/default.rss',
      'https://indianexpress.com/section/india/feed/',
      'https://feeds.feedburner.com/ndtvnews-top-stories',
      'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
      g('India news')
    ]
  },
  {
    id: 'world', name: 'World', short: 'World', color: '#12203D', tint: '#9DB8F5', icon: 'globe', weight: 1.1,
    feeds: [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://www.thehindu.com/news/international/feeder/default.rss',
      'https://indianexpress.com/section/world/feed/',
      g('Iran Israel'),
      g('United States Trump'),
      g('site:reuters.com world'),
      g('site:apnews.com world')
    ]
  },
  {
    id: 'markets', name: 'Markets and economy', short: 'Markets', color: '#221A3F', tint: '#C7BAFF', icon: 'chart', weight: 1.15,
    feeds: [
      'https://www.livemint.com/rss/markets',
      'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
      'https://www.moneycontrol.com/rss/marketreports.xml',
      'https://www.moneycontrol.com/rss/latestnews.xml',
      'https://www.business-standard.com/rss/markets-106.rss',
      g('Sensex Nifty'),
      g('RBI repo rate OR inflation India')
    ]
  },
  {
    id: 'money', name: 'SIP and mutual funds', short: 'SIP and MF', color: '#2A1F4F', tint: '#D2C7FF', icon: 'coins', weight: 0.9,
    feeds: [
      'https://www.livemint.com/rss/money',
      'https://economictimes.indiatimes.com/mf/rssfeeds/359241701.cms',
      'https://www.moneycontrol.com/rss/mfnews.xml',
      g('mutual fund SIP'),
      g('personal finance tax saving India')
    ]
  },
  {
    id: 'gold', name: 'Gold, silver and prices', short: 'Gold', color: '#3D2E0C', tint: '#FFD66B', icon: 'gem', weight: 0.9,
    feeds: [
      g('gold price India'),
      g('silver price India'),
      g('petrol diesel price OR crude oil price India')
    ]
  },
  {
    id: 'bollywood', name: 'Bollywood', short: 'Bollywood', color: '#4A1530', tint: '#FF9CC6', icon: 'star', weight: 0.85,
    feeds: [
      'https://www.hindustantimes.com/feeds/rss/entertainment/bollywood/rssfeed.xml',
      'https://indianexpress.com/section/entertainment/bollywood/feed/',
      'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',
      g('Bollywood')
    ]
  },
  {
    id: 'movies', name: 'Movies and reviews', short: 'Movies', color: '#2A1F4F', tint: '#C7BAFF', icon: 'film', weight: 0.8,
    feeds: [
      'https://indianexpress.com/section/entertainment/movie-review/feed/',
      g('movie review Bollywood'),
      g('box office collection'),
      g('new release this Friday OR OTT release this week')
    ]
  },
  {
    id: 'viral', name: 'Viral and trending', short: 'Viral', color: '#4A1717', tint: '#FF9B9B', icon: 'play', weight: 0.75,
    feeds: [
      g('viral video'),
      g('trending on social media India')
    ]
  },
  {
    id: 'phones', name: 'Phones and offers', short: 'Phones', color: '#1C2A33', tint: '#8FD3F5', icon: 'phone', weight: 0.85,
    feeds: [
      'https://www.91mobiles.com/hub/feed/',
      'https://www.gsmarena.com/rss-news-reviews.php3',
      'https://feeds.feedburner.com/gadgets360-latest',
      g('smartphone launch India price'),
      g('phone review India'),
      g('smartphone offer Amazon OR Flipkart sale discount')
    ]
  },
  {
    id: 'gadgets', name: 'Gadgets and tech', short: 'Gadgets', color: '#16262B', tint: '#7FE3E0', icon: 'chip', weight: 0.75,
    feeds: [
      'https://www.theverge.com/rss/index.xml',
      'https://www.engadget.com/rss.xml',
      'https://indianexpress.com/section/technology/feed/',
      'https://www.livemint.com/rss/technology',
      g('new gadget launch'),
      g('AI tools OR ChatGPT OR Gemini new feature')
    ]
  },
  {
    id: 'health', name: 'Health', short: 'Health', color: '#143A26', tint: '#7BF0B4', icon: 'pulse', weight: 0.95,
    feeds: [
      'https://www.who.int/rss-feeds/news-english.xml',
      'https://feeds.bbci.co.uk/news/health/rss.xml',
      'https://www.thehindu.com/sci-tech/health/feeder/default.rss',
      'https://indianexpress.com/section/lifestyle/health/feed/',
      g('Mumbai health OR dengue OR malaria OR hospital'),
      g('health study India'),
      g('ICMR OR health ministry advisory')
    ]
  },
  {
    id: 'spiritual', name: 'Spiritual', short: 'Spiritual', color: '#3D2410', tint: '#FFC48A', icon: 'lotus', weight: 0.6,
    feeds: [
      g('spiritual India'),
      g('temple OR festival OR puja Mumbai'),
      g('Siddhivinayak OR Mahalaxmi OR ISKCON Mumbai')
    ]
  }
];

export const FACTCHECK_FEEDS = [
  'https://www.boomlive.in/fact-check/feed',
  'https://www.altnews.in/feed/',
  'https://factly.in/feed/',
  g('PIB Fact Check fake'),
  g('fact check fake viral claim India')
];
