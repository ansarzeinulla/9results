-- 6. ЛОКАЦИЯЛАР (Қазақстанның облыстары мен қалалары)
INSERT INTO locations (id) VALUES 
    ('Online'), 
    -- Республикалық маңызы бар қалалар / Republican Cities
    ('Astana'), ('Almaty'), ('Shymkent'),
    -- Облыстар / Oblasts
    ('Abai_Region'), ('Akmola_Region'), ('Aktobe_Region'), ('Almaty_Region'), 
    ('Atyrau_Region'), ('East_Kazakhstan_Region'), ('Jambyl_Region'), ('Jetisu_Region'), 
    ('Karaganda_Region'), ('Kostanay_Region'), ('Kyzylorda_Region'), ('Mangystau_Region'), 
    ('North_Kazakhstan_Region'), ('Pavlodar_Region'), ('Turkestan_Region'), ('Ulytau_Region'), 
    ('West_Kazakhstan_Region'),
    -- Облыс орталықтары мен ірі қалалар / Regional Centers
    ('Semey'), ('Kokshetau'), ('Aktobe'), ('Konayev'), ('Atyrau'), 
    ('Oskemen'), ('Taraz'), ('Taldykorgan'), ('Karaganda'), ('Kostanay'), 
    ('Kyzylorda'), ('Aktau'), ('Petropavl'), ('Pavlodar'), ('Turkistan'), ('Jezkazgan'), ('Oral'),

    ('Alatau'), ('Temirtau'), ('Zhanaozen'), ('Ekibastuz'), ('Rudny'), 
    ('Kentau'), ('Kaskelen'), ('Arys'), ('Balkhash'), ('Aksu'), 
    ('Satbayev'), ('Kulsary'), ('Talgar'), ('Saryagash'), ('Kosshy'), 
    ('Zharkent'), ('Shu'), ('Zhetisay'), ('Shardara'), ('Zachagansk'), 
    ('Karabulak'), ('Beyneu'), ('Ayteke_Bi'), ('Uzynagash'), ('Mangystau_Locality'),

    -- Қырғызстан (ел, қалалар, облыстар, орталықтар)
    ('Kyrgyzstan'), ('Bishkek'), ('Osh'), 
    ('Chuy_Region'), ('Issyk_Kul_Region'), ('Jalal_Abad_Region'), ('Naryn_Region'), 
    ('Batken_Region'), ('Talas_Region'), ('Osh_Region'),
    ('Karakol'), ('Naryn_City'), ('Talas_City'), ('Jalal_Abad_City'), ('Batken_City'),
    ('Kyzyl_Kiya'), ('Balykchy'), ('Uzgen'), ('Kara_Suu'), ('Tokmok'),

    -- Өзбекстан (ел, Ташкент, Қарақалпақстан, облыстар)
    ('Uzbekistan'), ('Tashkent'), ('Karakalpakstan'), 
    ('Andijan_Region'), ('Bukhara_Region'), ('Fergana_Region'), ('Jizzakh_Region'), 
    ('Khorezm_Region'), ('Namangan_Region'), ('Navoiy_Region'), ('Kashkadarya_Region'), 
    ('Samarkand_Region'), ('Sirdaryo_Region'), ('Surkhandarya_Region'), ('Tashkent_Region'),

    -- Түркия (ел және миллионник қалалар)
    ('Turkey'), ('Ankara'), ('Istanbul'), ('Izmir'), ('Bursa'), ('Antalya'), ('Adana'), ('Konya'),

    -- Моңғолия
    ('Mongolia'), ('Bayan_Olgii_City'), ('Bayan_Olgii_Province'), ('Ulaanbaatar'), ('Khovd_Province'),

    -- Ресей
    ('Russia'), ('Moscow'), ('Saint_Petersburg'), ('Tatarstan'), ('Bashkortostan'),

    -- Чехия
    ('Czechia'), ('Prague'), ('Pardubice'),

    -- Колумбия және Оңтүстік Корея
    ('Colombia'), ('Bogota'), ('Cali'),
    ('South_Korea'), ('Seoul'),

    -- Басқа елдер
    ('USA'), ('UK'), ('France'), ('Spain'), ('Italy'), ('Brazil'), ('Argentina'), 
    ('Antigua_and_Barbuda'), ('Poland'), ('Latvia'), ('Hungary'), ('Romania'), 
    ('Ukraine'), ('Bulgaria'), ('Georgia'), ('Turkmenistan'), ('UAE'), ('Qatar'), 
    ('India'), ('Pakistan'), ('China'), ('Bangladesh'), ('Sri_Lanka'), 
    ('Uganda'), ('Zambia'), ('Nigeria'), ('Benin'), ('Ghana'), ('Ivory_Coast'),

    -- Макрорегиондар
    ('Caribbean'), ('Central_America'), ('South_America'), ('North_America'), 
    ('Europe'), ('West_Africa'), ('Africa'), ('Middle_East'), ('South_Asia'), 
    ('Southeast_Asia'), ('Oceania'), ('East_Asia'), ('Central_Asia');


-- Аудармалар (Translations for Locations in 7 languages)
INSERT INTO location_translations (location_id, lang_code, name) VALUES
    -- Online
    ('Online', 'ENG', 'Online'), ('Online', 'RUS', 'Онлайн'), ('Online', 'KAZ', 'Онлайн'),('Online', 'SPA', 'En línea'), ('Online', 'TUR', 'Çevrimiçi'), ('Online', 'KOR', '온라인'), ('Online', 'CZE', 'Online'),

    -- Республикалық қалалар (Cities)
    ('Astana', 'ENG', 'Astana'), ('Astana', 'RUS', 'Астана'), ('Astana', 'KAZ', 'Астана'),('Astana', 'SPA', 'Astaná'), ('Astana', 'TUR', 'Astana'), ('Astana', 'KOR', '아스타나'), ('Astana', 'CZE', 'Astana'),
    
    ('Almaty', 'ENG', 'Almaty'), ('Almaty', 'RUS', 'Алматы'), ('Almaty', 'KAZ', 'Алматы'),('Almaty', 'SPA', 'Almatý'), ('Almaty', 'TUR', 'Almatı'), ('Almaty', 'KOR', '알마티'), ('Almaty', 'CZE', 'Almaty'),
    
    ('Shymkent', 'ENG', 'Shymkent'), ('Shymkent', 'RUS', 'Шымкент'), ('Shymkent', 'KAZ', 'Шымкент'),('Shymkent', 'SPA', 'Shymkent'), ('Shymkent', 'TUR', 'Çimkent'), ('Shymkent', 'KOR', '쉼켄트'), ('Shymkent', 'CZE', 'Šymkent'),
    
    -- Қалалар / Cities
    ('Semey', 'ENG', 'Semey'), ('Semey', 'RUS', 'Семей'), ('Semey', 'KAZ', 'Семей'),('Semey', 'SPA', 'Semey'), ('Semey', 'TUR', 'Semey'), ('Semey', 'KOR', '세메이'), ('Semey', 'CZE', 'Semej'),

    ('Kokshetau', 'ENG', 'Kokshetau'), ('Kokshetau', 'RUS', 'Кокшетау'), ('Kokshetau', 'KAZ', 'Көкшетау'),('Kokshetau', 'SPA', 'Kokshetau'), ('Kokshetau', 'TUR', 'Kökşetav'), ('Kokshetau', 'KOR', '콕셰타우'), ('Kokshetau', 'CZE', 'Kokšetau'),

    ('Aktobe', 'ENG', 'Aktobe'), ('Aktobe', 'RUS', 'Актобе'), ('Aktobe', 'KAZ', 'Ақтөбе'),('Aktobe', 'SPA', 'Aktobe'), ('Aktobe', 'TUR', 'Aktöbe'), ('Aktobe', 'KOR', '악토베'), ('Aktobe', 'CZE', 'Aktobe'),

    ('Konayev', 'ENG', 'Konayev'), ('Konayev', 'RUS', 'Конаев'), ('Konayev', 'KAZ', 'Қонаев'),('Konayev', 'SPA', 'Konayev'), ('Konayev', 'TUR', 'Konayev'), ('Konayev', 'KOR', '코나예프'), ('Konayev', 'CZE', 'Konajev'),

    ('Atyrau', 'ENG', 'Atyrau'), ('Atyrau', 'RUS', 'Атырау'), ('Atyrau', 'KAZ', 'Атырау'),('Atyrau', 'SPA', 'Atyrau'), ('Atyrau', 'TUR', 'Atırav'), ('Atyrau', 'KOR', '아티라우'), ('Atyrau', 'CZE', 'Atyrau'),

    ('Oskemen', 'ENG', 'Oskemen'), ('Oskemen', 'RUS', 'Усть-Каменогорск'), ('Oskemen', 'KAZ', 'Өскемен'),('Oskemen', 'SPA', 'Oskemen'), ('Oskemen', 'TUR', 'Öskemen'), ('Oskemen', 'KOR', '외스케멘'), ('Oskemen', 'CZE', 'Oskemen'),

    ('Taraz', 'ENG', 'Taraz'), ('Taraz', 'RUS', 'Тараз'), ('Taraz', 'KAZ', 'Тараз'),('Taraz', 'SPA', 'Taraz'), ('Taraz', 'TUR', 'Taraz'), ('Taraz', 'KOR', '타라즈'), ('Taraz', 'CZE', 'Taraz'),

    ('Taldykorgan', 'ENG', 'Taldykorgan'), ('Taldykorgan', 'RUS', 'Талдыкорган'), ('Taldykorgan', 'KAZ', 'Талдықорған'),('Taldykorgan', 'SPA', 'Taldykorgan'), ('Taldykorgan', 'TUR', 'Taldıkorgan'), ('Taldykorgan', 'KOR', '탈디코르간'), ('Taldykorgan', 'CZE', 'Taldykorgan'),

    ('Karaganda', 'ENG', 'Karaganda'), ('Karaganda', 'RUS', 'Караганда'), ('Karaganda', 'KAZ', 'Қарағанды'),('Karaganda', 'SPA', 'Karagandá'), ('Karaganda', 'TUR', 'Karaganda'), ('Karaganda', 'KOR', '카라간다'), ('Karaganda', 'CZE', 'Karaganda'),

    ('Kostanay', 'ENG', 'Kostanay'), ('Kostanay', 'RUS', 'Костанай'), ('Kostanay', 'KAZ', 'Қостанай'),('Kostanay', 'SPA', 'Kostanay'), ('Kostanay', 'TUR', 'Kostanay'), ('Kostanay', 'KOR', '코스타나이'), ('Kostanay', 'CZE', 'Kostanaj'),

    ('Kyzylorda', 'ENG', 'Kyzylorda'), ('Kyzylorda', 'RUS', 'Кызылорда'), ('Kyzylorda', 'KAZ', 'Қызылорда'),('Kyzylorda', 'SPA', 'Kyzylorda'), ('Kyzylorda', 'TUR', 'Kızılorda'), ('Kyzylorda', 'KOR', '키질로르다'), ('Kyzylorda', 'CZE', 'Kyzylorda'),

    ('Aktau', 'ENG', 'Aktau'), ('Aktau', 'RUS', 'Актау'), ('Aktau', 'KAZ', 'Ақтау'),('Aktau', 'SPA', 'Aktau'), ('Aktau', 'TUR', 'Aktav'), ('Aktau', 'KOR', '악타우'), ('Aktau', 'CZE', 'Aktau'),

    ('Petropavl', 'ENG', 'Petropavl'), ('Petropavl', 'RUS', 'Петропавловск'), ('Petropavl', 'KAZ', 'Петропавл'),('Petropavl', 'SPA', 'Petropavl'), ('Petropavl', 'TUR', 'Petropavl'), ('Petropavl', 'KOR', '페트로파블'), ('Petropavl', 'CZE', 'Petropavl'),

    ('Pavlodar', 'ENG', 'Pavlodar'), ('Pavlodar', 'RUS', 'Павлодар'), ('Pavlodar', 'KAZ', 'Павлодар'),('Pavlodar', 'SPA', 'Pavlodar'), ('Pavlodar', 'TUR', 'Pavlodar'), ('Pavlodar', 'KOR', '파블로다르'), ('Pavlodar', 'CZE', 'Pavlodar'),

    ('Turkistan', 'ENG', 'Turkistan'), ('Turkistan', 'RUS', 'Туркестан'), ('Turkistan', 'KAZ', 'Түркістан'),('Turkistan', 'SPA', 'Turkestán'), ('Turkistan', 'TUR', 'Türkistan'), ('Turkistan', 'KOR', '투르키스탄'), ('Turkistan', 'CZE', 'Turkistán'),

    ('Jezkazgan', 'ENG', 'Jezkazgan'), ('Jezkazgan', 'RUS', 'Жезказган'), ('Jezkazgan', 'KAZ', 'Жезқазған'),('Jezkazgan', 'SPA', 'Jezkazgan'), ('Jezkazgan', 'TUR', 'Jezkazgan'), ('Jezkazgan', 'KOR', '제즈카즈간'), ('Jezkazgan', 'CZE', 'Džezkazgan'),

    ('Oral', 'ENG', 'Oral'), ('Oral', 'RUS', 'Уральск'), ('Oral', 'KAZ', 'Орал'),('Oral', 'SPA', 'Oral'), ('Oral', 'TUR', 'Oral'), ('Oral', 'KOR', '오랄'), ('Oral', 'CZE', 'Oral'),
    
    -- Облыстар / Oblasts
    ('Abai_Region', 'ENG', 'Abai Region'), ('Abai_Region', 'RUS', 'Абайская область'), ('Abai_Region', 'KAZ', 'Абай облысы'),('Abai_Region', 'SPA', 'Región de Abai'), ('Abai_Region', 'TUR', 'Abay Eyaleti'), ('Abai_Region', 'KOR', '아바이 주'), ('Abai_Region', 'CZE', 'Abajská oblast'),

    ('Akmola_Region', 'ENG', 'Akmola Region'), ('Akmola_Region', 'RUS', 'Акмолинская область'), ('Akmola_Region', 'KAZ', 'Ақмола облысы'),('Akmola_Region', 'SPA', 'Región de Akmola'), ('Akmola_Region', 'TUR', 'Akmola Eyaleti'), ('Akmola_Region', 'KOR', '아크몰라 주'), ('Akmola_Region', 'CZE', 'Akmolská oblast'),

    ('Aktobe_Region', 'ENG', 'Aktobe Region'), ('Aktobe_Region', 'RUS', 'Актюбинская область'), ('Aktobe_Region', 'KAZ', 'Ақтөбе облысы'),('Aktobe_Region', 'SPA', 'Región de Aktobe'), ('Aktobe_Region', 'TUR', 'Aktöbe Eyaleti'), ('Aktobe_Region', 'KOR', '악토베 주'), ('Aktobe_Region', 'CZE', 'Aktobská oblast'),

    ('Almaty_Region', 'ENG', 'Almaty Region'), ('Almaty_Region', 'RUS', 'Алматинская область'), ('Almaty_Region', 'KAZ', 'Алматы облысы'),('Almaty_Region', 'SPA', 'Región de Almaty'), ('Almaty_Region', 'TUR', 'Almatı Eyaleti'), ('Almaty_Region', 'KOR', '알마티 주'), ('Almaty_Region', 'CZE', 'Almatinská oblast'),

    ('Atyrau_Region', 'ENG', 'Atyrau Region'), ('Atyrau_Region', 'RUS', 'Атырауская область'), ('Atyrau_Region', 'KAZ', 'Атырау облысы'),('Atyrau_Region', 'SPA', 'Región de Atyrau'), ('Atyrau_Region', 'TUR', 'Atırav Eyaleti'), ('Atyrau_Region', 'KOR', '아티라우 주'), ('Atyrau_Region', 'CZE', 'Atyrauská oblast'),

    ('East_Kazakhstan_Region', 'ENG', 'East Kazakhstan Region'), ('East_Kazakhstan_Region', 'RUS', 'Восточно-Казахстанская область'), ('East_Kazakhstan_Region', 'KAZ', 'Шығыс Қазақстан облысы'),('East_Kazakhstan_Region', 'SPA', 'Kazajistán Oriental'), ('East_Kazakhstan_Region', 'TUR', 'Doğu Kazakistan Eyaleti'), ('East_Kazakhstan_Region', 'KOR', '동카자흐스탄 주'), ('East_Kazakhstan_Region', 'CZE', 'Východokazašská oblast'),

    ('Jambyl_Region', 'ENG', 'Jambyl Region'), ('Jambyl_Region', 'RUS', 'Жамбылская область'), ('Jambyl_Region', 'KAZ', 'Жамбыл облысы'),('Jambyl_Region', 'SPA', 'Región de Jambyl'), ('Jambyl_Region', 'TUR', 'Jambıl Eyaleti'), ('Jambyl_Region', 'KOR', '잠빌 주'), ('Jambyl_Region', 'CZE', 'Žambylská oblast'),

    ('Jetisu_Region', 'ENG', 'Jetisu Region'), ('Jetisu_Region', 'RUS', 'Область Жетысу'), ('Jetisu_Region', 'KAZ', 'Жетісу облысы'),('Jetisu_Region', 'SPA', 'Región de Jetisu'), ('Jetisu_Region', 'TUR', 'Jetisu Eyaleti'), ('Jetisu_Region', 'KOR', '제티수 주'), ('Jetisu_Region', 'CZE', 'Žetysuská oblast'),

    ('Karaganda_Region', 'ENG', 'Karaganda Region'), ('Karaganda_Region', 'RUS', 'Карагандинская область'), ('Karaganda_Region', 'KAZ', 'Қарағанды облысы'),('Karaganda_Region', 'SPA', 'Región de Karaganda'), ('Karaganda_Region', 'TUR', 'Karaganda Eyaleti'), ('Karaganda_Region', 'KOR', '카라간다 주'), ('Karaganda_Region', 'CZE', 'Karagandská oblast'),

    ('Kostanay_Region', 'ENG', 'Kostanay Region'), ('Kostanay_Region', 'RUS', 'Костанайская область'), ('Kostanay_Region', 'KAZ', 'Қостанай облысы'),('Kostanay_Region', 'SPA', 'Región de Kostanay'), ('Kostanay_Region', 'TUR', 'Kostanay Eyaleti'), ('Kostanay_Region', 'KOR', '코스타나이 주'), ('Kostanay_Region', 'CZE', 'Kostanajská oblast'),

    ('Kyzylorda_Region', 'ENG', 'Kyzylorda Region'), ('Kyzylorda_Region', 'RUS', 'Кызылординская область'), ('Kyzylorda_Region', 'KAZ', 'Қызылорда облысы'),('Kyzylorda_Region', 'SPA', 'Región de Kyzylorda'), ('Kyzylorda_Region', 'TUR', 'Kızılorda Eyaleti'), ('Kyzylorda_Region', 'KOR', '키질로르다 주'), ('Kyzylorda_Region', 'CZE', 'Kyzylordská oblast'),

    ('Mangystau_Region', 'ENG', 'Mangystau Region'), ('Mangystau_Region', 'RUS', 'Мангистауская область'), ('Mangystau_Region', 'KAZ', 'Маңғыстау облысы'),('Mangystau_Region', 'SPA', 'Región de Mangystau'), ('Mangystau_Region', 'TUR', 'Mangıstav Eyaleti'), ('Mangystau_Region', 'KOR', '망기스타우 주'), ('Mangystau_Region', 'CZE', 'Mangystauská oblast'),

    ('North_Kazakhstan_Region', 'ENG', 'North Kazakhstan Region'), ('North_Kazakhstan_Region', 'RUS', 'Северо-Казахстанская область'), ('North_Kazakhstan_Region', 'KAZ', 'Солтүстік Қазақстан облысы'),('North_Kazakhstan_Region', 'SPA', 'Kazajistán Septentrional'), ('North_Kazakhstan_Region', 'TUR', 'Kuzey Kazakistan Eyaleti'), ('North_Kazakhstan_Region', 'KOR', '북카자흐스탄 주'), ('North_Kazakhstan_Region', 'CZE', 'Severokazašská oblast'),

    ('Pavlodar_Region', 'ENG', 'Pavlodar Region'), ('Pavlodar_Region', 'RUS', 'Павлодарская область'), ('Pavlodar_Region', 'KAZ', 'Павлодар облысы'),('Pavlodar_Region', 'SPA', 'Región de Pavlodar'), ('Pavlodar_Region', 'TUR', 'Pavlodar Eyaleti'), ('Pavlodar_Region', 'KOR', '파블로다르 주'), ('Pavlodar_Region', 'CZE', 'Pavlodarská oblast'),

    ('Turkestan_Region', 'ENG', 'Turkestan Region'), ('Turkestan_Region', 'RUS', 'Туркестанская область'), ('Turkestan_Region', 'KAZ', 'Түркістан облысы'),('Turkestan_Region', 'SPA', 'Región de Turkestán'), ('Turkestan_Region', 'TUR', 'Türkistan Eyaleti'), ('Turkestan_Region', 'KOR', '투르키스탄 주'), ('Turkestan_Region', 'CZE', 'Turkestánská oblast'),

    ('Ulytau_Region', 'ENG', 'Ulytau Region'), ('Ulytau_Region', 'RUS', 'Область Улытау'), ('Ulytau_Region', 'KAZ', 'Ұлытау облысы'),('Ulytau_Region', 'SPA', 'Región de Ulytau'), ('Ulytau_Region', 'TUR', 'Ulıtav Eyaleti'), ('Ulytau_Region', 'KOR', '율리타우 주'), ('Ulytau_Region', 'CZE', 'Ulytauská oblast'),

    ('West_Kazakhstan_Region', 'ENG', 'West Kazakhstan Region'), ('West_Kazakhstan_Region', 'RUS', 'Западно-Казахстанская область'), ('West_Kazakhstan_Region', 'KAZ', 'Батыс Қазақстан облысы'),('West_Kazakhstan_Region', 'SPA', 'Kazajistán Occidental'), ('West_Kazakhstan_Region', 'TUR', 'Batı Kazakistan Eyaleti'), ('West_Kazakhstan_Region', 'KOR', '서카자흐스탄 주'), ('West_Kazakhstan_Region', 'CZE', 'Západokazašská oblast'),

    -- ==================== ҚАЗАҚСТАН (Жаңа қалалар) ====================
    ('Alatau', 'ENG', 'Alatau'), ('Alatau', 'RUS', 'Алатау'), ('Alatau', 'KAZ', 'Алатау'), ('Alatau', 'SPA', 'Alatau'), ('Alatau', 'TUR', 'Alatau'), ('Alatau', 'KOR', '알라타우'), ('Alatau', 'CZE', 'Alatau'),
    ('Temirtau', 'ENG', 'Temirtau'), ('Temirtau', 'RUS', 'Темиртау'), ('Temirtau', 'KAZ', 'Теміртау'), ('Temirtau', 'SPA', 'Temirtau'), ('Temirtau', 'TUR', 'Temirtav'), ('Temirtau', 'KOR', '테미르타우'), ('Temirtau', 'CZE', 'Temirtau'),
    ('Zhanaozen', 'ENG', 'Zhanaozen'), ('Zhanaozen', 'RUS', 'Жанаозен'), ('Zhanaozen', 'KAZ', 'Жаңаөзен'), ('Zhanaozen', 'SPA', 'Zhanaozen'), ('Zhanaozen', 'TUR', 'Janaözen'), ('Zhanaozen', 'KOR', '자나오젠'), ('Zhanaozen', 'CZE', 'Žanaozen'),
    ('Ekibastuz', 'ENG', 'Ekibastuz'), ('Ekibastuz', 'RUS', 'Экибастуз'), ('Ekibastuz', 'KAZ', 'Екібастұз'), ('Ekibastuz', 'SPA', 'Ekibastuz'), ('Ekibastuz', 'TUR', 'Ekibastuz'), ('Ekibastuz', 'KOR', '에키바스투즈'), ('Ekibastuz', 'CZE', 'Ekibastuz'),
    ('Rudny', 'ENG', 'Rudny'), ('Rudny', 'RUS', 'Рудный'), ('Rudny', 'KAZ', 'Рудный'), ('Rudny', 'SPA', 'Rudny'), ('Rudny', 'TUR', 'Rudnıy'), ('Rudny', 'KOR', '루드니'), ('Rudny', 'CZE', 'Rudnyj'),
    ('Kentau', 'ENG', 'Kentau'), ('Kentau', 'RUS', 'Кентау'), ('Kentau', 'KAZ', 'Кентау'), ('Kentau', 'SPA', 'Kentau'), ('Kentau', 'TUR', 'Kentav'), ('Kentau', 'KOR', '켄타우'), ('Kentau', 'CZE', 'Kentau'),
    ('Kaskelen', 'ENG', 'Kaskelen'), ('Kaskelen', 'RUS', 'Каскелен'), ('Kaskelen', 'KAZ', 'Қаскелең'), ('Kaskelen', 'SPA', 'Kaskelen'), ('Kaskelen', 'TUR', 'Kaskelen'), ('Kaskelen', 'KOR', '카스켈렌'), ('Kaskelen', 'CZE', 'Kaskelen'),
    ('Arys', 'ENG', 'Arys'), ('Arys', 'RUS', 'Арысь'), ('Arys', 'KAZ', 'Арыс'), ('Arys', 'SPA', 'Arys'), ('Arys', 'TUR', 'Arıs'), ('Arys', 'KOR', '아리스'), ('Arys', 'CZE', 'Arys'),
    ('Balkhash', 'ENG', 'Balkhash'), ('Balkhash', 'RUS', 'Балхаш'), ('Balkhash', 'KAZ', 'Балқаш'), ('Balkhash', 'SPA', 'Balkhash'), ('Balkhash', 'TUR', 'Balhaş'), ('Balkhash', 'KOR', '발하시'), ('Balkhash', 'CZE', 'Balchaš'),
    ('Aksu', 'ENG', 'Aksu'), ('Aksu', 'RUS', 'Аксу'), ('Aksu', 'KAZ', 'Ақсу'), ('Aksu', 'SPA', 'Aksu'), ('Aksu', 'TUR', 'Aksu'), ('Aksu', 'KOR', '악수'), ('Aksu', 'CZE', 'Aksu'),
    ('Satbayev', 'ENG', 'Satbayev'), ('Satbayev', 'RUS', 'Сатпаев'), ('Satbayev', 'KAZ', 'Сәтпаев'), ('Satbayev', 'SPA', 'Satbayev'), ('Satbayev', 'TUR', 'Satbayev'), ('Satbayev', 'KOR', '삿파예프'), ('Satbayev', 'CZE', 'Satpajev'),
    ('Kulsary', 'ENG', 'Kulsary'), ('Kulsary', 'RUS', 'Кульсары'), ('Kulsary', 'KAZ', 'Құлсары'), ('Kulsary', 'SPA', 'Kulsary'), ('Kulsary', 'TUR', 'Kulsarı'), ('Kulsary', 'KOR', '쿨사리'), ('Kulsary', 'CZE', 'Kulsary'),
    ('Talgar', 'ENG', 'Talgar'), ('Talgar', 'RUS', 'Талгар'), ('Talgar', 'KAZ', 'Талғар'), ('Talgar', 'SPA', 'Talgar'), ('Talgar', 'TUR', 'Talgar'), ('Talgar', 'KOR', '탈가르'), ('Talgar', 'CZE', 'Talgar'),
    ('Saryagash', 'ENG', 'Saryagash'), ('Saryagash', 'RUS', 'Сарыагаш'), ('Saryagash', 'KAZ', 'Сарыағаш'), ('Saryagash', 'SPA', 'Saryagash'), ('Saryagash', 'TUR', 'Sarıağaş'), ('Saryagash', 'KOR', '사리아가시'), ('Saryagash', 'CZE', 'Saryagaš'),
    ('Kosshy', 'ENG', 'Kosshy'), ('Kosshy', 'RUS', 'Косшы'), ('Kosshy', 'KAZ', 'Қосшы'), ('Kosshy', 'SPA', 'Kosshy'), ('Kosshy', 'TUR', 'Kosşı'), ('Kosshy', 'KOR', '코스시'), ('Kosshy', 'CZE', 'Koššy'),
    ('Zharkent', 'ENG', 'Zharkent'), ('Zharkent', 'RUS', 'Жаркент'), ('Zharkent', 'KAZ', 'Жаркент'), ('Zharkent', 'SPA', 'Zharkent'), ('Zharkent', 'TUR', 'Carkent'), ('Zharkent', 'KOR', '자르켄트'), ('Zharkent', 'CZE', 'Žarkent'),
    ('Shu', 'ENG', 'Shu'), ('Shu', 'RUS', 'Шу'), ('Shu', 'KAZ', 'Шу'), ('Shu', 'SPA', 'Shu'), ('Shu', 'TUR', 'Şu'), ('Shu', 'KOR', '슈'), ('Shu', 'CZE', 'Šu'),
    ('Zhetisay', 'ENG', 'Zhetisay'), ('Zhetisay', 'RUS', 'Жетысай'), ('Zhetisay', 'KAZ', 'Жетісай'), ('Zhetisay', 'SPA', 'Zhetisay'), ('Zhetisay', 'TUR', 'Jetisay'), ('Zhetisay', 'KOR', '제티사이'), ('Zhetisay', 'CZE', 'Žetysaj'),
    ('Shardara', 'ENG', 'Shardara'), ('Shardara', 'RUS', 'Шардара'), ('Shardara', 'KAZ', 'Шардара'), ('Shardara', 'SPA', 'Shardara'), ('Shardara', 'TUR', 'Şardara'), ('Shardara', 'KOR', '샤르다라'), ('Shardara', 'CZE', 'Šardara'),
    ('Zachagansk', 'ENG', 'Zachagansk'), ('Zachagansk', 'RUS', 'Зачаганск'), ('Zachagansk', 'KAZ', 'Зачаганск'), ('Zachagansk', 'SPA', 'Zachagansk'), ('Zachagansk', 'TUR', 'Zaçagansk'), ('Zachagansk', 'KOR', '자차간스크'), ('Zachagansk', 'CZE', 'Začagansk'),
    ('Karabulak', 'ENG', 'Karabulak'), ('Karabulak', 'RUS', 'Карабулак'), ('Karabulak', 'KAZ', 'Қарабұлақ'), ('Karabulak', 'SPA', 'Karabulak'), ('Karabulak', 'TUR', 'Karabulak'), ('Karabulak', 'KOR', '카라불라크'), ('Karabulak', 'CZE', 'Karabulak'),
    ('Beyneu', 'ENG', 'Beyneu'), ('Beyneu', 'RUS', 'Бейнеу'), ('Beyneu', 'KAZ', 'Бейнеу'), ('Beyneu', 'SPA', 'Beyneu'), ('Beyneu', 'TUR', 'Beynev'), ('Beyneu', 'KOR', '베이네우'), ('Beyneu', 'CZE', 'Bejneu'),
    ('Ayteke_Bi', 'ENG', 'Ayteke Bi'), ('Ayteke_Bi', 'RUS', 'Айтеке-Би'), ('Ayteke_Bi', 'KAZ', 'Әйтеке би'), ('Ayteke_Bi', 'SPA', 'Ayteke Bi'), ('Ayteke_Bi', 'TUR', 'Ayteke Bi'), ('Ayteke_Bi', 'KOR', '아이테케 비'), ('Ayteke_Bi', 'CZE', 'Ajteke Bi'),
    ('Uzynagash', 'ENG', 'Uzynagash'), ('Uzynagash', 'RUS', 'Узынагаш'), ('Uzynagash', 'KAZ', 'Ұзынағаш'), ('Uzynagash', 'SPA', 'Uzynagash'), ('Uzynagash', 'TUR', 'Uzınağaş'), ('Uzynagash', 'KOR', '우지나가시'), ('Uzynagash', 'CZE', 'Uzynagaš'),
    ('Mangystau_Locality', 'ENG', 'Mangystau (village)'), ('Mangystau_Locality', 'RUS', 'Мангистау (село)'), ('Mangystau_Locality', 'KAZ', 'Маңғыстау (ауыл)'), ('Mangystau_Locality', 'SPA', 'Mangystau (pueblo)'), ('Mangystau_Locality', 'TUR', 'Mangıstav (Köy)'), ('Mangystau_Locality', 'KOR', '망기스타우 (마을)'), ('Mangystau_Locality', 'CZE', 'Mangystau (vesnice)'),

    -- ==================== ҚЫРҒЫЗСТАН ====================
    ('Kyrgyzstan', 'ENG', 'Kyrgyzstan'), ('Kyrgyzstan', 'RUS', 'Кыргызстан'), ('Kyrgyzstan', 'KAZ', 'Қырғызстан'), ('Kyrgyzstan', 'SPA', 'Kirguistán'), ('Kyrgyzstan', 'TUR', 'Kırgızistan'), ('Kyrgyzstan', 'KOR', '키르기스스탄'), ('Kyrgyzstan', 'CZE', 'Kyrgyzstán'),
    ('Bishkek', 'ENG', 'Bishkek'), ('Bishkek', 'RUS', 'Бишкек'), ('Bishkek', 'KAZ', 'Бішкек'), ('Bishkek', 'SPA', 'Biskek'), ('Bishkek', 'TUR', 'Bişkek'), ('Bishkek', 'KOR', '비슈케크'), ('Bishkek', 'CZE', 'Biškek'),
    ('Osh', 'ENG', 'Osh'), ('Osh', 'RUS', 'Ош'), ('Osh', 'KAZ', 'Ош'), ('Osh', 'SPA', 'Osh'), ('Osh', 'TUR', 'Oş'), ('Osh', 'KOR', '오시'), ('Osh', 'CZE', 'Oš'),
    
    ('Chuy_Region', 'ENG', 'Chuy Region'), ('Chuy_Region', 'RUS', 'Чуйская область'), ('Chuy_Region', 'KAZ', 'Шу облысы'), ('Chuy_Region', 'SPA', 'Región de Chuy'), ('Chuy_Region', 'TUR', 'Çuy İli'), ('Chuy_Region', 'KOR', '추이 주'), ('Chuy_Region', 'CZE', 'Čujská oblast'),
    ('Issyk_Kul_Region', 'ENG', 'Issyk-Kul Region'), ('Issyk_Kul_Region', 'RUS', 'Иссык-Кульская область'), ('Issyk_Kul_Region', 'KAZ', 'Ыстықкөл облысы'), ('Issyk_Kul_Region', 'SPA', 'Región de Issyk-Kul'), ('Issyk_Kul_Region', 'TUR', 'Issık-Göl İli'), ('Issyk_Kul_Region', 'KOR', '이식쿨 주'), ('Issyk_Kul_Region', 'CZE', 'Issykkulská oblast'),
    ('Jalal_Abad_Region', 'ENG', 'Jalal-Abad Region'), ('Jalal_Abad_Region', 'RUS', 'Джалал-Абадская область'), ('Jalal_Abad_Region', 'KAZ', 'Жалалабат облысы'), ('Jalal_Abad_Region', 'SPA', 'Región de Jalal-Abad'), ('Jalal_Abad_Region', 'TUR', 'Celal-Abad İli'), ('Jalal_Abad_Region', 'KOR', '잘랄아바트 주'), ('Jalal_Abad_Region', 'CZE', 'Džalalabádská oblast'),
    ('Naryn_Region', 'ENG', 'Naryn Region'), ('Naryn_Region', 'RUS', 'Нарынская область'), ('Naryn_Region', 'KAZ', 'Нарын облысы'), ('Naryn_Region', 'SPA', 'Región de Naryn'), ('Naryn_Region', 'TUR', 'Narın İli'), ('Naryn_Region', 'KOR', '나린 주'), ('Naryn_Region', 'CZE', 'Narynská oblast'),
    ('Batken_Region', 'ENG', 'Batken Region'), ('Batken_Region', 'RUS', 'Баткенская область'), ('Batken_Region', 'KAZ', 'Баткен облысы'), ('Batken_Region', 'SPA', 'Región de Batken'), ('Batken_Region', 'TUR', 'Batken İli'), ('Batken_Region', 'KOR', '바트켄 주'), ('Batken_Region', 'CZE', 'Batkenská oblast'),
    ('Talas_Region', 'ENG', 'Talas Region'), ('Talas_Region', 'RUS', 'Таласская область'), ('Talas_Region', 'KAZ', 'Талас облысы'), ('Talas_Region', 'SPA', 'Región de Talas'), ('Talas_Region', 'TUR', 'Talas İli'), ('Talas_Region', 'KOR', '탈라스 주'), ('Talas_Region', 'CZE', 'Talaská oblast'),
    ('Osh_Region', 'ENG', 'Osh Region'), ('Osh_Region', 'RUS', 'Ошская область'), ('Osh_Region', 'KAZ', 'Ош облысы'), ('Osh_Region', 'SPA', 'Región de Osh'), ('Osh_Region', 'TUR', 'Oş İli'), ('Osh_Region', 'KOR', '오시 주'), ('Osh_Region', 'CZE', 'Ošská oblast'),

    ('Karakol', 'ENG', 'Karakol'), ('Karakol', 'RUS', 'Каракол'), ('Karakol', 'KAZ', 'Қарақол'), ('Karakol', 'SPA', 'Karakol'), ('Karakol', 'TUR', 'Karakol'), ('Karakol', 'KOR', '카라콜'), ('Karakol', 'CZE', 'Karakol'),
    ('Naryn_City', 'ENG', 'Naryn'), ('Naryn_City', 'RUS', 'Нарын'), ('Naryn_City', 'KAZ', 'Нарын'), ('Naryn_City', 'SPA', 'Naryn'), ('Naryn_City', 'TUR', 'Narın'), ('Naryn_City', 'KOR', '나린'), ('Naryn_City', 'CZE', 'Naryn'),
    ('Talas_City', 'ENG', 'Talas'), ('Talas_City', 'RUS', 'Талас'), ('Talas_City', 'KAZ', 'Талас'), ('Talas_City', 'SPA', 'Talas'), ('Talas_City', 'TUR', 'Talas'), ('Talas_City', 'KOR', '탈라스'), ('Talas_City', 'CZE', 'Talas'),
    ('Jalal_Abad_City', 'ENG', 'Jalal-Abad'), ('Jalal_Abad_City', 'RUS', 'Джалал-Абад'), ('Jalal_Abad_City', 'KAZ', 'Жалалабат'), ('Jalal_Abad_City', 'SPA', 'Jalal-Abad'), ('Jalal_Abad_City', 'TUR', 'Celal-Abad'), ('Jalal_Abad_City', 'KOR', '잘랄아바트'), ('Jalal_Abad_City', 'CZE', 'Džalalabád'),
    ('Batken_City', 'ENG', 'Batken'), ('Batken_City', 'RUS', 'Баткен'), ('Batken_City', 'KAZ', 'Баткен'), ('Batken_City', 'SPA', 'Batken'), ('Batken_City', 'TUR', 'Batken'), ('Batken_City', 'KOR', '바트켄'), ('Batken_City', 'CZE', 'Batken'),
    
    ('Kyzyl_Kiya', 'ENG', 'Kyzyl-Kiya'), ('Kyzyl_Kiya', 'RUS', 'Кызыл-Кия'), ('Kyzyl_Kiya', 'KAZ', 'Қызылқия'), ('Kyzyl_Kiya', 'SPA', 'Kyzyl-Kiya'), ('Kyzyl_Kiya', 'TUR', 'Kızıl-Kıya'), ('Kyzyl_Kiya', 'KOR', '키질키야'), ('Kyzyl_Kiya', 'CZE', 'Kyzyl-Kija'),
    ('Balykchy', 'ENG', 'Balykchy'), ('Balykchy', 'RUS', 'Балыкчы'), ('Balykchy', 'KAZ', 'Балықшы'), ('Balykchy', 'SPA', 'Balykchy'), ('Balykchy', 'TUR', 'Balıkçı'), ('Balykchy', 'KOR', '발리크치'), ('Balykchy', 'CZE', 'Balykčy'),
    ('Uzgen', 'ENG', 'Uzgen'), ('Uzgen', 'RUS', 'Узген'), ('Uzgen', 'KAZ', 'Өзген'), ('Uzgen', 'SPA', 'Uzgen'), ('Uzgen', 'TUR', 'Özgen'), ('Uzgen', 'KOR', '우즈겐'), ('Uzgen', 'CZE', 'Uzgen'),
    ('Kara_Suu', 'ENG', 'Kara-Suu'), ('Kara_Suu', 'RUS', 'Кара-Суу'), ('Kara_Suu', 'KAZ', 'Қарасу'), ('Kara_Suu', 'SPA', 'Kara-Suu'), ('Kara_Suu', 'TUR', 'Kara-Suv'), ('Kara_Suu', 'KOR', '카라수'), ('Kara_Suu', 'CZE', 'Kara-Suu'),
    ('Tokmok', 'ENG', 'Tokmok'), ('Tokmok', 'RUS', 'Токмак'), ('Tokmok', 'KAZ', 'Тоқмақ'), ('Tokmok', 'SPA', 'Tokmok'), ('Tokmok', 'TUR', 'Tokmok'), ('Tokmok', 'KOR', '토크모크'), ('Tokmok', 'CZE', 'Tokmok'),

    -- ==================== ӨЗБЕКСТАН ====================
    ('Uzbekistan', 'ENG', 'Uzbekistan'), ('Uzbekistan', 'RUS', 'Узбекистан'), ('Uzbekistan', 'KAZ', 'Өзбекстан'), ('Uzbekistan', 'SPA', 'Uzbekistán'), ('Uzbekistan', 'TUR', 'Özbekistan'), ('Uzbekistan', 'KOR', '우즈베키스탄'), ('Uzbekistan', 'CZE', 'Uzbekistán'),
    ('Tashkent', 'ENG', 'Tashkent'), ('Tashkent', 'RUS', 'Ташкент'), ('Tashkent', 'KAZ', 'Ташкент'), ('Tashkent', 'SPA', 'Taskent'), ('Tashkent', 'TUR', 'Taşkent'), ('Tashkent', 'KOR', '타슈켄트'), ('Tashkent', 'CZE', 'Taškent'),
    ('Karakalpakstan', 'ENG', 'Karakalpakstan'), ('Karakalpakstan', 'RUS', 'Каракалпакстан'), ('Karakalpakstan', 'KAZ', 'Қарақалпақстан'), ('Karakalpakstan', 'SPA', 'Karakalpakistán'), ('Karakalpakstan', 'TUR', 'Karakalpakistan'), ('Karakalpakstan', 'KOR', '카라칼팍스탄'), ('Karakalpakstan', 'CZE', 'Karakalpakstán'),
    
    ('Andijan_Region', 'ENG', 'Andijan Region'), ('Andijan_Region', 'RUS', 'Андижанская область'), ('Andijan_Region', 'KAZ', 'Әндіжан облысы'), ('Andijan_Region', 'SPA', 'Región de Andiyán'), ('Andijan_Region', 'TUR', 'Andican İli'), ('Andijan_Region', 'KOR', '안디잔 주'), ('Andijan_Region', 'CZE', 'Andižanská oblast'),
    ('Bukhara_Region', 'ENG', 'Bukhara Region'), ('Bukhara_Region', 'RUS', 'Бухарская область'), ('Bukhara_Region', 'KAZ', 'Бұхара облысы'), ('Bukhara_Region', 'SPA', 'Región de Buxoro'), ('Bukhara_Region', 'TUR', 'Buhara İli'), ('Bukhara_Region', 'KOR', '부하라 주'), ('Bukhara_Region', 'CZE', 'Bucharská oblast'),
    ('Fergana_Region', 'ENG', 'Fergana Region'), ('Fergana_Region', 'RUS', 'Ферганская область'), ('Fergana_Region', 'KAZ', 'Ферғана облысы'), ('Fergana_Region', 'SPA', 'Región de Ferganá'), ('Fergana_Region', 'TUR', 'Fergana İli'), ('Fergana_Region', 'KOR', '페르가나 주'), ('Fergana_Region', 'CZE', 'Ferganská oblast'),
    ('Jizzakh_Region', 'ENG', 'Jizzakh Region'), ('Jizzakh_Region', 'RUS', 'Джизакская область'), ('Jizzakh_Region', 'KAZ', 'Жызақ облысы'), ('Jizzakh_Region', 'SPA', 'Región de Jizzax'), ('Jizzakh_Region', 'TUR', 'Cizzah İli'), ('Jizzakh_Region', 'KOR', '지자흐 주'), ('Jizzakh_Region', 'CZE', 'Džizzacká oblast'),
    ('Khorezm_Region', 'ENG', 'Khorezm Region'), ('Khorezm_Region', 'RUS', 'Хорезмская область'), ('Khorezm_Region', 'KAZ', 'Хорезм облысы'), ('Khorezm_Region', 'SPA', 'Región de Corasmia'), ('Khorezm_Region', 'TUR', 'Harezm İli'), ('Khorezm_Region', 'KOR', '호레즘 주'), ('Khorezm_Region', 'CZE', 'Chorezmská oblast'),
    ('Namangan_Region', 'ENG', 'Namangan Region'), ('Namangan_Region', 'RUS', 'Наманганская область'), ('Namangan_Region', 'KAZ', 'Наманған облысы'), ('Namangan_Region', 'SPA', 'Región de Namangán'), ('Namangan_Region', 'TUR', 'Namangan İli'), ('Namangan_Region', 'KOR', '나망간 주'), ('Namangan_Region', 'CZE', 'Namanganská oblast'),
    ('Navoiy_Region', 'ENG', 'Navoiy Region'), ('Navoiy_Region', 'RUS', 'Навоийская область'), ('Navoiy_Region', 'KAZ', 'Науаи облысы'), ('Navoiy_Region', 'SPA', 'Región de Navoiy'), ('Navoiy_Region', 'TUR', 'Navoi İli'), ('Navoiy_Region', 'KOR', '나보이 주'), ('Navoiy_Region', 'CZE', 'Navoijská oblast'),
    ('Kashkadarya_Region', 'ENG', 'Kashkadarya Region'), ('Kashkadarya_Region', 'RUS', 'Кашкадарьинская область'), ('Kashkadarya_Region', 'KAZ', 'Қашқадарья облысы'), ('Kashkadarya_Region', 'SPA', 'Región de Qashqadaryo'), ('Kashkadarya_Region', 'TUR', 'Kaşkaderya İli'), ('Kashkadarya_Region', 'KOR', '카슈카다리야 주'), ('Kashkadarya_Region', 'CZE', 'Kaškadarjinská oblast'),
    ('Samarkand_Region', 'ENG', 'Samarkand Region'), ('Samarkand_Region', 'RUS', 'Самаркандская область'), ('Samarkand_Region', 'KAZ', 'Самарқан облысы'), ('Samarkand_Region', 'SPA', 'Región de Samarcanda'), ('Samarkand_Region', 'TUR', 'Semerkant İli'), ('Samarkand_Region', 'KOR', '사마르칸트 주'), ('Samarkand_Region', 'CZE', 'Samarkandská oblast'),
    ('Sirdaryo_Region', 'ENG', 'Sirdaryo Region'), ('Sirdaryo_Region', 'RUS', 'Сырдарьинская область'), ('Sirdaryo_Region', 'KAZ', 'Сырдария облысы'), ('Sirdaryo_Region', 'SPA', 'Región de Sirdaryo'), ('Sirdaryo_Region', 'TUR', 'Sirderya İli'), ('Sirdaryo_Region', 'KOR', '시르다리야 주'), ('Sirdaryo_Region', 'CZE', 'Syrdarjinská oblast'),
    ('Surkhandarya_Region', 'ENG', 'Surkhandarya Region'), ('Surkhandarya_Region', 'RUS', 'Сурхандарьинская область'), ('Surkhandarya_Region', 'KAZ', 'Сұрхандария облысы'), ('Surkhandarya_Region', 'SPA', 'Región de Surxondaryo'), ('Surkhandarya_Region', 'TUR', 'Surhanderya İli'), ('Surkhandarya_Region', 'KOR', '수르한다리야 주'), ('Surkhandarya_Region', 'CZE', 'Surchandarjinská oblast'),
    ('Tashkent_Region', 'ENG', 'Tashkent Region'), ('Tashkent_Region', 'RUS', 'Ташкентская область'), ('Tashkent_Region', 'KAZ', 'Ташкент облысы'), ('Tashkent_Region', 'SPA', 'Región de Taskent'), ('Tashkent_Region', 'TUR', 'Taşkent İli'), ('Tashkent_Region', 'KOR', '타슈켄트 주'), ('Tashkent_Region', 'CZE', 'Taškentská oblast'),

    -- ==================== ТҮРКИЯ ====================
    ('Turkey', 'ENG', 'Turkey'), ('Turkey', 'RUS', 'Турция'), ('Turkey', 'KAZ', 'Түркия'), ('Turkey', 'SPA', 'Turquía'), ('Turkey', 'TUR', 'Türkiye'), ('Turkey', 'KOR', '튀르키예'), ('Turkey', 'CZE', 'Turecko'),
    ('Ankara', 'ENG', 'Ankara'), ('Ankara', 'RUS', 'Анкара'), ('Ankara', 'KAZ', 'Анкара'), ('Ankara', 'SPA', 'Ankara'), ('Ankara', 'TUR', 'Ankara'), ('Ankara', 'KOR', '앙카라'), ('Ankara', 'CZE', 'Ankara'),
    ('Istanbul', 'ENG', 'Istanbul'), ('Istanbul', 'RUS', 'Стамбул'), ('Istanbul', 'KAZ', 'Ыстамбұл'), ('Istanbul', 'SPA', 'Estambul'), ('Istanbul', 'TUR', 'İstanbul'), ('Istanbul', 'KOR', '이스탄불'), ('Istanbul', 'CZE', 'Istanbul'),
    ('Izmir', 'ENG', 'Izmir'), ('Izmir', 'RUS', 'Измир'), ('Izmir', 'KAZ', 'Измир'), ('Izmir', 'SPA', 'Esmirna'), ('Izmir', 'TUR', 'İzmir'), ('Izmir', 'KOR', '이즈미르'), ('Izmir', 'CZE', 'Izmir'),
    ('Bursa', 'ENG', 'Bursa'), ('Bursa', 'RUS', 'Бурса'), ('Bursa', 'KAZ', 'Бурса'), ('Bursa', 'SPA', 'Bursa'), ('Bursa', 'TUR', 'Bursa'), ('Bursa', 'KOR', '부르사'), ('Bursa', 'CZE', 'Bursa'),
    ('Antalya', 'ENG', 'Antalya'), ('Antalya', 'RUS', 'Анталья'), ('Antalya', 'KAZ', 'Анталия'), ('Antalya', 'SPA', 'Antalya'), ('Antalya', 'TUR', 'Antalya'), ('Antalya', 'KOR', '안탈리아'), ('Antalya', 'CZE', 'Antalya'),
    ('Adana', 'ENG', 'Adana'), ('Adana', 'RUS', 'Адана'), ('Adana', 'KAZ', 'Адана'), ('Adana', 'SPA', 'Adana'), ('Adana', 'TUR', 'Adana'), ('Adana', 'KOR', '아다나'), ('Adana', 'CZE', 'Adana'),
    ('Konya', 'ENG', 'Konya'), ('Konya', 'RUS', 'Конья'), ('Konya', 'KAZ', 'Кония'), ('Konya', 'SPA', 'Konya'), ('Konya', 'TUR', 'Konya'), ('Konya', 'KOR', '콘야'), ('Konya', 'CZE', 'Konya'),

    -- ==================== МОҢҒОЛИЯ ====================
    ('Mongolia', 'ENG', 'Mongolia'), ('Mongolia', 'RUS', 'Монголия'), ('Mongolia', 'KAZ', 'Моңғолия'), ('Mongolia', 'SPA', 'Mongolia'), ('Mongolia', 'TUR', 'Moğolistan'), ('Mongolia', 'KOR', '몽골'), ('Mongolia', 'CZE', 'Mongolsko'),
    ('Bayan_Olgii_City', 'ENG', 'Bayan-Olgii (city)'), ('Bayan_Olgii_City', 'RUS', 'Баян-Улгий (город)'), ('Bayan_Olgii_City', 'KAZ', 'Баян-Өлгий (қала)'), ('Bayan_Olgii_City', 'SPA', 'Bayan-Ölgii (ciudad)'), ('Bayan_Olgii_City', 'TUR', 'Bayan-Ölgiy (Şehir)'), ('Bayan_Olgii_City', 'KOR', '바얀올기 (도시)'), ('Bayan_Olgii_City', 'CZE', 'Bajan-Ölgij (město)'),
    ('Bayan_Olgii_Province', 'ENG', 'Bayan-Olgii Province'), ('Bayan_Olgii_Province', 'RUS', 'Баян-Улгийский аймак'), ('Bayan_Olgii_Province', 'KAZ', 'Баян-Өлгий аймағы'), ('Bayan_Olgii_Province', 'SPA', 'Provincia de Bayan-Ölgii'), ('Bayan_Olgii_Province', 'TUR', 'Bayan-Ölgiy İli'), ('Bayan_Olgii_Province', 'KOR', '바얀올기 주'), ('Bayan_Olgii_Province', 'CZE', 'Bajanölgijský ajmag'),
    ('Ulaanbaatar', 'ENG', 'Ulaanbaatar'), ('Ulaanbaatar', 'RUS', 'Улан-Батор'), ('Ulaanbaatar', 'KAZ', 'Ұлан-Батыр'), ('Ulaanbaatar', 'SPA', 'Ulán Bator'), ('Ulaanbaatar', 'TUR', 'Ulan Batur'), ('Ulaanbaatar', 'KOR', '울란바토르'), ('Ulaanbaatar', 'CZE', 'Ulánbátar'),
    ('Khovd_Province', 'ENG', 'Khovd Province'), ('Khovd_Province', 'RUS', 'Ховдский аймак'), ('Khovd_Province', 'KAZ', 'Қобда аймағы'), ('Khovd_Province', 'SPA', 'Provincia de Hovd'), ('Khovd_Province', 'TUR', 'Hovd İli'), ('Khovd_Province', 'KOR', '호브드 주'), ('Khovd_Province', 'CZE', 'Chovdský ajmag'),

    -- ==================== РЕСЕЙ ====================
    ('Russia', 'ENG', 'Russia'), ('Russia', 'RUS', 'Россия'), ('Russia', 'KAZ', 'Ресей'), ('Russia', 'SPA', 'Rusia'), ('Russia', 'TUR', 'Rusya'), ('Russia', 'KOR', '러시아'), ('Russia', 'CZE', 'Rusko'),
    ('Moscow', 'ENG', 'Moscow'), ('Moscow', 'RUS', 'Москва'), ('Moscow', 'KAZ', 'Мәскеу'), ('Moscow', 'SPA', 'Moscú'), ('Moscow', 'TUR', 'Moskova'), ('Moscow', 'KOR', '모스크바'), ('Moscow', 'CZE', 'Moskva'),
    ('Saint_Petersburg', 'ENG', 'Saint Petersburg'), ('Saint_Petersburg', 'RUS', 'Санкт-Петербург'), ('Saint_Petersburg', 'KAZ', 'Санкт-Петербург'), ('Saint_Petersburg', 'SPA', 'San Petersburgo'), ('Saint_Petersburg', 'TUR', 'St. Petersburg'), ('Saint_Petersburg', 'KOR', '상트페테르부르크'), ('Saint_Petersburg', 'CZE', 'Petrohrad'),
    ('Tatarstan', 'ENG', 'Tatarstan'), ('Tatarstan', 'RUS', 'Татарстан'), ('Tatarstan', 'KAZ', 'Татарстан'), ('Tatarstan', 'SPA', 'Tataristán'), ('Tatarstan', 'TUR', 'Tataristan'), ('Tatarstan', 'KOR', '타타르스탄'), ('Tatarstan', 'CZE', 'Tatarstán'),
    ('Bashkortostan', 'ENG', 'Bashkortostan'), ('Bashkortostan', 'RUS', 'Башкортостан'), ('Bashkortostan', 'KAZ', 'Башқұртстан'), ('Bashkortostan', 'SPA', 'Baskortostán'), ('Bashkortostan', 'TUR', 'Başkurdistan'), ('Bashkortostan', 'KOR', '바시키르 공화국'), ('Bashkortostan', 'CZE', 'Baškortostán'),

    -- ==================== ЧЕХИЯ ====================
    ('Czechia', 'ENG', 'Czechia'), ('Czechia', 'RUS', 'Чехия'), ('Czechia', 'KAZ', 'Чехия'), ('Czechia', 'SPA', 'Chequia'), ('Czechia', 'TUR', 'Çekya'), ('Czechia', 'KOR', '체코'), ('Czechia', 'CZE', 'Česko'),
    ('Prague', 'ENG', 'Prague'), ('Prague', 'RUS', 'Прага'), ('Prague', 'KAZ', 'Прага'), ('Prague', 'SPA', 'Praga'), ('Prague', 'TUR', 'Prag'), ('Prague', 'KOR', '프라하'), ('Prague', 'CZE', 'Praha'),
    ('Pardubice', 'ENG', 'Pardubice'), ('Pardubice', 'RUS', 'Пардубице'), ('Pardubice', 'KAZ', 'Пардубице'), ('Pardubice', 'SPA', 'Pardubice'), ('Pardubice', 'TUR', 'Pardubice'), ('Pardubice', 'KOR', '파르두비체'), ('Pardubice', 'CZE', 'Pardubice'),

    -- ==================== КОЛУМБИЯ  ====================
    ('Colombia', 'ENG', 'Colombia'), ('Colombia', 'RUS', 'Колумбия'), ('Colombia', 'KAZ', 'Колумбия'), ('Colombia', 'SPA', 'Colombia'), ('Colombia', 'TUR', 'Kolombiya'), ('Colombia', 'KOR', '콜롬비아'), ('Colombia', 'CZE', 'Kolumbie'),
    ('Bogota', 'ENG', 'Bogota'), ('Bogota', 'RUS', 'Богота'), ('Bogota', 'KAZ', 'Богота'), ('Bogota', 'SPA', 'Bogotá'), ('Bogota', 'TUR', 'Bogota'), ('Bogota', 'KOR', '보고타'), ('Bogota', 'CZE', 'Bogotá'),
    ('Cali', 'ENG', 'Cali'), ('Cali', 'RUS', 'Кали'), ('Cali', 'KAZ', 'Кали'), ('Cali', 'SPA', 'Cali'), ('Cali', 'TUR', 'Cali'), ('Cali', 'KOR', '칼리'), ('Cali', 'CZE', 'Cali'),
    
    -- ==================== ОҢТҮСТІК КОРЕЯ ====================
    ('South_Korea', 'ENG', 'South Korea'), ('South_Korea', 'RUS', 'Южная Корея'), ('South_Korea', 'KAZ', 'Оңтүстік Корея'), ('South_Korea', 'SPA', 'Corea del Sur'), ('South_Korea', 'TUR', 'Güney Kore'), ('South_Korea', 'KOR', '대한민국'), ('South_Korea', 'CZE', 'Jižní Korea'),
    ('Seoul', 'ENG', 'Seoul'), ('Seoul', 'RUS', 'Сеул'), ('Seoul', 'KAZ', 'Сеул'), ('Seoul', 'SPA', 'Seúl'), ('Seoul', 'TUR', 'Seul'), ('Seoul', 'KOR', '서울'), ('Seoul', 'CZE', 'Soul'),

    -- ==================== БАСҚА ЕЛДЕР ====================
    ('USA', 'ENG', 'USA'), ('USA', 'RUS', 'США'), ('USA', 'KAZ', 'АҚШ'), ('USA', 'SPA', 'EE. UU.'), ('USA', 'TUR', 'ABD'), ('USA', 'KOR', '미국'), ('USA', 'CZE', 'USA'),
    ('UK', 'ENG', 'UK'), ('UK', 'RUS', 'Великобритания'), ('UK', 'KAZ', 'Ұлыбритания'), ('UK', 'SPA', 'Reino Unido'), ('UK', 'TUR', 'Birleşik Krallık'), ('UK', 'KOR', '영국'), ('UK', 'CZE', 'Velká Británie'),
    ('France', 'ENG', 'France'), ('France', 'RUS', 'Франция'), ('France', 'KAZ', 'Франция'), ('France', 'SPA', 'Francia'), ('France', 'TUR', 'Fransa'), ('France', 'KOR', '프랑스'), ('France', 'CZE', 'Francie'),
    ('Spain', 'ENG', 'Spain'), ('Spain', 'RUS', 'Испания'), ('Spain', 'KAZ', 'Испания'), ('Spain', 'SPA', 'España'), ('Spain', 'TUR', 'İspanya'), ('Spain', 'KOR', '스페인'), ('Spain', 'CZE', 'Španělsko'),
    ('Italy', 'ENG', 'Italy'), ('Italy', 'RUS', 'Италия'), ('Italy', 'KAZ', 'Италия'), ('Italy', 'SPA', 'Italia'), ('Italy', 'TUR', 'İtalya'), ('Italy', 'KOR', '이탈리아'), ('Italy', 'CZE', 'Itálie'),
    ('Brazil', 'ENG', 'Brazil'), ('Brazil', 'RUS', 'Бразилия'), ('Brazil', 'KAZ', 'Бразилия'), ('Brazil', 'SPA', 'Brasil'), ('Brazil', 'TUR', 'Brezilya'), ('Brazil', 'KOR', '브라질'), ('Brazil', 'CZE', 'Brazílie'),
    ('Argentina', 'ENG', 'Argentina'), ('Argentina', 'RUS', 'Аргентина'), ('Argentina', 'KAZ', 'Аргентина'), ('Argentina', 'SPA', 'Argentina'), ('Argentina', 'TUR', 'Arjantin'), ('Argentina', 'KOR', '아르헨티나'), ('Argentina', 'CZE', 'Argentina'),
    ('Antigua_and_Barbuda', 'ENG', 'Antigua and Barbuda'), ('Antigua_and_Barbuda', 'RUS', 'Антигуа и Барбуда'), ('Antigua_and_Barbuda', 'KAZ', 'Антигуа және Барбуда'), ('Antigua_and_Barbuda', 'SPA', 'Antigua y Barbuda'), ('Antigua_and_Barbuda', 'TUR', 'Antigua ve Barbuda'), ('Antigua_and_Barbuda', 'KOR', '앤티가 바부다'), ('Antigua_and_Barbuda', 'CZE', 'Antigua a Barbuda'),
    ('Poland', 'ENG', 'Poland'), ('Poland', 'RUS', 'Польша'), ('Poland', 'KAZ', 'Польша'), ('Poland', 'SPA', 'Polonia'), ('Poland', 'TUR', 'Polonya'), ('Poland', 'KOR', '폴란드'), ('Poland', 'CZE', 'Polsko'),
    ('Latvia', 'ENG', 'Latvia'), ('Latvia', 'RUS', 'Латвия'), ('Latvia', 'KAZ', 'Латвия'), ('Latvia', 'SPA', 'Letonia'), ('Latvia', 'TUR', 'Letonya'), ('Latvia', 'KOR', '라트비아'), ('Latvia', 'CZE', 'Lotyšsko'),
    ('Hungary', 'ENG', 'Hungary'), ('Hungary', 'RUS', 'Венгрия'), ('Hungary', 'KAZ', 'Венгрия'), ('Hungary', 'SPA', 'Hungría'), ('Hungary', 'TUR', 'Macaristan'), ('Hungary', 'KOR', '헝가리'), ('Hungary', 'CZE', 'Maďarsko'),
    ('Romania', 'ENG', 'Romania'), ('Romania', 'RUS', 'Румыния'), ('Romania', 'KAZ', 'Румыния'), ('Romania', 'SPA', 'Rumanía'), ('Romania', 'TUR', 'Romanya'), ('Romania', 'KOR', '루마니아'), ('Romania', 'CZE', 'Rumunsko'),
    ('Ukraine', 'ENG', 'Ukraine'), ('Ukraine', 'RUS', 'Украина'), ('Ukraine', 'KAZ', 'Украина'), ('Ukraine', 'SPA', 'Ucrania'), ('Ukraine', 'TUR', 'Ukrayna'), ('Ukraine', 'KOR', '우크라이나'), ('Ukraine', 'CZE', 'Ukrajina'),
    ('Bulgaria', 'ENG', 'Bulgaria'), ('Bulgaria', 'RUS', 'Болгария'), ('Bulgaria', 'KAZ', 'Болгария'), ('Bulgaria', 'SPA', 'Bulgaria'), ('Bulgaria', 'TUR', 'Bulgaristan'), ('Bulgaria', 'KOR', '불가리아'), ('Bulgaria', 'CZE', 'Bulharsko'),
    ('Georgia', 'ENG', 'Georgia'), ('Georgia', 'RUS', 'Грузия'), ('Georgia', 'KAZ', 'Грузия'), ('Georgia', 'SPA', 'Georgia'), ('Georgia', 'TUR', 'Gürcistan'), ('Georgia', 'KOR', '조지아'), ('Georgia', 'CZE', 'Gruzie'),
    ('Turkmenistan', 'ENG', 'Turkmenistan'), ('Turkmenistan', 'RUS', 'Туркменистан'), ('Turkmenistan', 'KAZ', 'Түрікменстан'), ('Turkmenistan', 'SPA', 'Turkmenistán'), ('Turkmenistan', 'TUR', 'Türkmenistan'), ('Turkmenistan', 'KOR', '투르크메니스탄'), ('Turkmenistan', 'CZE', 'Turkmenistán'),
    ('UAE', 'ENG', 'UAE'), ('UAE', 'RUS', 'ОАЭ'), ('UAE', 'KAZ', 'БАӘ'), ('UAE', 'SPA', 'EAU'), ('UAE', 'TUR', 'BAE'), ('UAE', 'KOR', '아랍에미리트'), ('UAE', 'CZE', 'SAE'),
    ('Qatar', 'ENG', 'Qatar'), ('Qatar', 'RUS', 'Катар'), ('Qatar', 'KAZ', 'Катар'), ('Qatar', 'SPA', 'Catar'), ('Qatar', 'TUR', 'Katar'), ('Qatar', 'KOR', '카타르'), ('Qatar', 'CZE', 'Katar'),
    ('India', 'ENG', 'India'), ('India', 'RUS', 'Индия'), ('India', 'KAZ', 'Үндістан'), ('India', 'SPA', 'India'), ('India', 'TUR', 'Hindistan'), ('India', 'KOR', '인도'), ('India', 'CZE', 'Indie'),
    ('Pakistan', 'ENG', 'Pakistan'), ('Pakistan', 'RUS', 'Пакистан'), ('Pakistan', 'KAZ', 'Пәкістан'), ('Pakistan', 'SPA', 'Pakistán'), ('Pakistan', 'TUR', 'Pakistan'), ('Pakistan', 'KOR', '파키스탄'), ('Pakistan', 'CZE', 'Pákistán'),
    ('China', 'ENG', 'China'), ('China', 'RUS', 'Китай'), ('China', 'KAZ', 'Қытай'), ('China', 'SPA', 'China'), ('China', 'TUR', 'Çin'), ('China', 'KOR', '중국'), ('China', 'CZE', 'Čína'),
    ('Bangladesh', 'ENG', 'Bangladesh'), ('Bangladesh', 'RUS', 'Бангладеш'), ('Bangladesh', 'KAZ', 'Бангладеш'), ('Bangladesh', 'SPA', 'Bangladés'), ('Bangladesh', 'TUR', 'Bangladeş'), ('Bangladesh', 'KOR', '방글라데시'), ('Bangladesh', 'CZE', 'Bangladéš'),
    ('Sri_Lanka', 'ENG', 'Sri Lanka'), ('Sri_Lanka', 'RUS', 'Шри-Ланка'), ('Sri_Lanka', 'KAZ', 'Шри-Ланка'), ('Sri_Lanka', 'SPA', 'Sri Lanka'), ('Sri_Lanka', 'TUR', 'Sri Lanka'), ('Sri_Lanka', 'KOR', '스리랑카'), ('Sri_Lanka', 'CZE', 'Srí Lanka'),
    ('Uganda', 'ENG', 'Uganda'), ('Uganda', 'RUS', 'Уганда'), ('Uganda', 'KAZ', 'Уганда'), ('Uganda', 'SPA', 'Uganda'), ('Uganda', 'TUR', 'Uganda'), ('Uganda', 'KOR', '우간다'), ('Uganda', 'CZE', 'Uganda'),
    ('Zambia', 'ENG', 'Zambia'), ('Zambia', 'RUS', 'Замбия'), ('Zambia', 'KAZ', 'Замбия'), ('Zambia', 'SPA', 'Zambia'), ('Zambia', 'TUR', 'Zambiya'), ('Zambia', 'KOR', '잠비아'), ('Zambia', 'CZE', 'Zambie'),
    ('Nigeria', 'ENG', 'Nigeria'), ('Nigeria', 'RUS', 'Нигерия'), ('Nigeria', 'KAZ', 'Нигерия'), ('Nigeria', 'SPA', 'Nigeria'), ('Nigeria', 'TUR', 'Nijerya'), ('Nigeria', 'KOR', '나이지리아'), ('Nigeria', 'CZE', 'Nigérie'),
    ('Benin', 'ENG', 'Benin'), ('Benin', 'RUS', 'Бенин'), ('Benin', 'KAZ', 'Бенин'), ('Benin', 'SPA', 'Benín'), ('Benin', 'TUR', 'Benin'), ('Benin', 'KOR', '베냉'), ('Benin', 'CZE', 'Benin'),
    ('Ghana', 'ENG', 'Ghana'), ('Ghana', 'RUS', 'Гана'), ('Ghana', 'KAZ', 'Гана'), ('Ghana', 'SPA', 'Ghana'), ('Ghana', 'TUR', 'Gana'), ('Ghana', 'KOR', '가나'), ('Ghana', 'CZE', 'Ghana'),
    ('Ivory_Coast', 'ENG', 'Ivory Coast'), ('Ivory_Coast', 'RUS', 'Кот-д''Ивуар'), ('Ivory_Coast', 'KAZ', 'Кот-д''Ивуар'), ('Ivory_Coast', 'SPA', 'Costa de Marfil'), ('Ivory_Coast', 'TUR', 'Fildişi Sahili'), ('Ivory_Coast', 'KOR', '코트디부아르'), ('Ivory_Coast', 'CZE', 'Pobřeží slonoviny'),

    -- ==================== МАКРОРЕГИОНДАР ====================
    ('Caribbean', 'ENG', 'Caribbean'), ('Caribbean', 'RUS', 'Карибы'), ('Caribbean', 'KAZ', 'Кариб бассейні'), ('Caribbean', 'SPA', 'Caribe'), ('Caribbean', 'TUR', 'Karayipler'), ('Caribbean', 'KOR', '카리브해'), ('Caribbean', 'CZE', 'Karibik'),
    ('Central_America', 'ENG', 'Central America'), ('Central_America', 'RUS', 'Центральная Америка'), ('Central_America', 'KAZ', 'Орталық Америка'), ('Central_America', 'SPA', 'América Central'), ('Central_America', 'TUR', 'Orta Amerika'), ('Central_America', 'KOR', '중앙아메리카'), ('Central_America', 'CZE', 'Střední Amerika'),
    ('South_America', 'ENG', 'South America'), ('South_America', 'RUS', 'Южная Америка'), ('South_America', 'KAZ', 'Оңтүстік Америка'), ('South_America', 'SPA', 'América del Sur'), ('South_America', 'TUR', 'Güney Amerika'), ('South_America', 'KOR', '남아메리카'), ('South_America', 'CZE', 'Jižní Amerika'),
    ('North_America', 'ENG', 'North America'), ('North_America', 'RUS', 'Северная Америка'), ('North_America', 'KAZ', 'Солтүстік Америка'), ('North_America', 'SPA', 'América del Norte'), ('North_America', 'TUR', 'Kuzey Amerika'), ('North_America', 'KOR', '북아메리카'), ('North_America', 'CZE', 'Severní Amerika'),
    ('Europe', 'ENG', 'Europe'), ('Europe', 'RUS', 'Европа'), ('Europe', 'KAZ', 'Еуропа'), ('Europe', 'SPA', 'Europa'), ('Europe', 'TUR', 'Avrupa'), ('Europe', 'KOR', '유럽'), ('Europe', 'CZE', 'Evropa'),
    ('West_Africa', 'ENG', 'West Africa'), ('West_Africa', 'RUS', 'Западная Африка'), ('West_Africa', 'KAZ', 'Батыс Африка'), ('West_Africa', 'SPA', 'África Occidental'), ('West_Africa', 'TUR', 'Batı Afrika'), ('West_Africa', 'KOR', '서아프리카'), ('West_Africa', 'CZE', 'Západní Afrika'),
    ('Africa', 'ENG', 'Africa'), ('Africa', 'RUS', 'Африка'), ('Africa', 'KAZ', 'Африка'), ('Africa', 'SPA', 'África'), ('Africa', 'TUR', 'Afrika'), ('Africa', 'KOR', '아프리카'), ('Africa', 'CZE', 'Afrika'),
    ('Middle_East', 'ENG', 'Middle East'), ('Middle_East', 'RUS', 'Ближний Восток'), ('Middle_East', 'KAZ', 'Таяу Шығыс'), ('Middle_East', 'SPA', 'Oriente Medio'), ('Middle_East', 'TUR', 'Orta Doğu'), ('Middle_East', 'KOR', '중동'), ('Middle_East', 'CZE', 'Blízký východ'),
    ('South_Asia', 'ENG', 'South Asia'), ('South_Asia', 'RUS', 'Южная Азия'), ('South_Asia', 'KAZ', 'Оңтүстік Азия'), ('South_Asia', 'SPA', 'Asia del Sur'), ('South_Asia', 'TUR', 'Güney Asya'), ('South_Asia', 'KOR', '남아시아'), ('South_Asia', 'CZE', 'Jižní Asie'),
    ('Southeast_Asia', 'ENG', 'Southeast Asia'), ('Southeast_Asia', 'RUS', 'Юго-Восточная Азия'), ('Southeast_Asia', 'KAZ', 'Оңтүстік-Шығыс Азия'), ('Southeast_Asia', 'SPA', 'Sudeste Asiático'), ('Southeast_Asia', 'TUR', 'Güneydoğu Asya'), ('Southeast_Asia', 'KOR', '동남아시아'), ('Southeast_Asia', 'CZE', 'Jihovýchodní Asie'),
    ('Oceania', 'ENG', 'Oceania'), ('Oceania', 'RUS', 'Океания'), ('Oceania', 'KAZ', 'Мұхит аралдары'), ('Oceania', 'SPA', 'Oceanía'), ('Oceania', 'TUR', 'Okyanusya'), ('Oceania', 'KOR', '오세아니아'), ('Oceania', 'CZE', 'Oceánie'),
    ('East_Asia', 'ENG', 'East Asia'), ('East_Asia', 'RUS', 'Восточная Азия'), ('East_Asia', 'KAZ', 'Шығыс Азия'), ('East_Asia', 'SPA', 'Asia Oriental'), ('East_Asia', 'TUR', 'Doğu Asya'), ('East_Asia', 'KOR', '동아시아'), ('East_Asia', 'CZE', 'Východní Asie'),
    ('Central_Asia', 'ENG', 'Central Asia'), ('Central_Asia', 'RUS', 'Центральная Азия'), ('Central_Asia', 'KAZ', 'Орталық Азия'), ('Central_Asia', 'SPA', 'Asia Central'), ('Central_Asia', 'TUR', 'Orta Asya'), ('Central_Asia', 'KOR', '중앙아시아'), ('Central_Asia', 'CZE', 'Střední Asie');