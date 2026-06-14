/**
 * Felles produktdatabase for alle bøker og artikkelkokoelmat.
 * Bruk denne som kilde for priser, lenker og metadata på myynissa- og kirjat-sidene.
 */

export interface BookProduct {
  id: string;
  title: string;
  description: string;
  year: number;
  isbn?: string;
  pages?: string;
  publisher?: string;
  image?: string;           // lokal bildesti, f.eks. /images/xxx/yyy.jpg
  price?: number;           // fysisk bok (€)
  shippingPrice?: number;   // porto (€)
  availability: 'available' | 'ask' | 'soldout' | 'external' | 'ebook-only';
  orderUrl?: string;        // Google Forms o.l.
  articleUrl?: string;      // intern /artikkelit/[slug] om boken
  ebook?: {
    price?: number;
    url: string;
    label?: string;
  };
  externalUrl?: string;     // for bøker solgt andre steder
  note?: string;            // f.eks. "Myynnissä Virtain kirjakaupassa"
}

export interface ArticleCollection {
  id: string;
  title: string;
  description: string;
  pricePerArticle: number;
  priceAll: number;
  articleCount: number;
  orderUrl: string;
  articleUrl?: string;      // intern side om serien
  articles: string[];
}

// ─── KIRJAT ──────────────────────────────────────────────────────────────────

export const books: BookProduct[] = [
  {
    id: 'suomalainen-ratsuvaki',
    title: 'Suomalainen ratsuväki Ruotsin ajalla',
    description: 'Ensimmäinen kokonaisteos suomalaisesta ratsuväestä n. 1550–1809. Kirja painottuu suuren Saksan sodan vuosiin ja muihin 1600-luvun sotiin. 790 sivua faktaa, nimiä, paikkoja ja tilastoja.',
    year: 2016,
    isbn: '978-952-99106-9-4',
    pages: '790',
    publisher: 'T:mi Toiset Aijat, Porvoo',
    image: '/images/suomalainen-ratsuvaki-ruotsin-ajalla/eurooppa-ja-suomalainen-rv.png',
    price: 49,
    shippingPrice: 15,
    availability: 'available',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
    articleUrl: undefined,
  },
  {
    id: 'suuri-pohjansota',
    title: 'Suuri Pohjansota, Iso Viha ja suomalaiset',
    description: 'Pohjan sota oli Suomen historian merkittävin murroskausi. Kirja kertoo pitkän sodan vaiheista suomalaisten silmin — sekä sotilaiden että siviilien kokemuksista.',
    year: 2001,
    isbn: '952-91-3934-9',
    pages: '464',
    publisher: 'T:mi Toiset Aijat, Jyväskylä',
    image: '/images/suuri-pohjansota-iso-viha-ja-suomalaiset/suuri-pohjansota-02.jpg',
    price: undefined,
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
    articleUrl: '/artikkelit/ison-vihan-aika-suomessa',
  },
  {
    id: 'ruoveden-komppania',
    title: 'Ruoveden komppanian miehet Suomen sodassa',
    description: 'Tutkimus Ruoveden komppanian sotilaista Suomen sodassa 1808–1809. Sisältää yksityiskohtaiset tiedot miehistöstä ja heidän kohtaloistaan.',
    year: 2011,
    isbn: '978-952-99106-8-7',
    publisher: 'T:mi Toiset Aijat, Jyväskylä',
    image: '/images/ruoveden-komppanian-miehet-suomen/ruoveden-komppanian-mieheet.jpg',
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
  },
  {
    id: 'karjalainen-karilainen',
    title: 'Karjalainen Karilainen – Nimi ja suku historian myrskyissä',
    description: 'Karilainen-suvun historia karjalaisista juuristaan eri puolille Suomea. Nimitutkimusta ja sukututkimusta yhdistettynä.',
    year: 2006,
    isbn: '952-99106-6-5',
    pages: '238',
    publisher: 'T:mi Toiset Aijat, Virrat',
    image: '/images/karjalainen-karilainen/kirja_karilainen.jpg',
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
  },
  {
    id: 'ruoveden-karajat-1722',
    title: 'Ruoveden ja Keuruun käräjäpöytäkirjoista 1722–1746',
    description: 'Hakemisto ja tiivistelmiä Ruoveden ja Keuruun käräjäpöytäkirjoista vuosilta 1722–1746. Arvokas lähdeteos sukututkijoille.',
    year: 2008,
    isbn: '978-952-99106-7-0',
    pages: '254',
    publisher: 'T:mi Toiset Aijat, Jyväskylä',
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
  },
  {
    id: 'suur-ruoveden-rippikirjat',
    title: 'Suur-Ruoveden vanhimmat rippikirjat',
    description: 'Kuru, Ruovesi, Virrat, Ähtäri. Vanhimmat rippikirjat painoasussa — keskeinen lähde alueen sukututkimukseen.',
    year: 1983,
    isbn: '951-99502-5-7',
    pages: '220',
    publisher: 'Virrat',
    image: '/images/suur-ruoveden-vanhimmat-rippikirjat/suur-ruoveden.jpg',
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
  },
  {
    id: 'toiset-aijat-ii',
    title: 'Toiset Aijat II',
    description: 'Tutkimusta ja kuvausta Virtain asukkaista ja elämästä. Toinen osa omakustannesarjasta, josta koko sivuston nimi on peräisin.',
    year: 1985,
    isbn: '951-99640-8-8',
    publisher: 'Turku',
    image: '/images/toiset-aijat-ii/toiset-aijat-ii-01.jpg',
    availability: 'ask',
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfE3Ul7OCPpFcOVdrM7xYU3SUsgKX5OWBsDZIsYodZdpIO2Vg/viewform',
  },
  {
    id: 'kimaltelevilta-vesilta',
    title: 'Kimaltelevilta vesiltä – Virrat kuvin ja sanoin 1867–2018',
    description: 'Virtain historia kuvien ja sanojen kautta. Yhteistyössä Lea Lerkkasen kanssa. Saatavana Virtain kirjakaupassa.',
    year: 2018,
    isbn: '978-952-69101-0-9',
    pages: '338',
    publisher: 'Virtain Kaupunki, Seinäjoki',
    image: '/images/kimaltelevilta-vesilta-virrat-kuvin-ja/virrat_kansi2.jpg',
    availability: 'external',
    note: 'Myynnissä Virtain kirjakaupassa',
    articleUrl: '/artikkelit/virrat-150-vuotta-1867-2017-kuvin-ja-sanoin',
  },
];

// E-kirjat Google Play -kaupasta
export const ebooks: BookProduct[] = [
  {
    id: 'karjalan-ratsurykmentti-matrikkeli',
    title: 'Karjalan Ratsurykmentti – Matrikkeli 1700–1737',
    description: 'Karjalan ratsurykmentin matrikkeli vuosilta 1700–1737. Saatavana ainoastaan e-kirjana.',
    year: 2020,
    availability: 'ebook-only',
    image: '/images/karjalan-ratsurykmentti-1643-1809/karjalan-ratsurykmentti.png',
    ebook: {
      url: 'https://play.google.com/store/books/details/Matti_J_Kankaanp%C3%A4%C3%A4_Karjalan_Ratsurykmentti_Matrikk?id=fx4REAAAQBAJ',
      label: 'Google Play',
    },
  },
  {
    id: 'ruoveden-karajat-1683',
    title: 'Ruoveden ja Keuruun käräjäpöytäkirjoista 1683–1711',
    description: 'Hakemisto ja tiivistelmiä käräjäpöytäkirjoista. Saatavana myös e-kirjana.',
    year: 2005,
    isbn: '952-99106-5-7',
    pages: '280',
    availability: 'ebook-only',
    ebook: {
      url: 'https://play.google.com/store/books/details?id=H4mvDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play',
    },
  },
  {
    id: 'tyrvaan-rippikirjat',
    title: 'Tyrvään vanhimmat rippikirjat 1693–1722',
    description: 'Tyrvään seurakunnan vanhimmat rippikirjat painoasussa. Tärkeä lähde Satakunnan sukututkimukseen.',
    year: 2004,
    isbn: '952-99106-4-9',
    pages: '229',
    availability: 'ebook-only',
    image: '/images/tyrvaan-vanhimmat-rippikirjat-1693-1722/tyrvaan-vanhimmat-rippikirjat-1693-17221024_3.jpg',
    ebook: {
      price: 20,
      url: 'https://play.google.com/store/books/details?id=8I6vDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play',
    },
  },
  {
    id: 'porin-laanin-rykmentti',
    title: 'Porin läänin jalkaväkirykmentin pääkatselmusrulla 1728',
    description: 'Pääkatselmusrulla vuodelta 1728. Keskeinen lähde Porin läänin sotilassukututkimukseen.',
    year: 2003,
    isbn: '952-99106-3-0',
    pages: '198',
    availability: 'ebook-only',
    image: '/images/porin-laanin-jalkavakirykmentin/porin-laanin-jalkavakirykmentti.jpg',
    ebook: {
      url: 'https://play.google.com/store/books/details?id=QfemDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play',
    },
  },
  {
    id: 'viipurin-henkikirja',
    title: 'Viipurin ja Savonlinnan läänin henkikirja 1701',
    description: 'Osa I: Rannan, Lappeen, Jääsken ja Äyräpään kihlakunnat. Osa II: Savon kolme kihlakuntaa ja Viipurin kaupunki.',
    year: 2003,
    isbn: '952-991-06-1-4 / 952-99106-2-2',
    pages: '160 + 140',
    availability: 'ebook-only',
    image: '/images/viipurin-ja-savonlinnan-laanien/viipurin-ja-savonlinnan-kansi.png',
    ebook: {
      url: 'https://play.google.com/store/books/details?id=R_RRDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play (Osa I)',
    },
  },
  {
    id: 'toiset-aijat-i',
    title: 'Toiset Aijat I',
    description: 'Tutkimusta ja kuvausta Virtain asukkaista ja elämästä. Ensimmäinen osa omakustannesarjasta.',
    year: 1978,
    isbn: '951-99177-0-5',
    availability: 'ebook-only',
    image: '/images/toiset-aijat-i/toisetaijat_page_1.jpg',
    ebook: {
      url: 'https://play.google.com/store/books/details?id=O2nVDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play',
    },
  },
  {
    id: 'lundin-taistelu',
    title: 'Lundin Taistelu 1676 ja suomalainen ratsuväki',
    description: 'Artikkeli ja kirjailijan muistinpanot Lundin taistelusta 1676.',
    year: 2016,
    availability: 'ebook-only',
    ebook: {
      url: 'https://play.google.com/store/books/details?id=Q7zjDwAAQBAJ&PAffiliateID=1011l9KyN',
      label: 'Google Play',
    },
  },
];

// ─── ARTIKKELIKOKOELMAT ───────────────────────────────────────────────────────

export const articleCollections: ArticleCollection[] = [
  {
    id: 'uudenmaan-ratsurykmentti',
    title: 'Uudenmaan Ratsurykmentti 1641–1809',
    description: 'Katselmusrullat ja luettelot Uudenmaan ratsurykmentin miehistöstä. PDF-artikkelit sähköpostitse.',
    pricePerArticle: 4,
    priceAll: 80,
    articleCount: 27,
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdafbB5W_AJYPs7i2woFzE_j-FFdsqrrtSy1w29JlyTknvdJw/viewform',
    articleUrl: '/artikkelit/dna-ja-sukututkimus', // placeholder - update if dedicated article exists
    articles: [
      '1641','1642','1643','1647','1649','1654','1655',
      '1655–1656 luettelovertailu','1659','1698','1700','1706',
      '1712','1720','1728','1729','1743','1762','1767','1779',
      '1787','1789','1790','1795','1800','1806','1809',
    ],
  },
  {
    id: 'viipurin-laanintilit',
    title: 'Viipurin läänintilit 1635–1724',
    description: 'Transkriptiot Viipurin läänintilinpäätöksistä. PDF-artikkelit sähköpostitse.',
    pricePerArticle: 4,
    priceAll: 70,
    articleCount: 23,
    orderUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSe9Wy0K3ahk9ws3qrlb3rX5ZZ1UyEhyjF-nex9tFbbXe7KrFQ/viewform',
    articleUrl: '/artikkelit/dna-ja-sukututkimus', // placeholder
    articles: [
      '1635','1639','1655–1666','1665','1670','1673','1682',
      '1683','1697','1699','1700','1701','1702','1703','1705',
      '1706','1707','1708','1709','1710','1711','1712','1724',
    ],
  },
  {
    id: 'karjalan-ratsurykmentti-artikkelit',
    title: 'Karjalan ratsurykmentti 1643–1809',
    description: 'Pääkatselmusrullat Karjalan ratsurykmentin miehistöstä. PDF-artikkelit sähköpostitse.',
    pricePerArticle: 4,
    priceAll: 60,
    articleCount: 15,
    orderUrl: 'https://www.toisetaijat.fi/2020/12/karjalan-ratsurykmentti-1643-1809.html',
    articles: [
      '1643','1645','1647','1649','1651','1654','1655',
      '1659','1662','1665','1672','1676','1689','1700','1809',
    ],
  },
];
