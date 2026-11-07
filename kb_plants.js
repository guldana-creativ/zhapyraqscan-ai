/* ЖапырақСкан — өсімдіктер каталогы.
 * cat: өсімдік тобы; poison: 0 – улы емес, 1 – абай болу керек (шырыны, шикі бөлігі зиянды), 2 – улы;
 * risks – осы өсімдікте жиі кездесетін аурулар мен зиянкестер (анықтамалық идентификаторлары);
 * wiki – суретті Уикипедиядан алу үшін ағылшынша мақала атауы.
 */
(function (g) {
  'use strict';
  var CATS = {
    cereal: { name: 'Дәнді дақыл', color: '#c79a2b' },
    vegetable: { name: 'Көкөніс', color: '#3f9b48' },
    melon: { name: 'Бақша дақылы', color: '#7cab2f' },
    fruit: { name: 'Жеміс-жидек', color: '#c4513a' },
    industrial: { name: 'Техникалық дақыл', color: '#7a6bb0' },
    forage: { name: 'Мал азықтық дақыл', color: '#6d8f3a' },
    tree: { name: 'Ағаш, бұта', color: '#5b7b4d' },
    house: { name: 'Бөлме өсімдігі', color: '#2f8a8a' },
    flower: { name: 'Сәндік гүл', color: '#c45a9a' },
    medicinal: { name: 'Дәрілік өсімдік', color: '#3a7fb5' },
    weed: { name: 'Арамшөп', color: '#8a7a3a' },
    poison: { name: 'Улы өсімдік', color: '#b8302b' }
  };

  var P = [
    // Дәнді дақылдар
    { id: 'bidai', kk: 'Бидай', lat: 'Triticum aestivum', ru: 'Пшеница', cat: ['cereal'], poison: 0, wiki: 'Common wheat', about: 'Елдің негізгі нан дақылы. Жапырағы ұзын, таспа тәрізді.', risks: ['rust', 'powdery_mildew', 'septoria', 'n_def', 'aphid', 'locust', 'drought', 'sunn_pest', 'wheat_thrips', 'frit_fly'] },
    { id: 'arpa', kk: 'Арпа', lat: 'Hordeum vulgare', ru: 'Ячмень', cat: ['cereal', 'forage'], poison: 0, wiki: 'Barley', about: 'Жем-шөп және сыра қайнату дақылы, құрғақшылыққа төзімді.', risks: ['rust', 'powdery_mildew', 'aphid', 'locust', 'sunn_pest', 'frit_fly'] },
    { id: 'kurish', kk: 'Күріш', lat: 'Oryza sativa', ru: 'Рис', cat: ['cereal'], poison: 0, wiki: 'Rice', about: 'Қызылорда облысының басты дақылы, суға бастырылған алқапта өседі.', risks: ['rice_blast', 'salinity', 'n_def', 'k_def'] },
    { id: 'zhugeri', kk: 'Жүгері', lat: 'Zea mays', ru: 'Кукуруза', cat: ['cereal', 'forage'], poison: 0, wiki: 'Maize', about: 'Дән және сүрлем үшін өсіріледі. Жапырағы кең, ортасында ақшыл тамыр бар.', risks: ['rust', 'cercospora', 'bollworm', 'p_def', 'drought', 'helminthosporium', 'corn_borer', 'frit_fly'] },
    { id: 'tary', kk: 'Тары', lat: 'Panicum miliaceum', ru: 'Просо', cat: ['cereal'], poison: 0, wiki: 'Proso millet', about: 'Құрғақшылыққа өте төзімді ежелгі дақыл.', risks: ['locust', 'drought'] },
    // Көкөністер
    { id: 'kyzanak', kk: 'Қызанақ', lat: 'Solanum lycopersicum', ru: 'Томат', cat: ['vegetable'], poison: 1, wiki: 'Tomato', about: 'Жапырағы мен сабағында улы алкалоид (томатин) бар, жемісі жеуге жарамды.', risks: ['late_blight', 'early_blight', 'septoria', 'leaf_mold', 'bacterial_spot', 'mosaic_virus', 'tylcv', 'whitefly', 'spider_mite', 'colorado', 'bollworm', 'ca_def', 'mg_def', 'target_spot', 'tuta', 'nematode'] },
    { id: 'kiyar', kk: 'Қияр', lat: 'Cucumis sativus', ru: 'Огурец', cat: ['vegetable'], poison: 0, wiki: 'Cucumber', about: 'Жылу мен ылғалды сүйеді, жылыжайда жиі өсіріледі.', risks: ['powdery_mildew', 'downy_mildew', 'angular_leaf_spot', 'mosaic_virus', 'spider_mite', 'aphid', 'whitefly', 'thrips', 'k_def', 'nematode'] },
    { id: 'kartop', kk: 'Картоп', lat: 'Solanum tuberosum', ru: 'Картофель', cat: ['vegetable'], poison: 1, wiki: 'Potato', about: 'Жасыл түйнегі мен жапырағында улы соланин болады.', risks: ['late_blight', 'early_blight', 'colorado', 'mosaic_virus', 'wireworm', 'k_def', 'white_grub', 'cutworm'] },
    { id: 'piyaz', kk: 'Пияз', lat: 'Allium cepa', ru: 'Лук репчатый', cat: ['vegetable', 'medicinal'], poison: 0, wiki: 'Onion', about: 'Түтікті жапырақты көкөніс.', risks: ['downy_mildew', 'thrips', 'n_def', 'onion_fly'] },
    { id: 'sabiz', kk: 'Сәбіз', lat: 'Daucus carota subsp. sativus', ru: 'Морковь', cat: ['vegetable'], poison: 0, wiki: 'Carrot', about: 'Жапырағы қауырсын тәрізді ұсақ тілімделген.', risks: ['aphid', 'powdery_mildew', 'drought'] },
    { id: 'kyrykkabat', kk: 'Қырыққабат', lat: 'Brassica oleracea', ru: 'Капуста', cat: ['vegetable'], poison: 0, wiki: 'Cabbage', about: 'Жапырағы қалың, көкшіл-жасыл, балауыз қабаты бар.', risks: ['cabbage_white', 'flea_beetle', 'aphid', 'downy_mildew', 'slug'] },
    { id: 'burysh', kk: 'Тәтті бұрыш', lat: 'Capsicum annuum', ru: 'Перец сладкий', cat: ['vegetable'], poison: 0, wiki: 'Bell pepper', about: 'Жылуды сүйетін көкөніс, жапырағы жылтыр.', risks: ['bacterial_spot', 'aphid', 'spider_mite', 'ca_def', 'sunburn'] },
    { id: 'bayaldy', kk: 'Баялды', lat: 'Solanum melongena', ru: 'Баклажан', cat: ['vegetable'], poison: 1, wiki: 'Eggplant', about: 'Колорадо қоңызы мен өрмекші кене жиі зақымдайды.', risks: ['colorado', 'spider_mite', 'aphid', 'whitefly'] },
    { id: 'askabak', kk: 'Асқабақ', lat: 'Cucurbita pepo', ru: 'Тыква, кабачок', cat: ['vegetable', 'melon'], poison: 0, wiki: 'Cucurbita pepo', about: 'Жапырағы ірі, бетінде ақшыл дақтар табиғи түрде болуы мүмкін.', risks: ['powdery_mildew', 'aphid', 'mosaic_virus'] },
    { id: 'kyzylsha', kk: 'Қызылша', lat: 'Beta vulgaris', ru: 'Свёкла', cat: ['vegetable', 'industrial'], poison: 0, wiki: 'Beetroot', about: 'Жапырақ сағағы мен тамырлары қызыл болуы – сорттық белгі.', risks: ['cercospora', 'aphid', 'flea_beetle'] },
    { id: 'sarymsak', kk: 'Сарымсақ', lat: 'Allium sativum', ru: 'Чеснок', cat: ['vegetable', 'medicinal'], poison: 0, wiki: 'Garlic', about: 'Тұнбасы бітеге қарсы табиғи құрал ретінде қолданылады.', risks: ['rust', 'thrips'] },
    // Бақша
    { id: 'kauyn', kk: 'Қауын', lat: 'Cucumis melo', ru: 'Дыня', cat: ['melon', 'fruit'], poison: 0, wiki: 'Muskmelon', about: 'Қызылорда мен Түркістан өңірінің атақты бақша дақылы.', risks: ['powdery_mildew', 'downy_mildew', 'aphid', 'spider_mite', 'fusarium_wilt', 'drought'] },
    { id: 'karbyz', kk: 'Қарбыз', lat: 'Citrullus lanatus', ru: 'Арбуз', cat: ['melon', 'fruit'], poison: 0, wiki: 'Watermelon', about: 'Жапырағы терең тілімделген.', risks: ['anthracnose', 'fusarium_wilt', 'aphid', 'spider_mite'] },
    // Жеміс-жидек
    { id: 'alma', kk: 'Алма ағашы', lat: 'Malus domestica', ru: 'Яблоня', cat: ['fruit', 'tree'], poison: 0, wiki: 'Apple', about: 'Қазақстан – алманың тарихи отаны (Сиверс алмасы).', risks: ['scab', 'powdery_mildew', 'rust', 'fire_blight', 'black_rot', 'aphid', 'codling_moth', 'spider_mite', 'fe_def'] },
    { id: 'almurt', kk: 'Алмұрт', lat: 'Pyrus communis', ru: 'Груша', cat: ['fruit', 'tree'], poison: 0, wiki: 'Pear', about: 'Бактериялық күйікке сезімтал.', risks: ['scab', 'fire_blight', 'rust', 'aphid'] },
    { id: 'orik', kk: 'Өрік', lat: 'Prunus armeniaca', ru: 'Абрикос', cat: ['fruit', 'tree'], poison: 1, wiki: 'Apricot', about: 'Сүйегінің ішіндегі дәні амигдалин (улы зат) түзеді.', risks: ['shot_hole', 'aphid', 'cold'] },
    { id: 'shie', kk: 'Шие', lat: 'Prunus cerasus', ru: 'Вишня', cat: ['fruit', 'tree'], poison: 1, wiki: 'Prunus cerasus', about: 'Клястероспориоз (тесік дақтылық) жиі кездеседі.', risks: ['shot_hole', 'powdery_mildew', 'aphid'] },
    { id: 'shabdaly', kk: 'Шабдалы', lat: 'Prunus persica', ru: 'Персик', cat: ['fruit', 'tree'], poison: 1, wiki: 'Peach', about: 'Көктемде жапырақ бұйралығы ауруына шалдығады.', risks: ['peach_leaf_curl', 'shot_hole', 'bacterial_spot', 'aphid'] },
    { id: 'zhuzim', kk: 'Жүзім', lat: 'Vitis vinifera', ru: 'Виноград', cat: ['fruit'], poison: 0, wiki: 'Vitis vinifera', about: 'Жапырағы бес бөлікті, оидиум мен милдьюге сезімтал.', risks: ['powdery_mildew', 'downy_mildew', 'black_rot', 'grape_mite', 'fe_def', 'esca', 'cercospora'] },
    { id: 'kulpynai', kk: 'Құлпынай', lat: 'Fragaria × ananassa', ru: 'Клубника (садовая земляника)', cat: ['fruit'], poison: 0, wiki: 'Garden strawberry', about: 'Үш жапырақшадан тұратын күрделі жапырақ.', risks: ['gray_mold', 'spider_mite', 'slug', 'powdery_mildew', 'strawberry_scorch', 'white_grub'] },
    { id: 'tankurai', kk: 'Таңқурай', lat: 'Rubus idaeus', ru: 'Малина', cat: ['fruit'], poison: 0, wiki: 'Rubus idaeus', about: 'Жапырағының асты ақшыл түкті – бұл ауру емес.', risks: ['spider_mite', 'aphid', 'anthracnose'] },
    { id: 'karakat', kk: 'Қарақат', lat: 'Ribes nigrum', ru: 'Смородина чёрная', cat: ['fruit'], poison: 0, wiki: 'Blackcurrant', about: 'Жапырағының хош иісі бар.', risks: ['powdery_mildew', 'aphid', 'spider_mite'] },
    { id: 'zhide', kk: 'Жиде', lat: 'Elaeagnus angustifolia', ru: 'Лох узколистный', cat: ['fruit', 'tree'], poison: 0, wiki: 'Elaeagnus angustifolia', about: 'Жапырағы күміс түсті – бұл түкшелер, ауру емес. Сортаң жерге төзімді.', risks: ['salinity', 'drought'] },
    // Техникалық, мал азықтық
    { id: 'makta', kk: 'Мақта', lat: 'Gossypium hirsutum', ru: 'Хлопчатник', cat: ['industrial'], poison: 1, wiki: 'Gossypium hirsutum', about: 'Түркістан облысының негізгі техникалық дақылы.', risks: ['bollworm', 'spider_mite', 'aphid', 'whitefly', 'fusarium_wilt'] },
    { id: 'kunbagys', kk: 'Күнбағыс', lat: 'Helianthus annuus', ru: 'Подсолнечник', cat: ['industrial'], poison: 0, wiki: 'Common sunflower', about: 'Майлы дақыл, жапырағы ірі әрі кедір-бұдыр.', risks: ['rust', 'downy_mildew', 'bollworm', 'locust'] },
    { id: 'zhonyshka', kk: 'Жоңышқа', lat: 'Medicago sativa', ru: 'Люцерна', cat: ['forage'], poison: 0, wiki: 'Alfalfa', about: 'Бұршақ тұқымдас, топырақты азотпен байытады.', risks: ['aphid', 'locust', 'cercospora'] },
    { id: 'soya', kk: 'Соя', lat: 'Glycine max', ru: 'Соя', cat: ['industrial', 'forage'], poison: 0, wiki: 'Soybean', about: 'Бұршақ тұқымдас ақуызды дақыл.', risks: ['spider_mite', 'rust', 'mosaic_virus'] },
    // Ағаштар
    { id: 'tal', kk: 'Тал', lat: 'Salix', ru: 'Ива', cat: ['tree'], poison: 0, wiki: 'Willow', about: 'Су жағасында өседі, жапырағы ұзынша.', risks: ['rust', 'aphid'] },
    { id: 'terek', kk: 'Терек', lat: 'Populus', ru: 'Тополь', cat: ['tree'], poison: 0, wiki: 'Populus', about: 'Қала көгалдандыруының негізгі ағашы.', risks: ['rust', 'aphid', 'drought'] },
    { id: 'karagash', kk: 'Қарағаш', lat: 'Ulmus pumila', ru: 'Вяз приземистый', cat: ['tree'], poison: 0, wiki: 'Ulmus pumila', about: 'Құрғақшылық пен тұзға төзімді, ауылдарда кең таралған.', risks: ['aphid', 'drought'] },
    { id: 'sekseuil', kk: 'Сексеуіл', lat: 'Haloxylon ammodendron', ru: 'Саксаул', cat: ['tree'], poison: 0, wiki: 'Haloxylon ammodendron', about: 'Арал құмдарын бекітетін шөл ағашы. Жапырағы қабыршақ тәрізді, бұтақтары жасыл.', risks: ['drought'] },
    { id: 'torangy', kk: 'Тораңғы', lat: 'Populus euphratica', ru: 'Тополь разнолистный (туранга)', cat: ['tree'], poison: 0, wiki: 'Populus euphratica', about: 'Бір ағашта жапырақтары әртүрлі пішінді болады. Қызыл кітапқа енген.', risks: ['salinity'] },
    { id: 'zhyngyl', kk: 'Жыңғыл', lat: 'Tamarix', ru: 'Тамарикс (гребенщик)', cat: ['tree'], poison: 0, wiki: 'Tamarix', about: 'Тұзды топырақта өседі, жапырағынан тұз бөледі.', risks: ['salinity'] },
    { id: 'itmuryn', kk: 'Итмұрын', lat: 'Rosa canina', ru: 'Шиповник', cat: ['tree', 'medicinal'], poison: 0, wiki: 'Rosa canina', about: 'Жемісі С дәруменіне бай дәрілік бұта.', risks: ['rust', 'powdery_mildew', 'aphid'] },
    // Бөлме өсімдіктері
    { id: 'fikus', kk: 'Фикус', lat: 'Ficus elastica, Ficus benjamina', ru: 'Фикус', cat: ['house'], poison: 1, wiki: 'Ficus elastica', about: 'Сүт тәрізді шырыны теріні тітіркендіреді.', risks: ['scale', 'spider_mite', 'overwater', 'low_light', 'cold', 'root_rot'] },
    { id: 'spathi', kk: 'Спатифиллум', lat: 'Spathiphyllum', ru: 'Спатифиллум', cat: ['house'], poison: 1, wiki: 'Spathiphyllum', about: 'Ауаны тазартатын гүл. Шырыны мысық пен итке зиянды.', risks: ['dry_air', 'overwater', 'drought', 'spider_mite'] },
    { id: 'chloro', kk: 'Хлорофитум', lat: 'Chlorophytum comosum', ru: 'Хлорофитум', cat: ['house'], poison: 0, wiki: 'Chlorophytum comosum', about: 'Жапырағының ұштары қураса – ауа құрғақ немесе су тұзды.', risks: ['dry_air', 'salinity', 'overwater'] },
    { id: 'aloe', kk: 'Алоэ (сабыр)', lat: 'Aloe vera', ru: 'Алоэ', cat: ['house', 'medicinal'], poison: 1, wiki: 'Aloe vera', about: 'Жапырағы етженді. Ішке қолдануға болмайды.', risks: ['overwater', 'sunburn', 'mealybug', 'scale'] },
    { id: 'kaztamak', kk: 'Қазтамақ (герань)', lat: 'Pelargonium', ru: 'Пеларгония (герань)', cat: ['house', 'flower'], poison: 1, wiki: 'Pelargonium', about: 'Жапырағының иісі көптеген жәндікті үркітеді.', risks: ['whitefly', 'overwater', 'gray_mold'] },
    { id: 'begonia', kk: 'Бегония', lat: 'Begonia', ru: 'Бегония', cat: ['house', 'flower'], poison: 1, wiki: 'Begonia', about: 'Жапырағын бүркуге болмайды – ұнтақты көгерту пайда болады.', risks: ['powdery_mildew', 'gray_mold', 'overwater'] },
    { id: 'senpolia', kk: 'Сенполия (фиалка)', lat: 'Saintpaulia', ru: 'Сенполия (узамбарская фиалка)', cat: ['house', 'flower'], poison: 0, wiki: 'Saintpaulia', about: 'Жапыраққа суық су тисе, ақшыл дақтар қалады.', risks: ['overwater', 'mealybug', 'thrips', 'sunburn', 'broad_mite', 'root_rot'] },
    { id: 'monstera', kk: 'Монстера', lat: 'Monstera deliciosa', ru: 'Монстера', cat: ['house'], poison: 1, wiki: 'Monstera deliciosa', about: 'Жапырағындағы тесіктер – табиғи белгі. Шырыны тітіркендіреді.', risks: ['spider_mite', 'scale', 'overwater', 'low_light'] },
    { id: 'dracena', kk: 'Драцена', lat: 'Dracaena', ru: 'Драцена', cat: ['house'], poison: 1, wiki: 'Dracaena (plant)', about: 'Жапырақ ұштарының қурауы көбіне құрғақ ауадан.', risks: ['dry_air', 'scale', 'spider_mite', 'overwater'] },
    { id: 'sansevieria', kk: 'Сансевиерия', lat: 'Dracaena trifasciata', ru: 'Сансевиерия (щучий хвост)', cat: ['house'], poison: 1, wiki: 'Dracaena trifasciata', about: 'Өте төзімді, тек артық суарудан шіриді.', risks: ['overwater', 'cold'] },
    { id: 'diffenbahia', kk: 'Диффенбахия', lat: 'Dieffenbachia', ru: 'Диффенбахия', cat: ['house', 'poison'], poison: 2, wiki: 'Dieffenbachia', about: 'Шырыны улы: ауызға, көзге тисе ісіндіреді. Балалардан алыс ұстау керек.', risks: ['spider_mite', 'scale', 'cold'] },
    { id: 'oleandr', kk: 'Олеандр', lat: 'Nerium oleander', ru: 'Олеандр', cat: ['house', 'flower', 'poison'], poison: 2, wiki: 'Nerium', about: 'Барлық бөлігі өте улы (жүрекке әсер ететін гликозидтер). Қолғаппен күту керек.', risks: ['scale', 'aphid', 'mealybug'] },
    // Сәндік гүлдер
    { id: 'raushan', kk: 'Раушан', lat: 'Rosa', ru: 'Роза', cat: ['flower'], poison: 0, wiki: 'Rose', about: 'Қара дақтылық, ұнтақты көгерту және біте жиі кездеседі.', risks: ['powdery_mildew', 'rust', 'aphid', 'spider_mite', 'black_rot'] },
    { id: 'kyzgaldak', kk: 'Қызғалдақ', lat: 'Tulipa', ru: 'Тюльпан', cat: ['flower'], poison: 1, wiki: 'Tulip', about: 'Қазақстан – жабайы қызғалдақтардың отаны. Пиязшығы жануарларға улы.', risks: ['gray_mold', 'mosaic_virus'] },
    { id: 'barkhatgul', kk: 'Барқытгүл', lat: 'Tagetes', ru: 'Бархатцы', cat: ['flower'], poison: 0, wiki: 'Tagetes', about: 'Иісі зиянкестерді үркітеді, сондықтан көкөніс арасына егеді.', risks: ['spider_mite', 'gray_mold'] },
    // Дәрілік
    { id: 'tuimedak', kk: 'Түймедақ', lat: 'Matricaria chamomilla', ru: 'Ромашка аптечная', cat: ['medicinal'], poison: 0, wiki: 'Matricaria chamomilla', about: 'Гүлі қабынуға қарсы шай ретінде қолданылады.', risks: ['aphid'] },
    { id: 'zhalbyz', kk: 'Жалбыз', lat: 'Mentha', ru: 'Мята', cat: ['medicinal'], poison: 0, wiki: 'Mentha', about: 'Хош иісті дәрілік шөп.', risks: ['rust', 'spider_mite', 'flea_beetle'] },
    { id: 'shaikurai', kk: 'Шайқурай', lat: 'Hypericum perforatum', ru: 'Зверобой', cat: ['medicinal', 'weed'], poison: 1, wiki: 'Hypericum perforatum', about: 'Дәрілік, бірақ көп мөлшерде малға зиянды (күнге сезімталдық тудырады).', risks: [] },
    { id: 'zholzhelken', kk: 'Үлкен жолжелкен', lat: 'Plantago major', ru: 'Подорожник большой', cat: ['medicinal', 'weed'], poison: 0, wiki: 'Plantago major', about: 'Жолдың бойында өседі, жапырағы жараны жазуға қолданылған.', risks: ['powdery_mildew'] },
    // Арамшөптер
    { id: 'shyrmauyk', kk: 'Дала шырмауығы', lat: 'Convolvulus arvensis', ru: 'Вьюнок полевой', cat: ['weed'], poison: 1, wiki: 'Convolvulus arvensis', about: 'Тамыры 2–3 метрге дейін кететін көпжылдық қиын жойылатын арамшөп.', risks: [] },
    { id: 'alabota', kk: 'Алабота', lat: 'Chenopodium album', ru: 'Марь белая', cat: ['weed'], poison: 0, wiki: 'Chenopodium album', about: 'Жапырағы ақшыл ұнтақпен жабылғандай – бұл табиғи белгі, ауру емес.', risks: [] },
    { id: 'shiritsa', kk: 'Ширица (жабайы амарант)', lat: 'Amaranthus retroflexus', ru: 'Щирица запрокинутая', cat: ['weed'], poison: 0, wiki: 'Amaranthus retroflexus', about: 'Көкөніс алқабының өте көп тұқым беретін арамшөбі.', risks: [] },
    { id: 'kurmek', kk: 'Күрмек', lat: 'Echinochloa crus-galli', ru: 'Ежовник обыкновенный (куриное просо)', cat: ['weed'], poison: 0, wiki: 'Echinochloa crus-galli', about: 'Күріш алқабының басты арамшөбі – сыртынан күрішке ұқсайды.', risks: [] },
    { id: 'kamys', kk: 'Қамыс', lat: 'Phragmites australis', ru: 'Тростник обыкновенный', cat: ['weed'], poison: 0, wiki: 'Phragmites australis', about: 'Суармалы алқаптар мен арықтарда өседі.', risks: [] },
    { id: 'zhantak', kk: 'Жантақ', lat: 'Alhagi pseudalhagi', ru: 'Верблюжья колючка', cat: ['weed', 'medicinal'], poison: 0, wiki: 'Alhagi', about: 'Тікенді, тамыры өте терең кететін шөл өсімдігі.', risks: [] },
    { id: 'kekire', kk: 'Қызғылт кекіре', lat: 'Rhaponticum repens', ru: 'Горчак ползучий', cat: ['weed', 'poison'], poison: 2, wiki: 'Rhaponticum repens', about: 'Карантиндік арамшөп, жылқыға улы.', risks: [] },
    { id: 'ambrozia', kk: 'Жусанжапырақ амброзия', lat: 'Ambrosia artemisiifolia', ru: 'Амброзия полыннолистная', cat: ['weed'], poison: 1, wiki: 'Ambrosia artemisiifolia', about: 'Карантиндік арамшөп. Тозаңы күшті аллергия тудырады.', risks: [] },
    { id: 'bakbak', kk: 'Бақбақ', lat: 'Taraxacum officinale', ru: 'Одуванчик', cat: ['weed', 'medicinal'], poison: 0, wiki: 'Taraxacum officinale', about: 'Көгалдағы арамшөп, тамыры дәрі ретінде қолданылады.', risks: [] },
    { id: 'kalakai', kk: 'Қалақай', lat: 'Urtica dioica', ru: 'Крапива двудомная', cat: ['weed', 'medicinal'], poison: 1, wiki: 'Urtica dioica', about: 'Түктері теріні күйдіреді, жас жапырағы тағамға қолданылады.', risks: ['aphid'] },
    { id: 'zhusan', kk: 'Жусан', lat: 'Artemisia', ru: 'Полынь', cat: ['weed', 'medicinal'], poison: 1, wiki: 'Artemisia (plant)', about: 'Даланың ащы иісті өсімдігі. Көп мөлшері улы.', risks: [] },
    { id: 'sutigen', kk: 'Сүттіген', lat: 'Euphorbia', ru: 'Молочай', cat: ['weed', 'poison'], poison: 2, wiki: 'Euphorbia', about: 'Ақ сүтті шырыны терісі мен көзді күйдіреді.', risks: [] },
    // Улы өсімдіктер
    { id: 'menduana_s', kk: 'Сасық меңдуана', lat: 'Datura stramonium', ru: 'Дурман обыкновенный', cat: ['poison', 'weed'], poison: 2, wiki: 'Datura stramonium', about: 'Өте улы! Барлық бөлігі, әсіресе тұқымы адам мен малды уландырады.', risks: [] },
    { id: 'menduana_k', kk: 'Қара меңдуана', lat: 'Hyoscyamus niger', ru: 'Белена чёрная', cat: ['poison', 'weed'], poison: 2, wiki: 'Hyoscyamus niger', about: 'Өте улы! Жапырағы жабысқақ түкті, жағымсыз иісті.', risks: [] },
    { id: 'adyraspan', kk: 'Адыраспан', lat: 'Peganum harmala', ru: 'Гармала обыкновенная', cat: ['poison', 'medicinal', 'weed'], poison: 2, wiki: 'Peganum harmala', about: 'Халық түтетіп қолданады, бірақ ішке қабылдау улануға әкеледі. Қызылорда өңірінде көп өседі.', risks: [] },
    { id: 'sargaldak', kk: 'Сарғалдақ', lat: 'Ranunculus', ru: 'Лютик', cat: ['poison', 'weed', 'flower'], poison: 2, wiki: 'Ranunculus', about: 'Шырыны терісі мен ауыз қуысын күйдіреді, малды уландырады.', risks: [] },
    { id: 'kokzhidek', kk: 'Көкжидек', lat: 'Vaccinium corymbosum', ru: 'Голубика', cat: ['fruit'], poison: 0, wiki: 'Vaccinium corymbosum', about: 'Қышқыл топырақты қажет етеді; сілтілі топырақта темір хлорозы пайда болады.', risks: ['fe_def', 'gray_mold', 'aphid'] },
    { id: 'apelsin', kk: 'Апельсин (цитрус)', lat: 'Citrus sinensis', ru: 'Апельсин', cat: ['fruit', 'house'], poison: 0, wiki: 'Orange (fruit)', about: 'Бізде көбіне бөлмеде өсіріледі. Қалқаншалы, өрмекші кене және темір хлорозы жиі кездеседі.', risks: ['hlb', 'scale', 'spider_mite', 'fe_def', 'sooty_mold'] },
  ];

  g.KB_PLANTS = { CATS: CATS, PLANTS: P };
})(typeof window !== 'undefined' ? window : globalThis);
