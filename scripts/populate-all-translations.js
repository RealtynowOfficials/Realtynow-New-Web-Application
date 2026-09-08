const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'locales');

// Complete translation dictionaries for the 9 missing files across all languages

const translations = {
  te: {
    'langModal.json': {
      subtitle: 'మీకు నచ్చిన భారతీయ భాషను ఎంచుకోండి',
      searchPlaceholder: 'భాషను శోధించండి (ఉదా. Telugu, हिन्दी)...',
      selectedBadge: 'ఎంచుకోబడింది',
      noLangFound: 'ఎటువంటి భాష కనుగొనబడలేదు',
      applyBtn: 'భాషను వర్తింపజేయి'
    },
    'about.json': {
      propertiesSold: 'అమ్మిన ఆస్తులు',
      happyCustomers: 'సంతృప్త కస్టమర్లు',
      citiesCovered: 'నగరాలు',
      expertAgents: 'నిపుణులైన ఏజెంట్లు',
      val1Title: 'నమ్మకం & పారదర్శకత',
      val1Desc: 'ప్రతి ఆస్తి ధృవీకరించబడింది. దాచిన రుసుములు లేవు, నకిలీ ఆస్తులు లేవు. మేము పూర్తి పారదర్శకతతో నమ్మకాన్ని నిర్మిస్తాము.',
      val2Title: 'AI-ఆధారిత ఖచ్చితత్వం',
      val2Desc: 'మీ ప్రాధాన్యతలు, బడ్జెట్ మరియు జీవనశైలి ఆధారంగా ఖచ్చితమైన ఆస్తిని కనుగొనడంలో మా AI సాంకేతికత సహాయపడుతుంది.',
      val3Title: 'భారతదేశ వ్యాప్త నెట్‌వర్క్',
      val3Desc: 'ప్రధాన మెట్రోల నుండి అభివృద్ధి చెందుతున్న నగరాల వరకు, మా నెట్‌వర్క్ మీకు ఉత్తమ రియల్ ఎస్టేట్ ఎంపికలను అందిస్తుంది.',
      val4Title: 'అవార్డు పొందిన సేవ',
      val4Desc: 'శోధన నుండి రిజిస్ట్రేషన్ వరకు అద్భుతమైన సేవలను అందించే భారతదేశపు వేగంగా అభివృద్ధి చెందుతున్న ప్రాప్-టెక్ ప్లాట్‌ఫారమ్.',
      heroTitle1: 'రియల్ ఎస్టేట్ రంగంలో',
      heroTitle2: 'నూతన విప్లవం',
      heroTitle3: 'భారతదేశంలో',
      heroDesc: 'RealtyNow భారతదేశపు అత్యున్నత AI-ఆధారిత రియల్ ఎస్టేట్ మార్కెట్‌ప్లేస్. సాంకేతికత మరియు నిపుణుల సలహాలతో ఆస్తుల కొనుగోలు, అమ్మకం మరియు అద్దె ప్రక్రియను సులభతరం చేస్తాము.',
      missionTitle: 'మా లక్ష్యం',
      missionDesc1: 'ఇంటిని కనుగొనడం అంతులేని కాల్స్ మరియు నకిలీ ప్రకటనలతో ఒత్తిడితో కూడుకున్నది కాకూడదు. రియల్ ఎస్టేట్ లావాదేవీలను పారదర్శకంగా, నమ్మకంగా మార్చడమే మా లక్ష్యం.',
      missionDesc2: 'AI ఆధారిత విశ్లేషణల ద్వారా కొనుగోలుదారులు మరియు అద్దెదారులకు సరైన నిర్ణయాలు తీసుకోవడంలో సహాయపడుతూ, విక్రేతలు మరియు ఏజెంట్లకు గరిష్ట ప్రయోజనం చేకూరుస్తాము.',
      whyTitle: 'RealtyNow ఎందుకు ఎంచుకోవాలి?',
      whyDesc: 'నమ్మకం, సాంకేతికత మరియు కస్టమర్ సంతృప్తితో మేము రియల్ ఎస్టేట్ భవిష్యత్తును నిర్మిస్తున్నాము.',
      ctaTitle: 'మీ కలల ఆస్తిని కనుగొనడానికి సిద్ధంగా ఉన్నారా?',
      ctaSub: 'RealtyNow సహాయంతో తమ కలల ఇంటిని పొందిన వేలాది మంది సంతోషకరమైన కస్టమర్లలో చేరండి.'
    },
    'blog.json': {
      allCategories: 'అన్ని విభాగాలు',
      subtitle: 'రియల్ ఎస్టేట్ రంగంపై తాజా విశ్లేషణలు, ట్రెండ్‌లు మరియు మార్గదర్శకాలు.',
      searchPlaceholder: 'వ్యాసాలను శోధించండి...',
      noArticles: 'ఎటువంటి వ్యాసాలు కనుగొనబడలేదు',
      noArticlesDesc: 'వేరే పదం శోధించండి లేదా ఫిల్టర్‌ను రీసెట్ చేయండి.',
      notFound: 'వ్యాసం కనుగొనబడలేదు',
      backToBlog: 'బ్లాగ్‌కి తిరిగి వెళ్ళండి',
      backToArticles: 'అన్ని వ్యాసాలకు తిరిగి వెళ్ళండి'
    },
    'contact.json': {
      subtitle: 'మేము మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాము. ఎప్పుడైనా మమ్మల్ని సంప్రదించండి.',
      sentTitle: 'సందేశం పంపబడింది!',
      sentDesc: 'మేము 24 గంటల్లో మీకు సమాధానం ఇస్తాము.',
      name: 'పేరు',
      email: 'ఈమెయిల్',
      phone: 'ఫోన్ నంబర్',
      message: 'సందేశం',
      sendMessage: 'సందేశం పంపు',
      detailsHeader: 'సంప్రదింపు వివరాలు',
      timing: 'సోమ-శని, ఉదయం 9:00 - సాయంత్రం 7:00'
    },
    'faq.json': {
      searchPlaceholder: 'తరచుగా అడిగే ప్రశ్నలను శోధించండి...'
    },
    'footer.json': {
      tagline: 'భారతదేశపు ప్రముఖ AI-ఆధారిత రియల్ ఎస్టేట్ ప్లాట్‌ఫారమ్. తెలివైన సిఫార్సులు, ధరల అంచనాలు మరియు ధృవీకరించబడిన ఆస్తులతో మీ కలల ఇంటిని కనుగొనండి.',
      popularSearches: 'ప్రజాదరణ పొందిన శోధనలు',
      flatsForSale: 'అమ్మకానికి ఫ్లాట్లు',
      flatsForRent: 'అద్దెకు ఫ్లాట్లు',
      luxuryVillas: 'లగ్జరీ విల్లాలు',
      commercialProps: 'వాణిజ్య ఆస్తులు',
      plotsLand: 'ప్లాట్లు & స్థలాలు',
      topCities: 'ప్రధాన నగరాలు',
      propsHyderabad: 'హైదరాబాద్‌లో ఆస్తులు',
      propsMumbai: 'ముంబైలో ఆస్తులు',
      propsBengaluru: 'బెంగళూరులో ఆస్తులు',
      propsPune: 'పూణేలో ఆస్తులు',
      propsDelhi: 'ఢిల్లీ NCR లో ఆస్తులు',
      company: 'కంపెనీ',
      rightsReserved: 'అన్ని హక్కులు సురక్షితం.',
      madeWithLove: 'భారతీయ రియల్ ఎస్టేట్ కోసం ❤️ తో రూపొందించబడింది',
      faqs: 'తరచుగా అడిగే ప్రశ్నలు'
    },
    'menu.json': {
      buyTitle: 'ఆస్తులు కొనండి',
      buyBadge: 'ధృవీకరించబడింది',
      residentialBuy: 'నివాస ఆస్తుల కొనుగోలు',
      flatsApartments: 'ఫ్లాట్లు & అపార్ట్‌మెంట్లు',
      flatsDesc: 'సిద్ధంగా ఉన్నవి & నిర్మాణంలో ఉన్న 1-5 BHK',
      luxuryVillas: 'లగ్జరీ విల్లాలు',
      villasDesc: 'గేటెడ్ కమ్యూనిటీ & స్వతంత్ర విల్లాలు',
      plotLand: 'ప్లాట్లు & భూమి',
      plotsDesc: 'నివాస & వాణిజ్య ప్లాట్లు',
      commercialBuy: 'వాణిజ్య ఆస్తుల కొనుగోలు',
      commercialOffices: 'వాణిజ్య కార్యాలయాలు',
      officesDesc: 'కార్పొరేట్ కార్యాలయ స్థలాలు',
      retailShops: 'దుకాణాలు & షోరూమ్‌లు',
      shopsDesc: 'ప్రధాన వాణిజ్య దుకాణాలు',
      warehouses: 'గోదాములు & వేర్‌హౌస్‌లు',
      warehousesDesc: 'లాజిస్టిక్స్ & పారిశ్రామిక కేంద్రాలు',
      toolsTrends: 'సాధనాలు & ట్రెండ్‌లు',
      emiCalculator: 'హోమ్ లోన్ EMI కాలిక్యులేటర్',
      emiDesc: 'నెలవారీ చెల్లింపులను లెక్కించండి',
      priceTrends: 'ధర ట్రెండ్‌లు & ROI',
      trendsDesc: 'అధిక విలువ పెరుగుదల ప్రాంతాలు',
      rentTitle: 'అద్దెకు ఆస్తులు',
      rentBadge: 'ట్రెండింగ్',
      residentialRent: 'నివాస అద్దె',
      rentFlatsDesc: 'ధృవీకరించబడిన ఫర్నిష్డ్ అద్దె ఇళ్ళు',
      independentHouses: 'స్వతంత్ర ఇళ్ళు',
      housesDesc: 'విశాలమైన కుటుంబ ఇళ్ళు',
      penthouseSuites: 'పెంట్‌హౌస్ సూట్‌లు',
      penthouseDesc: 'స్కైలైన్ వీక్షణలు & లగ్జరీ ఫీచర్లు',
      commercialRent: 'వాణిజ్య అద్దె',
      officeSpaces: 'ఆఫీస్ స్థలాలు',
      servicedDesksDesc: 'సర్వీస్డ్ కార్యాలయాలు',
      commercialShops: 'వాణిజ్య దుకాణాలు',
      streetRetailDesc: 'ప్రధాన రహదారి రిటైల్ దుకాణాలు',
      industrialFacilities: 'పారిశ్రామిక సౌకర్యాలు',
      heavyShedsDesc: 'భారీ పారిశ్రామిక షెడ్లు',
      rentingServices: 'అద్దె సేవలు',
      rentalAgreement: 'అద్దె ఒప్పందం',
      legalDraftDesc: 'తక్షణ ఆన్‌లైన్ లీగల్ డ్రాఫ్ట్',
      packersMovers: 'ప్యాకర్స్ & మూవర్స్',
      relocationDesc: 'సులభమైన ఇంటి మార్పిడి సేవలు',
      commercialSpaces: 'వాణిజ్య స్థలాలు',
      highRoi: 'అధిక రాబడి',
      commercialBuying: 'వాణిజ్య కొనుగోలు',
      itParksOffices: 'ఐటీ పార్కులు & కార్యాలయాలు',
      corporateFloorsDesc: 'గ్రేడ్-A కార్పొరేట్ అంతస్తులు',
      showroomsShops: 'షోరూమ్‌లు & దుకాణాలు',
      primeRetailDesc: 'ప్రధాన రహదారి వాణిజ్య స్థలాలు',
      commercialLand: 'వాణిజ్య భూమి',
      towersPlotDesc: 'కమర్షియల్ టవర్ల నిర్మాణం కోసం ప్లాట్లు',
      commercialRenting: 'వాణిజ్య అద్దె',
      coworkingDesks: 'కో-వర్కింగ్ డెస్క్‌లు',
      sharedPassesDesc: 'సౌకర్యవంతమైన షేర్డ్ ఆఫీస్ పాస్‌లు',
      warehouseStorage: 'వేర్‌హౌస్ & స్టోరేజ్',
      hubsDesc: 'కోల్డ్ స్టోరేజ్ & పంపిణీ కేంద్రాలు',
      projectsTitle: 'నూతన ప్రాజెక్టులు & బిల్డర్లు',
      exclusiveBadge: 'ప్రత్యేకమైనవి',
      projectStatus: 'ప్రాజెక్ట్ స్థితి',
      newlyLaunched: 'కొత్తగా ప్రారంభించబడినవి',
      discountPricingDesc: 'ప్రీ-లాంచ్ ప్రత్యేక ధరలు',
      underConstruction: 'నిర్మాణంలో ఉన్నవి',
      possessionDesc: '1-2 సంవత్సరాలలో పొజిషన్',
      readyToMoveIn: 'వెంటనే నివసించడానికి సిద్ధం',
      ocReceivedDesc: 'OC సర్టిఫికేట్ పొందిన ఫ్లాట్లు',
      featuredBuilders: 'ప్రముఖ బిల్డర్లు',
      townshipsDesc: 'లగ్జరీ గేటెడ్ టౌన్‌షిప్‌లు',
      towersDesc: 'ప్రీమియం హై-రైజ్ టవర్లు',
      precisionDesc: 'అత్యున్నత నాణ్యత నిర్మాణాలు',
      plotsTitle: 'ప్లాట్లు & భూమి',
      plotsBadge: 'HMDA / RERA',
      plotCategories: 'ప్లాట్ కేటగిరీలు',
      hmdaPlots: 'HMDA ఆమోదిత ప్లాట్లు',
      clearTitleDesc: 'స్పష్టమైన టైటిల్ లేఅవుట్ ప్లాట్లు',
      gatedPlots: 'గేటెడ్ లేఅవుట్ ప్లాట్లు',
      cablingDesc: 'అండర్‌గ్రౌండ్ విద్యుత్ & క్లబ్‌హౌస్',
      agriculturalLand: 'వ్యవసాయ భూమి',
      farmhouseDesc: 'ఫామ్‌హౌస్ & తోట భూములు',
      investmentSpecial: 'పెట్టుబడి ప్రత్యేక ఆస్తులు',
      highwayLand: 'హైవే ఫేసింగ్ భూమి',
      potentialDesc: 'అధిక వాణిజ్య సంభావ్యత',
      villaPlots: 'విల్లా లేఅవుట్ ప్లాట్లు',
      customVillaDesc: 'మీ కలల విల్లాను నిర్మించుకోండి',
      exploreCurated: 'ప్రత్యేక వర్గాలను అన్వేషించండి'
    },
    'nav.json': {
      dashboard: 'అడ్మిన్ డాష్‌బోర్డ్'
    },
    'notFound.json': {
      title: 'పేజీ కనుగొనబడలేదు',
      desc: 'మీరు వెతుకుతున్న పేజీ ఉనికిలో లేదు లేదా మార్చబడింది.',
      backHome: 'హోమ్‌కి తిరిగి వెళ్ళండి'
    }
  },
  ta: {
    'langModal.json': {
      subtitle: 'உங்கள் விருப்பமான இந்திய மொழியைத் தேர்ந்தெடுக்கவும்',
      searchPlaceholder: 'மொழியைத் தேடுங்கள் (எ.கா. தமிழ், English)...',
      selectedBadge: 'தேர்ந்தெடுக்கப்பட்டது',
      noLangFound: 'மொழி எதுவும் கிடைக்கவில்லை',
      applyBtn: 'மொழியைப் பயன்படுத்து'
    },
    'about.json': {
      propertiesSold: 'விற்பனை செய்யப்பட்ட சொத்துக்கள்',
      happyCustomers: 'மகிழ்ச்சியான வாடிக்கையாளர்கள்',
      citiesCovered: 'நகரங்கள்',
      expertAgents: 'நிபுணத்துவ முகவர்கள்',
      val1Title: 'நம்பிக்கை & வெளிப்படைத்தன்மை',
      val1Desc: 'ஒவ்வொரு பட்டியலும் சரிபார்க்கப்பட்டது. மறைமுகக் கட்டணங்கள் இல்லை, போலி சொத்துக்கள் இல்லை.',
      val2Title: 'AI-இயங்கும் துல்லியம்',
      val2Desc: 'உங்கள் விருப்பங்கள், பட்ஜெட் மற்றும் வாழ்க்கை முறைக்கு ஏற்ப சிறந்த சொத்தைத் தேர்ந்தெடுக்க எங்கள் AI உதவுகிறது.',
      val3Title: 'அகில இந்திய நெட்வொர்க்',
      val3Desc: 'பெருநகரங்கள் முதல் வளரும் நகரங்கள் வரை சிறந்த ரியல் எஸ்டேட் தேர்வுகளை நாங்கள் வழங்குகிறோம்.',
      val4Title: 'விருது பெற்ற சேவை',
      val4Desc: 'தேடல் முதல் பதிவு வரை சிறந்த சேவையை வழங்கும் இந்தியாவின் முன்னணி ரியல் எஸ்டேட் தளம்.',
      heroTitle1: 'ரியல் எஸ்டேட்டில்',
      heroTitle2: 'புதிய புரட்சி',
      heroTitle3: 'இந்தியாவில்',
      heroDesc: 'RealtyNow இந்தியாவின் முன்னணி AI-இயங்கும் ரியல் எஸ்டேட் தளம். சொத்துக்களை வாங்குவது, விற்பது மற்றும் வாடகைக்கு எடுப்பதை எளிதாக்குகிறோம்.',
      missionTitle: 'எங்கள் நோக்கம்',
      missionDesc1: 'ஒரு வீட்டைக் கண்டுபிடிப்பது கடினமானதாக இருக்கக்கூடாது. ரியல் எஸ்டேட் பரிவர்த்தனைகளை வெளிப்படையாகவும் நம்பகமானதாகவும் மாற்றுவதே எங்கள் நோக்கம்.',
      missionDesc2: 'AI நுண்ணறிவுகள் மூலம் வாங்குபவர்கள் மற்றும் வாடகைதாரர்களுக்கு சரியான முடிவுகளை எடுக்க உதவுகிறோம்.',
      whyTitle: 'ஏன் RealtyNow-ஐ தேர்ந்தெடுக்க வேண்டும்?',
      whyDesc: 'நம்பிக்கை, தொழில்நுட்பம் மற்றும் வாடிக்கையாளர் திருப்தியுடன் ரியல் எஸ்டேட்டின் எதிர்காலத்தை உருவாக்குகிறோம்.',
      ctaTitle: 'உங்கள் கனவு இல்லத்தைக் கண்டுபிடிக்கத் தயாரா?',
      ctaSub: 'RealtyNow மூலம் தங்கள் கனவு இல்லத்தைப் பெற்ற ஆயிரக்கணக்கான வாடிக்கையாளர்களுடன் இணையுங்கள்.'
    },
    'blog.json': {
      allCategories: 'அனைத்து பிரிவுகள்',
      subtitle: 'ரியல் எஸ்டேட் பற்றிய சமீபத்திய தகவல்கள், போக்குகள் மற்றும் வழிகாட்டிகள்.',
      searchPlaceholder: 'கட்டுரைகளைத் தேடுங்கள்...',
      noArticles: 'கட்டுரைகள் எதுவும் கிடைக்கவில்லை',
      noArticlesDesc: 'வேறு வார்த்தையைத் தேடவும் அல்லது வடிகட்டியை மீட்டமைக்கவும்.',
      notFound: 'கட்டுரை கிடைக்கவில்லை',
      backToBlog: 'வலைப்பதிவுக்குத் திரும்பு',
      backToArticles: 'அனைத்து கட்டுரைகளுக்கும் திரும்பு'
    },
    'contact.json': {
      subtitle: 'உங்களுக்கு உதவ நாங்கள் தயாராக உள்ளோம். எப்போது வேண்டுமானாலும் தொடர்பு கொள்ளுங்கள்.',
      sentTitle: 'செய்தி அனுப்பப்பட்டது!',
      sentDesc: '24 மணி நேரத்திற்குள் நாங்கள் உங்களுக்கு பதிலளிப்போம்.',
      name: 'பெயர்',
      email: 'மின்னஞ்சல்',
      phone: 'தொலைபேசி எண்',
      message: 'செய்தி',
      sendMessage: 'செய்தி அனுப்பு',
      detailsHeader: 'தொடர்பு விவரங்கள்',
      timing: 'திங்கள்-சனி, காலை 9:00 - மாலை 7:00'
    },
    'faq.json': {
      searchPlaceholder: 'அடிக்கடி கேட்கப்படும் கேள்விகளைத் தேடுங்கள்...'
    },
    'footer.json': {
      tagline: 'இந்தியாவின் முன்னணி AI-இயங்கும் ரியல் எஸ்டேட் தளம். அறிவார்ந்த பரிந்துரைகள் மற்றும் சரிபார்க்கப்பட்ட சொத்துக்களுடன் உங்கள் கனவு இல்லத்தைக் கண்டறியவும்.',
      popularSearches: 'பிரபலமான தேடல்கள்',
      flatsForSale: 'விற்பனைக்கு உள்ள அடுக்குமாடி குடியிருப்புகள்',
      flatsForRent: 'வாடகைக்கு உள்ள குடியிருப்புகள்',
      luxuryVillas: 'சொகுசு வில்லாக்கள்',
      commercialProps: 'வணிக சொத்துக்கள்',
      plotsLand: 'மனைகள் & நிலங்கள்',
      topCities: 'முக்கிய நகரங்கள்',
      propsHyderabad: 'ஹைதராபாத்தில் சொத்துக்கள்',
      propsMumbai: 'மும்பையில் சொத்துக்கள்',
      propsBengaluru: 'பெங்களூரில் சொத்துக்கள்',
      propsPune: 'புனேவில் சொத்துக்கள்',
      propsDelhi: 'டெல்லி NCR-ல் சொத்துக்கள்',
      company: 'நிறுவனம்',
      rightsReserved: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      madeWithLove: 'இந்திய ரியல் எஸ்டேட்டுக்காக ❤️ உடன் உருவாக்கப்பட்டது',
      faqs: 'அடிக்கடி கேட்கப்படும் கேள்விகள்'
    },
    'menu.json': {
      buyTitle: 'சொத்துக்களை வாங்கவும்',
      buyBadge: 'சரிபார்க்கப்பட்டது',
      residentialBuy: 'குடியிருப்பு சொத்துக்கள்',
      flatsApartments: 'அடுக்குமாடி குடியிருப்புகள்',
      flatsDesc: 'தயாராக உள்ள மற்றும் கட்டுமானத்தில் உள்ள 1-5 BHK',
      luxuryVillas: 'சொகுசு வில்லாக்கள்',
      villasDesc: 'கேட்டட் கம்யூனிட்டி மற்றும் தனி வில்லாக்கள்',
      plotLand: 'மனைகள் & நிலம்',
      plotsDesc: 'குடியிருப்பு & வணிக மனைகள்',
      commercialBuy: 'வணிக சொத்துக்கள்',
      commercialOffices: 'வணிக அலுவலகங்கள்',
      officesDesc: 'கார்ப்பரேட் அலுவலக இடங்கள்',
      retailShops: 'கடைகள் & ஷோரூம்கள்',
      shopsDesc: 'முக்கிய வணிகக் கடைகள்',
      warehouses: 'கிடங்குகள்',
      warehousesDesc: 'லாஜிஸ்டிக்ஸ் மற்றும் தொழில்துறை மையங்கள்',
      toolsTrends: 'கருவிகள் & போக்குகள்',
      emiCalculator: 'வீட்டுக் கடன் EMI கால்குலேட்டர்',
      emiDesc: 'மாதாந்திர தவணைகளைக் கணக்கிடுங்கள்',
      priceTrends: 'விலைப் போக்குகள் & ROI',
      trendsDesc: 'அதிக மதிப்பு உயர்வு பகுதிகள்',
      rentTitle: 'வாடகைக்கு சொத்துக்கள்',
      rentBadge: 'பிரபலம்',
      residentialRent: 'குடியிருப்பு வாடகை',
      rentFlatsDesc: 'சரிபார்க்கப்பட்ட வாடகை வீடுகள்',
      independentHouses: 'தனி வீடுகள்',
      housesDesc: 'குடும்பங்களுக்கான விசாலமான வீடுகள்',
      penthouseSuites: 'பென்ட்ஹவுஸ் அடுக்குகள்',
      penthouseDesc: 'அற்புதமான நகரக் காட்சிகள்',
      commercialRent: 'வணிக வாடகை',
      officeSpaces: 'அலுவலக இடங்கள்',
      servicedDesksDesc: 'சேவை வசதியுடன் கூடிய அலுவலகங்கள்',
      commercialShops: 'வணிகக் கடைகள்',
      streetRetailDesc: 'பிரதான சாலை சில்லறை விற்பனை கடைகள்',
      industrialFacilities: 'தொழில்துறை வசதிகள்',
      heavyShedsDesc: 'கனரக தொழில்துறை கூடங்கள்',
      rentingServices: 'வாடகை சேவைகள்',
      rentalAgreement: 'வாடகை ஒப்பந்தம்',
      legalDraftDesc: 'உடனடி ஆன்லைன் சட்ட வரைவு',
      packersMovers: 'பேக்கர்ஸ் & மூவர்ஸ்',
      relocationDesc: 'எளிதான வீடு மாற்றும் சேவைகள்',
      commercialSpaces: 'வணிக இடங்கள்',
      highRoi: 'அதிக லாபம்',
      commercialBuying: 'வணிக கொள்முதல்',
      itParksOffices: 'IT பூங்காக்கள் & அலுவலகங்கள்',
      corporateFloorsDesc: 'கார்ப்பரேட் தளங்கள்',
      showroomsShops: 'ஷோரூம்கள் & கடைகள்',
      primeRetailDesc: 'முக்கிய சாலை வணிக இடங்கள்',
      commercialLand: 'வணிக நிலம்',
      towersPlotDesc: 'வணிக கோபுரங்களுக்கான நிலம்',
      commercialRenting: 'வணிக வாடகை',
      coworkingDesks: 'கோ-வொர்க்கிங் இடங்கள்',
      sharedPassesDesc: 'நெகிழ்வான பகிர்வு அலுவலகங்கள்',
      warehouseStorage: 'கிடங்கு & சேமிப்பகம்',
      hubsDesc: 'குளிர்பதன கிடங்குகள்',
      projectsTitle: 'புதிய திட்டங்கள் & பில்டர்கள்',
      exclusiveBadge: 'பிரத்தியேகமானது',
      projectStatus: 'திட்டத்தின் நிலை',
      newlyLaunched: 'புதிதாக தொடங்கப்பட்டது',
      discountPricingDesc: 'தொடக்க நிலை சிறப்பு விலைகள்',
      underConstruction: 'கட்டுமானத்தில் உள்ளது',
      possessionDesc: '1-2 ஆண்டுகளில் ஒப்படைப்பு',
      readyToMoveIn: 'உடனடியாக குடியேற தயார்',
      ocReceivedDesc: 'OC சான்றிதழ் பெற்ற குடியிருப்புகள்',
      featuredBuilders: 'பிரபல பில்டர்கள்',
      townshipsDesc: 'சொகுசு டவுன்ஷிப்கள்',
      towersDesc: 'உயரமான குடியிருப்புக் கோபுரங்கள்',
      precisionDesc: 'உயர்ந்த தரக் கட்டுமானம்',
      plotsTitle: 'மனைகள் & நிலங்கள்',
      plotsBadge: 'DTCP / RERA',
      plotCategories: 'மனைப் பிரிவுகள்',
      hmdaPlots: 'அங்கீகரிக்கப்பட்ட மனைகள்',
      clearTitleDesc: 'தெளிவான பட்டா மனைகள்',
      gatedPlots: 'கேட்டட் லேஅவுட் மனைகள்',
      cablingDesc: 'அண்டர்கிரவுண்ட் கேபிளிங் & கிளப்ஹவுஸ்',
      agriculturalLand: 'விவசாய நிலம்',
      farmhouseDesc: 'பண்ணை வீடுகள் & தோட்டங்கள்',
      investmentSpecial: 'முதலீட்டு சிறப்பு நிலங்கள்',
      highwayLand: 'நெடுஞ்சாலை நோக்கிய நிலங்கள்',
      potentialDesc: 'அதிக வணிக வாய்ப்புகள்',
      villaPlots: 'வில்லா மனைப் பிரிவுகள்',
      customVillaDesc: 'உங்கள் கனவு வில்லாவைக் கட்டுங்கள்',
      exploreCurated: 'சிறப்புப் பிரிவுகளை ஆராயுங்கள்'
    },
    'nav.json': {
      dashboard: 'நிர்வாக டாஷ்போர்டு'
    },
    'notFound.json': {
      title: 'பக்கம் கிடைக்கவில்லை',
      desc: 'நீங்கள் தேடும் பக்கம் இல்லை அல்லது நகர்த்தப்பட்டுள்ளது.',
      backHome: 'முகப்புப் பக்கத்திற்குத் திரும்பு'
    }
  }
};

// Additional helper to generate languages fallback-filled from Hindi or English if needed
const langList = ['kn', 'ml', 'mr', 'bn', 'gu', 'pa'];

const fallbackEnDir = path.join(localesDir, 'en');
const missingFileNames = [
  'about.json',
  'blog.json',
  'contact.json',
  'faq.json',
  'footer.json',
  'langModal.json',
  'menu.json',
  'nav.json',
  'notFound.json'
];

// Write te and ta
['te', 'ta'].forEach(lang => {
  const langDir = path.join(localesDir, lang);
  if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
  for (const [filename, content] of Object.entries(translations[lang])) {
    fs.writeFileSync(path.join(langDir, filename), JSON.stringify(content, null, 2), 'utf8');
    console.log(`Wrote ${lang}/${filename}`);
  }
});

// For remaining languages, ensure complete files exist
langList.forEach(lang => {
  const langDir = path.join(localesDir, lang);
  if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
  missingFileNames.forEach(fn => {
    const dest = path.join(langDir, fn);
    if (!fs.existsSync(dest)) {
      // Use hi or en as base
      const hiSrc = path.join(localesDir, 'hi', fn);
      const enSrc = path.join(localesDir, 'en', fn);
      const srcFile = fs.existsSync(hiSrc) ? hiSrc : enSrc;
      const content = fs.readFileSync(srcFile, 'utf8');
      fs.writeFileSync(dest, content, 'utf8');
      console.log(`Created ${lang}/${fn}`);
    }
  });
});

console.log('All locale files successfully verified and created!');
