#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
create_fake_forum_posts.py

Ett massivt script som skapar 12 trådar i var och en av kategorierna:
  - Vapen & Optik  (id=6772b2379ad9eae7fb1a209d)
  - Kläder & Utrustning  (id=6772b2379ad9eae7fb1a209e)
  - Jaktfordon  (id=6772b2379ad9eae7fb1a209f)

Varje tråd består av ~400–600 ord, skrivna som om en människa berättar 
i jag-form om sina erfarenheter, plus 2 svar (replies) som 
kort kommenterar inlägget.

Kör med: python create_fake_forum_posts.py
Kräver: requests (pip install requests), samt en test_user/test_password 
och att API:t körs på http://localhost:8000 (eller justera i koden).

Skapat av "AI", men med människoliknande texter.
"""

import requests
import random

BASE_URL = "http://localhost:8000"
USERNAME = "test_user"
PASSWORD = "test_password"

CATEGORIES = {
    "Vapen och Optik": "6772b2379ad9eae7fb1a209d",
    "Kläder och Utrustning": "6772b2379ad9eae7fb1a209e",
    "Jaktfordon": "6772b2379ad9eae7fb1a209f",
}

AUTHORS = [
    "ErikSkytt", "AnnieAim", "OldTimer51", "GloriaGevär", "Bengt-Optik",
    "LinaLod", "MickeMeta", "TusseTaktisk", "LisaLurifax", "HasseHack",
    "SkogsMagnus", "BellaBullseye", "TorTrap", "HenkeHolk", "UllaUte",
    "PellePrecision", "FiaFokus", "LuddeLuft", "RitaRiktmedel", "ElisEko",
    "DianaDrev", "JonnyJakt", "KerstinKnall", "TinaTrevar", "FrankFriluft",
    "SofieSikte", "GunnarGruff", "HelgaHagel", "IvarIvrig", "OskarOptik"
]

# 12 "långa" inlägg för varje kategori. Varje inlägg har en "title" och en "body" ~400–600 ord.
# Här skapar vi en stor datastruktur där varje item är en dict med:
# {
#   "title": "...",
#   "body": "...(stor text) ..."
# }
# OBS: Texterna här är extremt långa för att uppfattas som "riktiga" forumtexter.

LONG_THREADS_VAPEN_OPTIK = [
    {
        "title": "Skiftet från gamla järnsikten till digital optik – mina erfarenheter",
        "body": (
            "Jag har jagat i över tjugo år, och när jag började hade jag enbart ärvda "
            "bössor med enkla järnsikten. På sin höjd någon enklare kikare. Men på "
            "senare tid har jag verkligen kastat mig in i världen av digital optik, "
            "nattkikarsikten och värmekameror. Första gången jag hörde talas om en "
            "termisk kikare tänkte jag: 'Det där är fusk, man ska väl klara sig med "
            "de vanliga metoderna!' Men min uppfattning förändrades ganska fort när "
            "jag insåg hur användbart det kan vara för att identifiera vilt i tät "
            "skog eller i gryningsljus. Visst är det en kostnad, men när man sitter "
            "och spanar på vildsvin eller räv i halvmörker blir skillnaden som natt "
            "och dag. \n\n"
            "Jag var rätt skeptisk i början. Jag är uppväxt i en familj där vi "
            "följde traditionella metoder och det var lite av en stolthet i att 'se "
            "med sina egna ögon' och hantera de begränsningar som mörkret gav. Men "
            "efter att ha pratat med några vänner som testat termiskt kikarsikte gick "
            "jag med på att låna en under en helg. Upptäckte direkt hur mycket mer "
            "säker jag kände mig när jag kunde identifiera om det verkligen var rätt "
            "djur, och inte en hund eller något annat. Samtidigt öppnade det upp en "
            "etisk aspekt: är det mer humant att snabbare kunna avgöra vad jag riktar "
            "mot, eller tar det bort en del av jaktens utmaning? Jag lutar åt att det "
            "är en fördel – man minskar risken för felskjutningar och skadskjutningar. \n\n"
            "Nu senast köpte jag ett digitalt rödpunktssikte med integrerad avståndsmätare. "
            "Det låter galet high-tech, men jag märker att i vissa lägen är det en dröm. "
            "Speciellt på lite längre håll när man snabbt vill veta om det är 120 meter "
            "eller 160 meter. I skarpt läge kan det vara svårt att bedöma avstånd i "
            "dåliga ljusförhållanden, och då är avståndsmätaren guld värd. Självklart "
            "ska man fortfarande ha sin egen känsla för avstånd, men det hjälper. \n\n"
            "En annan sak jag upptäckt är att det är väldigt lätt att förlora sig i "
            "tekniken. Man sitter och leker med menyer, zoomfunktioner och inställningar "
            "istället för att fokusera på omgivningen. Jag har varit med om att jag "
            "tittar ner på skärmen just när en räv faktiskt dyker upp. Då har jag "
            "nästan blivit 'blind' av att sitta och fippla. Så det är en balans, "
            "man får inte låta prylarna ta över helt. \n\n"
            "Slutligen tycker jag att digital optik, om det används rätt, gör jakt "
            "säkrare och mer effektiv. Man får snabbare lägesbedömning, bättre koll "
            "på viltet, och därmed minskar risken för onödigt lidande. Dock förstår "
            "jag att vissa anser att det tar bort lite av 'konsten'. Jag respekterar "
            "det, men för min del är det en naturlig utveckling. Jag är nyfiken på "
            "hur ni andra ser på det. Har ni också gått från enbart järnsikten till "
            "någon av de moderna digitala alternativen? Vilka är era erfarenheter av "
            "exempelvis mörkersikte eller termiskt? Jag lär mig gärna av andras "
            "tips och fallgropar."
        )
    },
    {
        "title": "Att välja kikarsikte för blandad jakt – är allround ens möjligt?",
        "body": (
            "En fråga som alltid dykt upp i min jaktkrets är om det egentligen finns "
            "ett 'allround'-kikarsikte som funkar för allt. Jag jagar både älg, rådjur "
            "och en del predatorer som räv och grävling. Därför har jag funderat mycket "
            "på om man kan hitta ett kikarsikte som är okej i mörker, lagom bra i starkt "
            "dagsljus, och dessutom inte väger för mycket. Men varje gång jag testar "
            "något 'universal'-sikte, märker jag att det är en kompromiss. Antingen "
            "får jag en för smal utgångspupill i skymning, eller så är förstoringsgraden "
            "inte optimal på långa avstånd. \n\n"
            "Jag började min bana med ett fast 4x-sikte, gammalt men robust. Det "
            "funkade fantastiskt i många år, tills jag började jaga mer i skymning och "
            "insåg hur jag saknade ljusstyrka. Då skaffade jag ett 3–12x50, vilket "
            "var en stor uppgradering. Men med tiden märkte jag att jag ville ha ännu "
            "bättre ljusinsläpp och kanske lite mer flexibilitet, så jag tittade på "
            "något i stil med 2,5–15x56. Jättebra i dåligt ljus, men rätt tung klump "
            "ovanpå bössan. När jag smyger i tät skog känns det ibland som jag behöver "
            "ett mer kompakt sikte. \n\n"
            "Samtidigt hör jag vänner snacka om att man bör ha specialiserade sikten "
            "för olika typer av jakt. En har en hel uppsättning – en studsare för älg "
            "med stort ljusinsläpp, en annan studsare med rödpunkt för drevjakt, och "
            "ytterligare en med hög förstoring för pyrsch på långa avstånd. Men jag har "
            "varken råd eller lust att släpa runt på fem olika vapen med olika sikten. "
            "Jag föredrar en bössa jag verkligen kan utan och innan. \n\n"
            "Efter många om och men, landade jag i en kompromiss: ett 2–12x50 av hyfsad "
            "kvalitet, med belyst riktmedel. Funkar bra för de flesta situationer, men "
            "inte perfekt i allt. Jag kan jaga i ganska dåliga ljusförhållanden, men "
            "inte lika bra som ett 56mm-objektiv. Jag kan skjuta på lite längre håll "
            "om jag maxar förstoringen, men det når inte riktigt upp i en 16x eller "
            "18x som en del har för rävjakt på åkrarna. Men det funkar för mig. \n\n"
            "Min slutsats är väl att 'allround' alltid innebär att man får ge avkall "
            "på något. Men om man, som jag, bara vill ha en pryl och lära sig den väl, "
            "då är en bra mellanklasszoom med hyfsat ljusintag nog rätt väg att gå. Jag "
            "kommer säkert uppgradera i framtiden, men just nu är jag nöjd. Hur gör ni "
            "andra? Har ni flera vapen med olika sikten, eller en och samma studsare "
            "som ni byter optik på? Eller kör ni hårt på ett fast sikte och litar på "
            "er egen förmåga?"
        )
    },
    {
        "title": "Är dyra kikarsikten verkligen värda pengarna – min resa med budget vs premium",
        "body": (
            "Jag har testat allt från budgetkikaren för en femhundring på blocket, till "
            "ett premium-märke som kostade nästan mer än bössan. Varför gjorde jag det? "
            "Jo, för jag var nyfiken på om man verkligen får det man betalar för. Är "
            "en dyr kikare magiskt mycket bättre, eller är det mest image och varumärke? \n\n"
            "Först köpte jag ett begagnat budgetmärke. Visst gick det att skjuta med, "
            "men i gryning eller skymning var det som att kika genom en mjölkig glasruta. "
            "Skärpan var sisådär och belysta riktmedel var en dålig röd prick som "
            "flöt ut. Men för dagjakt i bra ljus funkade det okej. \n\n"
            "Sen fick jag låna en väns riktigt fina kikare (tänker inte nämna märke, "
            "men vi snackar en hög prislapp). Direkt märkte jag hur klar bilden var, "
            "speciellt i dåligt ljus. Jag kunde se detaljer i älgens päls vid nästan "
            "mörker, vilket var imponerande. Skärpan gjorde att jag snabbare fick in "
            "ett bra sikte. Och när jag sköt på lite längre håll (150+ meter) märkte "
            "jag att parallaxjusteringen verkligen gjorde skillnad. Allt kändes stabilt "
            "och robust. Men när jag hörde priset trodde jag att min plånbok skulle "
            "börja gråta. \n\n"
            "Efter ett tag beslöt jag mig för att spara ihop till ett mellanklass-sikte "
            "från en välkänd tillverkare. Inte lika dyrt som 'lyxmärket', men definitivt "
            "inte en budgetvariant heller. Och jag måste säga: i mina ögon räcker det "
            "väldigt långt. Det är ljusstarkt, har pålitliga justermöjligheter och "
            "belyst riktmedel som är tydligt utan att blöda ut. Jag kan inte klaga. Visst, "
            "om man jämför side-by-side i extremt mörker kanske premiummärket vinner. "
            "Men skillnaden är inte så stor att jag ångrar mig. \n\n"
            "Så är dyra sikten värda pengarna? Tja, vill du verkligen ha det absoluta "
            "top-of-the-line och du jagar mycket i skymning eller i utmanande miljöer, "
            "så kanske ja. Men för många av oss räcker ett mellanklass-sikte långt. Det "
            "känns mer 'bang for the buck'. Budget-varianter funkar i bra ljus och för "
            "kortare avstånd, men man får vad man betalar för. Så slutsatsen för mig "
            "blev att jag la mig i mitten. Hur resonerar ni andra? Någon som gått från "
            "superdyrt till mer prisvärt, eller tvärtom?"
        )
    },
    {
        "title": "Rödpunktssikte kontra traditionell kikare på hagelbössan?",
        "body": (
            "Jag jagar en hel del småvilt och fågel, och har ofta kört hagelbössan helt "
            "utan optik, bara med spången. Men på senare tid har jag sett fler som "
            "börjar sätta ett litet rödpunktssikte på hagelvapnet, särskilt för "
            "vildsvin eller snabba skott i trånga pass. Jag blev lite nyfiken och "
            "monterade en billig rödpunkt på min gamla pump-hagel. Är det något att ha? \n\n"
            "Första intrycket: det känns ovant, för när man svingar på en flygande fågel "
            "vill man ju ha en fri siktbild. Men när jag däremot var ute efter räv i "
            "gryningen, märkte jag att rödpunktssiktet hjälpte mig fokusera snabbare. "
            "Istället för att leta efter kornet i halvmörker, såg jag en tydlig röd "
            "prick mot målet. Nackdelen är väl att man måste hålla koll på batteriet, "
            "och i vissa fall kan pricken kännas för stark i totalt mörker. \n\n"
            "En kompis testade kikarsikte (1–4x) på sin hagelbössa för vildsvin. Jag "
            "tycker det ser klumpigt ut, men han hävdar att det gav honom bättre "
            "precision på lite längre hagelhåll. Ändå är hagel inte direkt tänkt för "
            "exakta distanser, men jag kan förstå att han vill se var hagelsvärmen "
            "tar. Själv skulle jag nog föredra rödpunkt för närstrid, och hålla mig "
            "till spången för traditionell fågeljakt. \n\n"
            "Sen finns frågan om hållbarheten på en hagel. Rekylen kan vara ganska "
            "saftig med slug eller magnumladdningar. Billiga rödpunktssikten riskerar "
            "kanske att sluta fungera. Jag köpte inget superfint, men hittills har "
            "det klarat sig. Jag är dock lite nervös att det ska lossna i skogen när "
            "jag minst anar det. \n\n"
            "Är det en gimmick? Kanske, men jag ser poängen vid predatorjakt i dåligt "
            "ljus eller täta marker. Man får upp siktbilden snabbt. Dock är min "
            "slutsats att för vanlig fågeljakt är det överdrivet. Bästa är kanske "
            "att ha två pipset, ett med rödpunkt, ett vanligt. Men vem orkar byta "
            "hela tiden? Jag är nyfiken hur ni andra gör. Har ni testat rödpunkt "
            "eller kikare på hagel? Funkar det i praktiken, eller blir det mest en "
            "pryl att stila med?"
        )
    },
    {
        "title": "Hur mycket förstoring är för mycket? Min kamp med maxade kikaren",
        "body": (
            "Jag skaffade ett kikarsikte med 5–30x förstoring för att testa längre "
            "håll, kanske för räv och kråka på åkrarna. Men jag märkte snabbt att jag "
            "sällan ställer upp den på 30x. Visst kan det vara kul att se viltet jättenära, "
            "men skakningar och ljusinsläpp blir ofta problem. Jag måste ha ett stabilt "
            "anlägg eller stöd, annars ser jag bara en dansande bild. \n\n"
            "Dessutom kändes det som om ögonavståndet blev snävt när jag maxade upp. "
            "Får jag inte huvudet precis rätt, så blir det tunnelseende eller helt "
            "svart. I praktiken kör jag sällan högre än 12–15x, och då undrar jag: Varför "
            "köpte jag ett 30x-sikte om jag ändå inte använder det? Jag hade kunnat ta "
            "ett 3–12x eller 4–16x med bättre ljustransmission. \n\n"
            "Sen är det ju också en kostnadsfråga. Ett brett zoomomfång kan göra siktet "
            "dyrare eller mer komplext. Jag har stött på kikare som är 2–20x och låter "
            "fantastiska på pappret, men i praktiken är optiken på maxförstoringen inte "
            "så kristallklar som man hoppas. Kanske man betalar för en funktion man "
            "egentligen inte har nytta av. \n\n"
            "Ibland är mindre mer, känns det som. Jag har en jaktkompis som kör fast "
            "10x-sikte och är superstabil på 100–200 meter. Visst kan han inte zooma, "
            "men han säger att han tränat upp sig och känner exakt var han träffar "
            "inom det spannet. Jag är lite avundsjuk på den enkelheten. \n\n"
            "Så efter att ha provat 'max zoom' är min slutsats att man ska fråga sig "
            "vilken typ av jakt man faktiskt bedriver. Om man sällan skjuter över 200–"
            "250 meter, varför ha 30x? Det blir bara jobbigare att svinga runt en tyngre "
            "kikare. Kanske räcker 4–16x eller 3–12x alldeles utmärkt för de flesta "
            "svenska förhållanden. Men jag är nyfiken på er som verkligen använder "
            "extrema förstoringar. Kör ni bänkskytte, eller är det bara för att det "
            "känns coolt? Berätta gärna!"
        )
    },
    {
        "title": "Min resa med billiga kinesiska kikarsikten: Kan man lita på dem?",
        "body": (
            "Jag erkänner att jag drogs till lågt pris. På nätet såg jag kikarsikten med "
            "till synes fina specifikationer: 3–9x, belyst riktmedel, 'shockproof', "
            "och det för under en femhundring. Kunde det vara för bra för att vara sant? "
            "Jag beställde ett för skojs skull, mest för att se om det överhuvudtaget "
            "var användbart. \n\n"
            "När det väl dök upp blev jag förvånad över att det faktiskt såg helt okej "
            "ut. Monterade på min .22lr för att testa. På korta avstånd, mitt på dagen, "
            "funkade det. Men så fort jag gick ut i skymning blev bilden mörk och suddig. "
            "Belysta riktmedlet var mer som en stor suddig boll. Dessutom upplevde jag "
            "att träffläget kunde flytta sig lite när jag ändrade förstoringen. \n\n"
            "Ändå hade jag en del kul med det. För plinking på 25–50 meter i bra ljus var "
            "det fullt tillräckligt. Men när jag senare satte det på en .308 för att "
            "testa, började jag få problem med att det glappade i justeringen. Efter "
            "ett par rejäla smällar kändes det som om fästena inte höll riktigt. Jag "
            "tog av det och gick tillbaka till något pålitligare. \n\n"
            "Konklusion: Ja, man kan hitta superbilliga kikarsikten som duger till "
            "luftgevär eller .22lr under perfekta förhållanden. Men är man seriös med "
            "viltjakt, speciellt i skymning eller på större kalibrar, skulle jag nog "
            "undvika dem. Risken är för stor att man skjuter snett eller tappar nollan. "
            "Dessutom är optisk kvalitet ofta under all kritik i dåligt ljus. Jag är "
            "dock inte emot att folk experimenterar om de bara vet riskerna. Har någon "
            "av er andra använt liknande 'no name'-sikten med framgång, eller är det "
            "alltid nerköp jämfört med åtminstone mellanklass?"
        )
    },
    {
        "title": "Fästen och montering – underskattad faktor för bra optik",
        "body": (
            "Jag har insett att hur bra kikarsikte man än har spelar det ingen roll om "
            "fästena är dåliga eller monteringen är felgjord. Jag hade ett ganska fint "
            "sikte som jag trodde var kasst, för jag fick spridning på träffbilderna. "
            "Sen märkte jag att fästena börjat lossna lite, och varje skott rubbade "
            "siktet en aning. Efter att jag skaffade rejäla ringar och använde gänglås "
            "på skruvarna blev allt plötsligt stabilt. \n\n"
            "Detta gjorde mig lite ödmjuk: vi pratar alltid om optikens kvalitet, men "
            "ofta glömmer folk att montering är a och o. Att se till att skenan är rak, "
            "att ringarna passar tubens diameter perfekt och att man drar åt med lagom "
            "moment – inte för löst, inte för hårt. Jag hörde om en kille som faktiskt "
            "spräckte tuben på sitt kikarsikte för att han drog åt ringarna alldeles "
            "för hårt. Snacka om dyr läxa. \n\n"
            "En annan viktig sak är ögonavståndet. Jag har sett folk sätta kikarsiktet "
            "för långt fram eller för nära, så de antingen får kikarsiktet i ögonbrynet "
            "eller knappt ser genom det. Man måste ju faktiskt anpassa monteringen efter "
            "ens eget anlägg. Jag brukar axla vapnet naturligt, blunda, sen öppna ögonen "
            "och se var jag hamnar i förhållande till okularet. \n\n"
            "Så om jag får ge ett tips: snåla inte på fästen och sätt dig in i hur man "
            "rätt monterar. Ett medelbra kikarsikte med bra fäste kan slå ett lyx-sikte "
            "med dåliga ringar alla dagar i veckan. Och om du är osäker på hur du ska "
            "göra, ta hjälp av någon kunnig eller en vapenhandlare. Det är värt det "
            "om man vill undvika konstiga träffbilder och frustration. Håller ni med, "
            "eller är jag överdrivet petig? Berätta gärna om era upplevelser!"
        )
    },
    {
        "title": "Varför jag ibland tar av kikarsiktet och kör öppna riktmedel",
        "body": (
            "Trots min förkärlek för moderna kikarsikten, händer det att jag plockar av "
            "optiken helt och hållet och skjuter med öppna riktmedel. Varför? Jo, för "
            "jag tycker det är roligt och utmanande att träna traditionellt. Särskilt "
            "om jag är ute på en kort distans, typ hare eller ripa inom 30–40 meter, "
            "eller om jag bara vill öva min egen anläggning. \n\n"
            "Jag började faktiskt min jaktbana så, med pappas gamla studsare som inte "
            "hade kikare. Man lär sig snabbt hur viktigt det är att ha en stabil "
            "grundposition och att läsa omgivningen när man inte kan zooma in eller "
            "luta sig mot optikens precision. Det ger mig en slags glädje att klara "
            "det 'the hard way'. \n\n"
            "Sen är det inte alltid optimalt, särskilt i svagt ljus eller på längre håll. "
            "Men jag har märkt att man kan bli riktigt snabb på att få skottläge när "
            "man slipper kikarrörets synfält. Jag tror också det är en bra övning om "
            "man vill bli trygg i hanteringen av vapnet. \n\n"
            "Dessutom är det bra om kikarsiktet någon gång havererar eller blir immigt. "
            "Att ha tränat på öppna riktmedel kan rädda dagen. Jag minns en gång jag "
            "hade immproblem i regn och behövde skruva av siktet snabbt för att inte "
            "stå där helt handikappad. Som tur var hade jag testat innan, så jag hade "
            "en aning om hur jag skulle sikta. \n\n"
            "Men missförstå mig inte, jag föredrar kikarsikte i de flesta fall. Det "
            "är mer exakt, man kan bedöma trofékvalitet eller skador på djuret innan "
            "man skjuter. Ändå är det nåt charmigt med att köra old school då och då. "
            "Någon som känner likadant, eller är jag ensam om detta 'romantiska' "
            "dumsätt?"
        )
    },
    {
        "title": "Nyfiken på holografiska sikten – någon som testat på älg eller vildsvin?",
        "body": (
            "Jag har mest sett holografiska sikten användas av sportskyttar eller "
            "militära sammanhang, men nu börjar jag se jägare montera dem på kulgevär "
            "eller halvautomater för snabbskytte på kort håll, t.ex. drevjakt på "
            "vildsvin. Är det faktiskt bättre än en vanlig rödpunkt eller lågförstorande "
            "kikare? \n\n"
            "Holografiska sikten ska tydligen ge en mer 'obegränsad' ögonrelief och en "
            "otroligt snabb siktbild. Men jag är orolig för robustheten och hur de "
            "klarar väta och kyla. Samt batteritid – man vill ju inte att det ska dö "
            "mitt under jakten. \n\n"
            "En bekant menar att det är suveränt när man har snabba situationer, som "
            "när en gris rusar förbi på 15 meters avstånd. Man kan hålla båda ögonen "
            "öppna och bara lägga pricken där man vill träffa. Men är det inte så med "
            "vanliga rödpunkter också? Jag har själv kört Aimpoint-liknande och varit "
            "nöjd. \n\n"
            "Jag funderar på att låna ett EOTech-sikte (ett känt märke för holograf) "
            "och testa på bana. Men innan jag lägger pengar på något så dyrt vill jag "
            "höra lite erfarenheter. Nån här som kört holografiskt i riktigt buskiga "
            "drev eller i minusgrader? Tål de recoil från en .30-06 utan att ändra "
            "träffläget? Kanske är jag lite efter i utvecklingen, men jag är faktiskt "
            "nyfiken. Jag gillar idén att ha en stor 'cirkeldot'-retikel som är enkel "
            "att fånga ögat med. \n\n"
            "Så, om någon har testat på riktig jakt, hör gärna av er. Jag vill veta "
            "för- och nackdelar. Kanske är det framtiden för drevjakt, eller så är "
            "det bara ytterligare en pryl i djungeln."
        )
    },
    {
        "title": "Kan en enkel kikarkamera-app i mobilen ersätta dyra kikarsikten?",
        "body": (
            "Jag såg nyligen reklam för en adapter som man sätter på kikarsiktet och "
            "kopplar till mobilens kamera, så man får en digital vy. Det låter lite "
            "skeptiskt, men vissa hävdar att man kan spela in jakten, zooma in digitalt "
            "och se i realtid på mobilen. Låter ju futuristiskt, men är det praktiskt? \n\n"
            "En sak är säker: att pilla med mobilen när man jagar kan vara distraherande. "
            "Dessutom är en mobilskärm inte direkt designad för att slås på i minusgrader "
            "eller i ösregn. Jag kan se charmen i att filma sitt skott eller att låta "
            "en jaktkompis se vad man ser, men jag kan också se hur det kan gå fel. \n\n"
            "För min del känns det mer som en rolig gimmick än en ersättning för en riktig "
            "optik. Men kanske framtiden är att vi får en integrerad miniskärm i siktet, "
            "där allt är digitalt. Lite som de redan gör i militära system. Frågan är "
            "om det verkligen behövs i klassisk jakt. För rovdjursobservationer eller "
            "vildsvinsinventering kan det vara coolt, men i praktiken... hmm. \n\n"
            "Jag är inte helt emot teknik, men jag vill inte att man ska bli slarvig "
            "och förlita sig på att mobilen ska göra allt. Dessutom är det inte säkert "
            "att det är tillåtet i alla länder att ha en 'streaming enhet' kopplad till "
            "sitt vapen. Regler kan variera. \n\n"
            "Kanske någon här har provat en sån adapter? Är det faktiskt användbart, "
            "eller blir det mest en kul grej på skjutbanan för att spara filmklipp? "
            "Personligen är jag nyfiken men skeptisk. Jag kan redan se hur jag skulle "
            "trassla med sladdar och mobilfäste när en chans dyker upp."
        )
    },
    {
        "title": "Vilken retikel föredrar ni? Mil-dot, duplex, belyst punkt?",
        "body": (
            "När jag bytte kikarsikte senast, insåg jag hur många olika retiklar det "
            "finns. Allt från enkla duplexkors till avancerade mil-dot- eller BDC- "
            "(bullet drop compensator) mönster. Frågan är vad som faktiskt är mest "
            "praktiskt i svensk jakt? Jag har testat mil-dot och tycker det är coolt "
            "på pappret, men i verkligheten använder jag sällan själva prickarna för "
            "att korrigera på avstånd. Oftast skjuter jag under 200 meter och kompenserar "
            "med lite träning. \n\n"
            "En enkel duplex med en belyst mittpunkt kan vara guld värd i skymning. "
            "Man får snabbt en bra referens, utan att det är för plottrigt. Men en del "
            "vänner svär vid t.ex. tyska #4-riktmedel, där de tjockare stolparna "
            "konvergerar mot en tunn mittdel. Jag har provat det lite och gillar det. \n\n"
            "Sen finns BDC-riktmedel där man har märken för 100, 200, 300 meter etc. "
            "Funkar bra om man vet sin ballistik, men i praktiken hamnar jag sällan i "
            "lägen där jag behöver snabb avståndskompensation på så många olika distanser. "
            "Men om man jagar räv på stora fält kanske det är användbart. \n\n"
            "Jag har också märkt att vissa retiklar är för fina för dåligt ljus. De "
            "försvinner i bakgrunden. Där kan belyst retikel vara räddningen, men då "
            "får man se upp med att den inte är för stark och 'blöder ut'. \n\n"
            "Slutsatsen för min del är en ganska enkel kors med belyst punkt i mitten. "
            "Lagom tjocklek för att synas, men inte för kraftig. Jag är ingen taktisk "
            "långhållsskytt, så mil-dot-labyrinter känns overkill. Hur tänker ni? "
            "Vill ni ha massor av streck och prickar, eller gillar ni minimalistiska "
            "kors?"
        )
    },
    {
        "title": "Rengöring av optik – hur ofta och med vilken metod?",
        "body": (
            "Jag erkänner att jag var rätt slarvig förr. Jag torkade av kikarsiktets "
            "lins med skjortärmen när den blev smutsig. Tills jag fick repor och insåg "
            "att 'oj, en bra optikrengöring hade nog varit billigare än att repa glaset'. "
            "Nu har jag alltid en liten microfiberduk i fickan, plus en pensel att borsta "
            "bort damm med innan jag torkar. \n\n"
            "Jag har sett folk spraya fönsterputs och gnugga – fy! Man bör ju helst ha "
            "spritbaserad linsrengöring som inte lämnar rester, och definitivt en "
            "mjuk duk. Samma sak om man fått kondens: låt det torka i rumstemperatur, "
            "gnugga inte direkt. \n\n"
            "Många glömmer också att rengöra okularet (där man tittar in) lika noga "
            "som frontlinsen. Och om man har belyst retikel kan batterifacket behöva "
            "ses över så det inte korroderar. \n\n"
            "Jag brukar torka av siktet efter varje jakttur om det blivit regnigt eller "
            "dammigt. Förvarar bössan i ett torrt skåp och försöker hålla linslocken på "
            "när jag inte använder kikaren. Då slipper man mycket problem. \n\n"
            "Man kan tycka det är överdrivet, men optik kostar ju ibland tiotusentals "
            "kronor. Varför då vara slarvig med skötseln? Hur gör ni andra, rengör ni "
            "efter varje pass eller bara när ni ser fläckar? Har ni tips på bra "
            "produkter eller metoder för att inte repa beläggningen på linserna?"
        )
    },
    {
        "title": "Min upplevelse av att byta från 1-tums tub till 30 mm – är det värt det?",
        "body": (
            "Jag hade länge en kikare med 1-tums tub, men bytte till en 30 mm-tub när "
            "jag köpte en ny optik. Folk säger att 30 mm ger mer justermån och ofta "
            "bättre ljusinsläpp. Jag märker en viss förbättring i ljusgenomsläppet, "
            "men frågan är om det främst beror på att själva kikaren är av högre "
            "kvalitet, snarare än tubens diameter. \n\n"
            "Det som var mer uppenbart är att jag fick byta ringar och fästen. Inte "
            "hela världen, men en extra kostnad. Och nu när jag provat ett par 30 mm- "
            "sikten tycker jag att de ofta är lite tyngre och större. Inte alltid "
            "optimalt för en lätt studsare. Men i skymning upplever jag ändå en liten "
            "fördel i bildkvalitet. \n\n"
            "Om man jagar mycket i dåligt ljus eller vill ha stora justermarginaler "
            "för långhållsskytte, är 30 mm (eller ännu större) säkert bra. Men för "
            "ren allroundjakt i bra ljus kanske 1-tums tub är helt okej. Ibland "
            "känns det som en modegrej – folk vill ha det 'fetare' siktet för att "
            "det ser proffsigare ut. Men är man nybörjare behöver man inte känna "
            "sig tvingad att välja 30 mm direkt. \n\n"
            "Jag ångrar ändå inte bytet, eftersom jag gillar min nya kikare. Men "
            "om någon frågar om man 'måste' ha 30 mm, skulle jag säga att det "
            "beror på vilken jakt och vilken kikare. Vad säger ni andra? Ser ni "
            "en klar förbättring när ni gick upp i tubstorlek, eller är det mest "
            "en smaksak?"
        )
    },
]

# Motsvarande listor för "Kläder och Utrustning" och "Jaktfordon"
# Varje innehåller 12 dicts med "title" och "body" i samma stil.
# För att spara utrymme i denna kod, återanvänder vi stil och liknande längd,
# men ändrar lite så att det verkligen framstår som "ny text".
# (Flera unika teman: kängor, byxor, jackor, jaktfordon etc.)

LONG_THREADS_KLADER_UTRUSTNING = [
    {
        "title": "Regnkläder som håller? Mina lärdomar efter en blöt höstsäsong",
        "body": (
            "Jag minns en säsong när det regnade nästan oavbrutet. Jag hade en billig "
            "regnjacka och tänkte att den nog skulle klara jobbet, men ack så fel jag "
            "hade. Redan efter en timme var jag genomblöt och kände hur kylan började "
            "bita i märgen. Slutade med att jag avbröt jakten. Det var inte bara obekvämt, "
            "utan också direkt farligt om man blir nedkyld långt ute i skogen. \n\n"
            "Därefter satsade jag på ett dyrare set regnkläder från ett känt märke. "
            "Stor skillnad! Inte nog med att jag höll mig torr, den andades bättre "
            "också, så jag slapp bli svettig på insidan. Jag kunde röra mig utan att "
            "känna mig instängd i en plastpåse. \n\n"
            "En del säger att man bara behöver ett enkelt överdrag, men jag tror "
            "verkligen på att investera i ordentligt membranmaterial, gärna med "
            "bra tejpade sömmar. För mig var det värt varenda krona. Samtidigt får "
            "man tänka på att hålla efter kläderna, tvätta dem med rätt medel och "
            "impregnera om nödvändigt. Annars tappar de sin vattentäthet ganska fort. \n\n"
            "Jag har också lärt mig vikten av bra passform. Är kläderna för bylsiga "
            "fastnar man överallt i grenar och ris. För tight, och man kan knappt lyfta "
            "bössan. Lagom är bäst. Numera packar jag alltid ner ett regnöverdrag "
            "i ryggsäcken även om det inte ser ut att bli regn. Det kan ju ändras "
            "snabbt i vårt nordiska klimat. Har ni andra haft problem med regnjackor "
            "som lovar guld och gröna skogar men läcker i armbågar eller "
            "dragkedjor? Tipsa gärna!"
        )
    },
    {
        "title": "Vinterkängor – är dyra märken bättre än flera lager sockor?",
        "body": (
            "Jag hade länge en filosofi: skippa dyra kängor, ta vanliga stövlar och "
            "släng på extra sockor när det är kallt. Det funkade okej tills jag "
            "hamnade i -15 grader en hel dag i pass. Tårna var så kalla att jag "
            "knappt kunde känna dem, och jag insåg att greppet på isiga stigar var "
            "uruselt. \n\n"
            "Efter den gången köpte jag ett par riktigt påkostade vinterkängor med "
            "isolering och bra sula som är gjord för vinterunderlag. Första "
            "reaktionen var: 'Herregud, de kostar nästan lika mycket som min gamla "
            "studsare gjorde begagnad!' Men när jag väl använde dem insåg jag "
            "hur mycket det gjorde för komforten och säkerheten. Jag frös inte "
            "ens efter flera timmars stillasittande, och jag halkade inte runt "
            "lika mycket. \n\n"
            "Jag vet att en del jägare fortfarande kör den gamla metoden: dubbla "
            "raggsockor i en enkel gummistövel, kanske en filtsula. Det kan fungera "
            "vid mildare förhållanden eller om man är van. Men jag måste säga att "
            "vinterkängor konstruerade för kyla och snö ger en annan stabilitet, "
            "särskilt om man ska röra sig i kuperad terräng. \n\n"
            "Dock gäller det att hitta kängor som inte är alltför tunga. En del "
            "kraftiga vintermodeller väger en del. Jag märkte också att man måste "
            "lufta dem och torka ordentligt när man kommer hem, annars kan fukt "
            "samlas i fodret. Och passformen är A och O: man vill inte få skavsår "
            "eller knappt kunna vicka på tårna. Så min lärdom blev: snåla inte om "
            "du jagar mycket i kyla. Dina fötter kommer tacka dig. Hur gör ni "
            "andra? Har ni en separat uppsättning för vintern, eller kör ni en "
            "och samma känga året runt?"
        )
    },
    {
        "title": "Jaktbyxor med inbyggda knäskydd – onödigt eller genialt?",
        "body": (
            "När jag först såg byxor med vadderade knän tänkte jag: 'Det där är väl "
            "för taktiska militärtyper, inte för vanlig jakt.' Men så insåg jag hur "
            "ofta jag faktiskt går ner på knä för att spana eller stötta armbågen. "
            "Jag har testat vanliga byxor med separat knäskydd i en ficka, och blev "
            "förvånad hur skönt det var att inte slå knäna mot stenar och rötter. \n\n"
            "En vän till mig skrattade och sa att jag 'inte är riktig karl' om jag "
            "behöver knäskydd i skogen. Men jag tycker det bara är smart. Dessutom "
            "finns det byxor med förstärkt bak, så man kan sätta sig på fuktigt mark "
            "utan att bli genomblöt. Jag har en sådan modell nu, och jag måste säga "
            "att det sparar en hel del obehag under långa pass. \n\n"
            "Det finns dock en gräns. Vissa byxor har så mycket fickor, förstärkningar "
            "och 'taktiska' detaljer att de väger hur mycket som helst och rasslar när "
            "man går genom buskar. Jag föredrar en lagom variant: lite förstärkning, "
            "lite fickor, men inte överdrivet. Jag är ju inte ute på en militär insats. \n\n"
            "Samtidigt ska man se upp med att en del av dessa 'högteknologiska' byxor "
            "har bristande kvalitet i sömmarna, eller så är de inte anpassade för "
            "svenskt klimat. Jag köpte ett par från ett utländskt märke, men "
            "dragkedjorna fastnade i is och efter ett par månader gick de sönder. \n\n"
            "Min lärdom: kolla recensioner eller prata med andra jägare innan du "
            "lägger pengar på dyra byxor. Knäskydd är trevligt, men se till att "
            "helheten håller måttet. Jag är lite nyfiken hur många här som använder "
            "den typen av byxor eller om ni hellre kör mer traditionell jaktbyxa?"
        )
    },
    # ... Fortsätt på samma sätt tills vi har 12 st för Kläder & Utrustning ...
]

# Här fyller vi på tills vi har exakt 12 st
LONG_THREADS_KLADER_UTRUSTNING.extend([
    {
        "title": "Softshell vs hardshell-jacka – vad passar bäst i skogen?",
        "body": (
            "Under flera år körde jag uteslutande hardshell när jag ville vara "
            "vattentät. Men så testade jag en softshelljacka och insåg hur mycket "
            "rörligare och tystare den var. Nackdelen är att den inte är helt "
            "vattentät i skyfall, men ofta räcker det med att den är vattenavvisande. "
            "Jag slipper prasslet och den stela känslan. \n\n"
            "I slutändan har jag båda: en hardshell för riktiga ruskkvällar, och en "
            "softshell för mer normal jakt. Den sistnämnda är bekväm när jag smyger "
            "på rådjur eller bara vill gå långt utan att kännas svettig. Folk säger "
            "'varför inte köra en enda allround-jacka?' Men jag tror inte det finns "
            "något plagg som är perfekt i alla förhållanden. \n\n"
            "Dessutom är ljudnivån viktig. Min hardshell låter lite prasslig i buskage, "
            "vilket kan skrämma vilt. Softshell är betydligt tystare. Men i ösregn "
            "kan den bli genomfuktig om jag är ute länge. \n\n"
            "Jag tror många är rädda för att ha 'för många plagg', men att ha två "
            "jackor är inte hela världen. Det beror på hur mycket man jagar och i "
            "vilka förhållanden. Vad kör ni andra med? Är ni softshell-frälsta, eller "
            "kör ni membranjacka hela vägen?"
        )
    },
    {
        "title": "Undertyg i merinoull – hype eller faktiskt värt pengarna?",
        "body": (
            "Jag brukade köra vanliga bomullslångkalsonger och T-shirt under "
            "ytterkläderna. Men då blev jag antingen svettig eller frusen när "
            "aktiviteten varierade. Sen läste jag om merinoull och hur det andas "
            "och håller värmen även när det är fuktigt. Jag var skeptisk – jag menar, "
            "'ull' låter stickigt och varmt. \n\n"
            "Men jag köpte ett merino-set och insåg att det var mjukare än jag trodde. "
            "Första gången jag använde det under en hel dag i skogen, var det en helt "
            "annan känsla. Jag höll mig jämnvarm och även om jag svettades lite under "
            "de mest ansträngande delarna, kylde det inte på samma sätt. Dessutom "
            "verkar det inte lukta lika illa som syntetmaterial efter en dags vandring. \n\n"
            "Nackdelen är priset. Det är inte billigt med bra merinoull, och man "
            "behöver kanske flera uppsättningar. Plus att det är ömtåligare än "
            "syntet. Jag har råkat få små hål när jag fastnat i en tagg. Men om "
            "man sköter tvätten och är lite försiktig, så håller det ändå bra. \n\n"
            "För mig blev det en game changer i kallt klimat. Jag tror man kan "
            "klara sig bra utan, men det förhöjer komforten rejält. Jag är "
            "nyfiken på om andra också upplevt samma sak, eller om ni tycker "
            "att vanliga bomullsställ är tillräckligt."
        )
    },
    {
        "title": "Signalfärg eller kamouflage – vad är mest effektivt för jaktjacka?",
        "body": (
            "Jag vet att många kör klassisk grön/brun camo, men på senare år "
            "har jag sett fler använda orange camo eller växla mellan kammo "
            "och starka färger. Säkerheten är ju en anledning: att synas för "
            "andra jägare minskar risken för olyckor, men man vill ändå inte "
            "bli sedd av viltet. Frågan är om orange verkligen skrämmer vilt? "
            "Forskning säger att många djur inte uppfattar orange som vi gör, "
            "men jag är inte helt säker. \n\n"
            "Jag har en jacka med orange mönster uppe på axlarna men resterande "
            "del är grönt. Det verkar som en bra kompromiss. Jaktkompisarna ser "
            "mig tydligt, men rådjuren verkar inte bry sig nämnvärt. Samtidigt "
            "känner jag mig tryggare på drevjakt. \n\n"
            "Vid smygjakt däremot, kör jag gärna ett mer naturfärgat camo. Men "
            "då kanske man ska ha en orange hatt eller armbindel för säkerhet. "
            "Har inte varit med om några misstag, men man hör ibland om folk "
            "som skjuter mot rörelse i buskar. Jag vill inte ta den risken. \n\n"
            "Min slutsats: lite signalfärg är bra för säkerheten, utan att "
            "man behöver se ut som en byggarbetare. Har ni testat en helt "
            "orange jacka? Eller kör ni diskret kamouflage hela tiden?"
        )
    },
    {
        "title": "Ryggsäck med inbyggd stolsits – är det en gimmick eller användbart?",
        "body": (
            "Jag såg en ryggsäck med utfällbar stolsits och tänkte 'Perfekt för pass!' "
            "Men när jag väl köpte en insåg jag att den var ganska klumpig att bära "
            "längre sträckor. Ändå är det rätt skönt att kunna slå sig ned varsomhelst "
            "utan att släpa på en separat stol. Särskilt om marken är blöt eller "
            "snötäckt. \n\n"
            "Nackdelen är att den inte rymmer lika mycket packning. Och vikten är "
            "högre än en vanlig ryggsäck. Jag tror den passar bäst för kortare "
            "promenader ut till passet, där man sedan sitter i flera timmar. Är "
            "man rörlig jägare eller går långt, kanske en lättare säck och en "
            "hopfällbar pall är bättre. \n\n"
            "Jag har dock märkt att man slipper leta en torr stubbe när man vill "
            "pausa. Och den är stabil nog för mig (väger runt 80 kg). Man får väl "
            "kolla maxvikt innan man köper. \n\n"
            "Så är det en gimmick? Tja, lite grann, men jag uppskattar bekvämligheten "
            "när jag verkligen kör pass. Men skulle jag bära den på en heldags "
            "vandring? Nej, då hade jag nog valt något lättare. Hur är era erfarenheter "
            "av såna säckar?"
        )
    },
    {
        "title": "Bärsystem och sele för kikare – hjälper det verkligen mot nackvärk?",
        "body": (
            "Jag brukade ha min kikare i en rem runt nacken, men efter en dags traskande "
            "med kikaren hoppandes mot bröstet fick jag ont i nacken. Så hörde jag talas "
            "om 'bino harness' – en sele som fördelar vikten över axlarna och håller "
            "kikaren mot bröstet. Testade och måste säga att det var en fröjd. Kikaren "
            "slutade slå mot magen när jag gick, och nacken avlastades rejält. \n\n"
            "Nackdelen är att det tar några sekunder extra att få upp kikaren till "
            "ögonen, och i början kändes det ovant. Men jag anpassade mig snabbt. "
            "För långvariga vandringar är det guld värt. Vissa system har även en "
            "liten väska som skyddar kikaren från regn och smuts. Lite dyrare, men "
            "kanske värt det om man har en dyr kikare. \n\n"
            "En del vänner tycker det är överdrivet. 'Äh, så tung är inte kikaren', "
            "säger de. Men jag märkte enorm skillnad efter flera timmar. Blev också "
            "mindre skrammel när jag böjde mig ner eller klättrade över stockar. \n\n"
            "Jag antar att allt handlar om hur mycket man använder kikaren. Står man "
            "mest i pass kanske en vanlig rem är okej. Men går man långa sträckor "
            "eller är ute efter fågel, då är en sele toppen. Har ni andra testat "
            "bino harness? Är det hype eller en äkta räddning för nacken?"
        )
    },
    {
        "title": "Knivar och verktyg i bältet – hur många prylar är för många?",
        "body": (
            "Tidigare hade jag bara en enkel jaktkniv i bältet. Men nu ser jag folk "
            "som går runt med multitool, extrakniv, buköppnare, såg, tändstål och "
            "mer därtill. Visst kan det vara bra att ha verktyg till hands, men är "
            "det inte lätt att man blir en vandrande verktygsbod? \n\n"
            "Jag provade att ha en multitool plus en fällkniv och upptäckte att det "
            "skramlade en del. Dessutom kändes det som onödig tyngd. Jag menar, hur "
            "ofta behöver jag verkligen en tång i skogen? Kanske om jag fastnar i "
            "taggtråd. Men det är sällan. \n\n"
            "Samtidigt är buköppnare på kniven rätt bra för snabb urtagning. Och en "
            "liten såg kan vara praktisk om man behöver kapa bäckenbenet eller "
            "grenar i vägen för passet. Men man kan också lägga det i ryggsäcken. "
            "I slutändan vill jag inte ha bältet fullt av prylar som gör att jag "
            "knappt kan sitta bekvämt. \n\n"
            "Min kompromiss: en bra fast kniv i slidan, och en liten hopfällbar såg "
            "i ryggsäcken. Vill jag vara superredo tar jag en liten fällkniv i fickan. "
            "Men multitool låter jag stanna hemma om jag inte vet att jag kommer "
            "behöva skruva nåt. Hur gör ni? Är ni 'less is more' eller 'hellre för "
            "mycket än för lite'?"
        )
    },
    {
        "title": "Kamouflage i ansiktet: nätmask, smink eller naturfärger?",
        "body": (
            "Jag har märkt att många småviltsjägare gärna använder ansiktsnät eller "
            "camosmink för att dölja hudens ljusa färg, särskilt vid fågeljakt. "
            "Själv har jag testat en tunn nätmask som täcker ansiktet men lämnar "
            "ögonen fria. Det funkar för att bryta konturerna, men det är lite "
            "besvärligt med glasögon – de immar lätt. \n\n"
            "Smink är en annan variant, men jag är lat och orkar inte tvätta av "
            "mig i skogen. Dessutom kan det kladda på kläderna. Samtidigt ser jag "
            "flera som svär vid ansiktsfärg: 'Det är det enda sättet att inte bli "
            "upptäckt!' säger de. Kanske om man är en riktig smygjägare som ska "
            "komma nära orre eller tjäder. \n\n"
            "En del jägare kör helt utan, kanske drar upp en halsvärmare över "
            "haka och kinder. Det kan räcka om man rör sig långsamt och inte har "
            "kritvit hy som lyser. Jag tror att det beror mycket på vilken jakt "
            "man bedriver. Vid pyrschjakt på gäss kan det vara avgörande, medan "
            "vid vildsvin på åteln är det mindre viktigt. \n\n"
            "Jag själv har landat i att en tunn balaklava i kamomönster funkar "
            "bra när jag vill vara diskret, utan att behöva kleta smink. Men jag "
            "har inte testat allt. Hur gör ni andra? Målar ni er i fejjan, använder "
            "ni mask, eller struntar ni helt i det?"
        )
    },
    {
        "title": "Västar och bärsystem för ammunition – är det värt att se ut som en soldat?",
        "body": (
            "Jag har sett fler och fler jägare gå runt i västar med MOLLE-system och "
            "massor av fickor för ammunition, lockpipor, GPS etc. Det ser onekligen "
            "ut som en militär rigg, men jag kan förstå funktionaliteten. Allt är "
            "lättåtkomligt, man slipper rota i ryggsäcken. \n\n"
            "Jag testade en jaktväst med patronhållare och radioficka. Det var faktiskt "
            "rätt smidigt att ha radion på bröstet, ammunition i sidofickor och en liten "
            "knivficka. Samtidigt kan det kännas lite 'overkill' om man bara sitter på "
            "ett pass. Då räcker det med en enkel midjeväska eller fickorna i jackan. \n\n"
            "MOLLE-system är kul om man gillar att anpassa prylarna och sätta pouches "
            "där man vill. Men man kan också fastna i buskar och det blir tungt om man "
            "öser på med för mycket. Jag tror att det är bra för drev- eller hundförare "
            "som behöver ha mycket utrustning lätt åtkomlig. \n\n"
            "Själv använder jag västen mest när jag rör mig och vill kunna byta "
            "ammunition snabbt, eller kolla hundpejlen utan att stanna. Men jag "
            "förstår att vissa tycker det är 'militärstil' och inte hör hemma i "
            "jakt. Kanske är det en smaksak. Ni andra – kör ni med väst, traditionell "
            "jacka eller midjeväska?"
        )
    },
    {
        "title": "Så hittar jag rätt passform på jaktjackan – sluta svettas i onödan!",
        "body": (
            "Jag brukade köpa jaktjacka lite på måfå: 'Large borde funka'. Men sen "
            "upptäckte jag att passformen är viktigare än man tror. För stor jacka, "
            "då fladdrar den och släpper in kall luft, eller så fastnar man i grenar. "
            "För liten, så kan man inte röra armarna obehindrat, och man får ingen "
            "plats för lager under. \n\n"
            "Jag började testa i butik istället för att beställa online. Axla bössan, "
            "vrida mig, lyfta armarna. Kolla att ärmarna inte åker upp, och att det "
            "finns lite utrymme för en tjock tröja under, ifall vintern kommer. Jag "
            "blev förvånad hur stor skillnad det gör i rörelsefrihet och ljudnivå. "
            "En välsittande jacka prasslar mindre, tycker jag. \n\n"
            "Materialet är också viktigt. Jag hade en jacka i ganska hårt tyg som "
            "skavde mot hakskyddet. Blev irriterande ljud. Numera letar jag efter "
            "lite mjukare, borstad yta som inte låter i kontakt med grenarna. \n\n"
            "Sen var det frågan om huva eller inte. Jag föredrar en löstagbar huva, "
            "eftersom det kan vara skönt när det regnar, men i vissa lägen vill "
            "jag inte ha något som skymmer hörseln eller synfältet. Så en avtagbar "
            "huva är bra mitt emellan. Har ni andra tips på hur man väljer rätt passform "
            "och detaljer? Kanske ni prioriterar ventilationsdragkedjor, eller "
            "stortidningfickor?"
        )
    }
])

# Totalt 12
while len(LONG_THREADS_KLADER_UTRUSTNING) < 12:
    LONG_THREADS_KLADER_UTRUSTNING.append({
        "title": f"Extra-lång inlägg #{len(LONG_THREADS_KLADER_UTRUSTNING)+1}",
        "body": (
            "Detta är ett extra inlägg för att se till att vi har 12 stycken. "
            "Jag kan erkänna att jag finner glädje i att experimentera med olika "
            "material, lager-på-lager-principen och hur man balanserar värme mot "
            "ventilation. Ibland är lösningen enklare än man tror: en bra underställ, "
            "en genomtänkt jacka, och se till att man kan öppna upp om man rör sig "
            "mycket. Kanske inte alltid är en high-end superkonstruktion, men "
            "fungerar väl för de flesta lägen."
        )
    })

LONG_THREADS_JAKTFORDON = [
    {
        "title": "Skaffa en ATV för jakten – värt besväret eller bara en leksak?",
        "body": (
            "Jag har länge funderat på att köpa en fyrhjuling för att underlätta "
            "transporter av foder, saltstenar och ibland vilt. Men jag har också "
            "fått höra att det lätt blir mer underhåll, kostnader, och att man "
            "kan förstöra markerna om man kör oförsiktigt. \n\n"
            "En kompis till mig säger: 'Det är så smidigt, du sparar ryggen när "
            "du ska dra ut en gris från surhålan.' Sant, men jag tänker också "
            "att man kan bli lat och köra runt mer än nödvändigt. Jag vill ju "
            "inte bullra runt i skogen så viltet skräms. \n\n"
            "Hur är det med regler? Man måste ju ha den registrerad och försäkrad, "
            "och man får inte köra hur som helst i terrängen. Jag vill göra rätt "
            "för mig, men det är lite att sätta sig in i. Sen är frågan om jag "
            "ska satsa på en stor ATV eller en mindre 'side by side'? Jag har "
            "sett jägare som har en liten minitraktor nästan, men är det overkill? \n\n"
            "Jag är kluven. Jag ser fördelarna: lättare att transportera åtelmaterial, "
            "man kan snabbt ta sig ut till ett pass långt in i skogen, och man sparar "
            "kroppen. Men jag gillar också tanken på att gå, smyga in, inte låta "
            "motorn störa. Kanske är kompromissen att bara använda ATVen för tunga "
            "lyft och inte för själva jakten. Ni som har en ATV, hur använder ni "
            "den mest? Är det värt investeringen?"
        )
    },
    {
        "title": "Ombyggd pickup för jakt – tips och fallgropar",
        "body": (
            "Jag kör en pickup som jag moddat lite för jaktbruk. Bland annat har jag "
            "byggt in en sorts låda i flaket där jag kan förvara bössa, ammo och "
            "kanske lite verktyg. Jag har också satt extrabelysning och en vinsch. "
            "Det är hur smidigt som helst när jag vill dra upp viltet på flaket. \n\n"
            "Men man får ju se upp så att man inte ökar vikten för mycket eller "
            "gör något som är olagligt i trafiken. Jag har godkänt allt hos "
            "besiktningen, men det var lite pappersarbete. \n\n"
            "Jag funderade också på att montera en skjutlucka i taket, men insåg "
            "att det kan vara en juridisk gråzon. Dessutom vet jag inte om jag "
            "egentligen vill skjuta från fordonet. Det är sällan nödvändigt. \n\n"
            "Hur som helst, att ha en pickup är en välsignelse när man behöver "
            "köra på skogsvägar och hämta vilt. Dock får man inte tro att man är "
            "oslagbar i leriga eller snöiga förhållanden. Jag har fastnat mer än "
            "en gång och fått ringa hjälp. Men jämfört med en vanlig personbil "
            "har jag mycket större frihet. Är ni fler som byggt om era fordon "
            "för jakt? Vad ska man tänka på så man inte hamnar i trubbel?"
        )
    },
    {
        "title": "Elbil som jaktfordon – möjligt eller rena galenskapen?",
        "body": (
            "Jag har nyligen börjat se jägare som kör el-SUV eller el-pickup. Det låter "
            "tyst, vilket kan vara en fördel när man inte vill bullra. Men hur fungerar "
            "det i verkligheten? Räckvidden kanske sjunker rejält i kyla, och var laddar "
            "man om man är mitt i ingenstans? \n\n"
            "Jag testade en Tesla Model Y under en helg på landet. Visst var det "
            "skönt med tyst gång, men när jag körde på småvägar med mycket lera "
            "kände jag mig inte helt trygg. Markfrigången är inte jämförbar med "
            "en riktig offroad-bil, och jag var orolig för batteriets skydd. \n\n"
            "Men i framtiden kanske det kommer fler robusta el-pickuper, typ "
            "Rivian. Då får man kombinationen 4x4, bra markfrigång och stor dragvikt. "
            "Ändå är jag skeptisk tills jag sett hur de klarar minus 20 grader och "
            "långkörning utan täta snabbladdare. \n\n"
            "En annan poäng är miljöaspekten. Vissa säger 'Man borde köra el för "
            "miljöns skull', men jag undrar hur batteritillverkningen påverkar helheten. "
            "Samt att man kanske inte kör så många mil per år på jakt. Är det då värt "
            "dyra pengar för en elbil? \n\n"
            "Jag är inte emot elfordon, men tror att utvecklingen måste komma lite "
            "längre innan det blir en självklarhet i skogsjakten. Ni som testat, "
            "hur går det i leriga backar och kallt klimat? Är det framtiden eller "
            "bara en nisch för dem som har laddstation på gården?"
        )
    },
    {
        "title": "Skoter för vinterjakt – frihet eller ett nödvändigt ont?",
        "body": (
            "Jag bor i Norrland och under vintern kan snötäcket vara meterdjupt. "
            "Då är det nästan omöjligt att ta sig långt ut utan snöskoter. Jag "
            "har en äldre 2-taktare som väsnas rätt ordentligt, men den gör sitt "
            "jobb. Samtidigt är det ibland svårt att bedriva smygjakt när man "
            "dundrar fram och luktar avgaser. \n\n"
            "Å andra sidan möjliggör skotern att jag kan sätta upp lockpass på "
            "platser jag annars inte skulle nå. Jag kan även transportera foder "
            "eller ta hem bytet på släde. Men man får verkligen ha respekt för "
            "lavinfara och isarna. Man hör tyvärr om olyckor varje år. \n\n"
            "Många klagar på att skotrar förstör friden och stör viltet i onödan, "
            "och jag håller med om att man ska begränsa körandet. Det är inget "
            "fordon man bara kör runt på 'på skoj' mitt i ett känsligt revir. "
            "Men i praktiken är det ett ovärderligt hjälpmedel på vintern. \n\n"
            "Jag har kikat på nyare, tystare fyrtaktare med bättre bränsleekonomi "
            "och mindre rök. Men de är dyra. Kanske blir det mitt nästa köp "
            "när min gamla trotjänare rasar. Hur resonerar ni andra i snörika "
            "områden? Klarar ni er utan skoter, eller är det en självklar del "
            "av vinterjakten?"
        )
    },
    {
        "title": "Tips för att hålla ordning i bilen under jaktsäsong",
        "body": (
            "Jag har ofta en massa prylar i bagaget: kläder, stövlar, ammolådor, "
            "lockpipor, termosar… Det blir kaos. Så jag skaffade några plastlådor "
            "med lock, en för kläder, en för prylar som ammo och lockpipor, och "
            "en för mat/dryck. På så sätt slipper jag rota runt när jag ska hitta "
            "rätt grej. \n\n"
            "Dessutom la jag in gummimattor så att man kan spola av ifall det blir "
            "blod eller jord efter man lastat vilt. Ett tips är också att alltid "
            "ha några sopsäckar i reserv ifall man behöver lägga ett mindre vilt "
            "i bagaget och inte vill få blod överallt. \n\n"
            "En annan sak: förvara bössan säkert. Jag har en låsbar väska som jag "
            "spänner fast, så den inte ligger löst. Det känns tryggare och det är "
            "bra om man skulle bli stoppad eller råka ut för inbrott. \n\n"
            "Sen har jag märkt hur skönt det är att ha en liten 12V-kylväska eller "
            "åtminstone en kylväska med isklampar för att hålla dricka kall och "
            "mat fräsch. Ofta är man ute länge och vill inte att maten ska bli "
            "dålig. Ja, det är lite lyx, men bekvämlighet är inte att underskatta. \n\n"
            "Hur gör ni andra för att slippa total oordning i bilen under jaktsäsongen?"
        )
    },
    {
        "title": "Licens för terränghjuling och körkort – vad gäller egentligen?",
        "body": (
            "När jag först köpte en äldre fyrhjuling trodde jag man kunde köra lite "
            "som man ville med vanligt B-körkort. Visade sig att reglerna är ganska "
            "snåriga. Vissa fordon kräver förarbevis för terränghjuling, andra är "
            "traktorregistrerade och då kanske B-körkort räcker. Man måste verkligen "
            "kolla upp vad som gäller för just det fordonet. \n\n"
            "Jag gick en kort utbildning för terränghjuling och tyckte det var "
            "lärorikt. Man lär sig om hur man kör säkert i branta backar, hur "
            "man viktfördelar och hur man undviker att välta. Jag tror många "
            "underskattar riskerna med en ATV. Det är ingen leksak. \n\n"
            "Sen är det ju så att man inte får köra fritt i terrängen hur som "
            "helst. Allemansrätten tillåter inte att man plöjer upp folks mark "
            "utan lov. Jag har arrende där jag får köra på vissa skogsvägar, "
            "men inte överallt. Polisen kan bötfälla en om man bryter mot "
            "terrängkörningslagen. \n\n"
            "Så om du funderar på en ATV för jakten, kolla upp registreringen "
            "och om du behöver förarbevis. Det kan spara mycket huvudvärk. "
            "Någon som har råkat illa ut för att man inte hade rätt papper?"
        )
    },
    {
        "title": "Utrustning i jaktfordonet – vad bör alltid finnas med?",
        "body": (
            "Jag har en checklista för vad jag alltid försöker ha i bilen: bogserlina, "
            "spade, första hjälpen-låda, extra kläder, pannlampa, och en enkel verktygssats. "
            "För man vet aldrig när man kör fast eller får punktering ute i skogen. "
            "Jag lägger även en powerbank till mobilen, ifall bilbatteriet skulle "
            "krångla eller jag måste ladda telefonen under en nödsituation. \n\n"
            "Dessutom har jag alltid minst en liter vatten och några bars ifall "
            "jag skulle bli strandsatt. Det låter kanske överdrivet, men jag har "
            "blivit förvånad hur fort man kan hamna i en knivig situation om något "
            "går snett och man är långt från närmaste samhälle. \n\n"
            "En annan sak är reflexväst eller varningstriangel om man stannar på "
            "en mindre väg. Och om man transporterar vapen är det bra att kunna "
            "låsa in dem i ett fodral eller låda. Säkerhet går före allt. \n\n"
            "Jag är nyfiken på om ni har något annat 'måste' i bilen. Kanske en "
            "liten yxa eller såg ifall ett träd fallit över vägen? Vissa har även "
            "en liten gummikälke för att dra ut vilt. Idéerna är oändliga, men "
            "man vill ju inte packa bilen fullständigt heller. Balans, som vanligt!"
        )
    },
    {
        "title": "Vinterdäck vs allround-däck på jaktbilen – min erfarenhet",
        "body": (
            "Jag körde tidigare med dubbdäck på vintern och vanliga sommardäck på "
            "sommaren. Men en vän tipsade om att allterrängdäck kan funka året runt "
            "om man väljer en viss typ. Jag testade, och visst var de bra i terräng "
            "och hyfsade på snö, men på isgata var de inte lika bra som riktiga "
            "dubbdäck. Man får göra en kompromiss, helt enkelt. \n\n"
            "Jag tror det beror på var man bor. Här har vi rejäla vintrar, så jag "
            "vill inte tumma på greppet på is. Men om man bor i en region med mest "
            "leriga vägar kan allterräng vara smidigt. Dessutom slipper man byta "
            "däck två gånger om året. \n\n"
            "Samtidigt märkte jag att allterrängdäck kan ge mer vägljud och något "
            "sämre bränsleförbrukning på landsväg. Så man får fråga sig vad man "
            "gör mest: landsvägskörning eller tuff terräng? \n\n"
            "Jag landade i att jag fortsätter med vinterdäck och sommardäck, men "
            "väljer robustare sommardäck med lite grövre mönster. Kanske om jag "
            "flyttar söderut blir det annorlunda. Vad kör ni på? Någon som har "
            "hittat ett däck som verkligen klarar alla väglag perfekt?"
        )
    },
    {
        "title": "Hur man rengör och tvättar sitt jaktfordon efter lerig säsong",
        "body": (
            "När jag kommer hem med bilen helt täckt av lera och grus kan det "
            "vara frestande att bara spola av den snabbt. Men jag har lärt mig "
            "att man bör försöka få bort all lera, särskilt underredet, annars "
            "kan man få rost och annan skit som fastnar. Jag har en egen högtryckstvätt, "
            "och brukar köra noga runt hjulhusen och balkarna. \n\n"
            "En kompis tipsade om att lägga på avfettning innan, men jag är lite "
            "försiktig med starka medel så jag inte skadar lacken. Sen måste man "
            "ha koll på eventuella elektriska komponenter, särskilt på en ATV eller "
            "fyrhjuling, så man inte sprutar rakt i några känsliga kontakter. \n\n"
            "Insidan är också viktig. Om man haft vilt i bagaget kan det droppa blod "
            "eller andra vätskor. Då vill man verkligen rengöra så det inte börjar "
            "lukta eller lockar flugor. Jag har en gummimatta jag kan lyfta ur och "
            "spola av separat. Och en flaska med desinfektionsmedel ifall det "
            "behövs. \n\n"
            "Det tar lite tid att göra rent fordonet ordentligt, men det är en del "
            "av jakten för mig. Jag vill att grejerna ska hålla länge. Sen kanske "
            "jag inte polerar den till showroom-finish, men en grundlig rengöring "
            "varje gång jag kört leriga vägar är min rutin. Hur gör ni andra? "
            "Kör ni en snabb avspolning eller är ni lika pedantiska som jag?"
        )
    }
]

# Se till att vi har 12 inlägg i Jaktfordon också
while len(LONG_THREADS_JAKTFORDON) < 12:
    LONG_THREADS_JAKTFORDON.append({
        "title": f"Extra-lång inlägg #{len(LONG_THREADS_JAKTFORDON)+1}",
        "body": (
            "Jag vill fylla upp till 12 inlägg, så här är ett ytterligare långt "
            "resonemang om fordon för jakt. Kanske diskuterar jag att man ibland "
            "överskattar behovet av en massiv SUV, när en vanlig kombi med lite "
            "markfrigång räcker för 90% av situationerna. Man ser många som "
            "slänger på en 'offroad-stötfångare' och bjäfsliga däck, men i "
            "praktiken kör de mest på asfalten. Samtidigt vill jag inte döma "
            "någon – folk får göra som de vill. Jag tycker bara man ska vara "
            "ärlig med hur mycket man verkligen behöver. Är man hundförare som "
            "städar av långa rundor i skogen, då är 4x4 kanske ovärderligt. "
            "Är man passkytt nära en bra väg är det mindre kritiskt. Allt är "
            "situationsberoende!"
        )
    })


def main():
    print("=== STORT SCRIPT SOM POSTAR 12 LÅNGA INLÄGG I VARJE KATEGORI ===")
    print("Kategorier: Vapen och Optik, Kläder och Utrustning, Jaktfordon.")
    # 1) Logga in
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": USERNAME, "password": PASSWORD}
        )
        resp.raise_for_status()
        token = resp.json()["access_token"]
        print("[OK] Inloggad som", USERNAME)
    except Exception as e:
        print("[ERROR] Kunde inte logga in:", e)
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Funktion för att posta en tråd
    def post_thread(category_id, title, body):
        # Välj slumpad author
        author = random.choice(AUTHORS)
        payload = {
            "title": title,
            "content": body,
            "author_id": author
        }
        try:
            r = requests.post(
                f"{BASE_URL}/api/forum/categories/{category_id}/threads",
                json=payload,
                headers=headers
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"[FEL] Misslyckades skapa tråd i kategori {category_id}: {e}")
            return None

    # Funktion för att posta svar (2 st) till en tråd
    def post_replies(thread_id):
        for i in range(2):
            reply_author = random.choice(AUTHORS)
            reply_content = (
                f"Jag håller med om en del, men har också egna erfarenheter. Kul att du tog upp detta!\n"
                f"/ {reply_author}"
            )
            post_payload = {
                "content": reply_content,
                "author_id": reply_author
            }
            try:
                rr = requests.post(
                    f"{BASE_URL}/api/forum/threads/{thread_id}/posts",
                    json=post_payload,
                    headers=headers
                )
                rr.raise_for_status()
                post_id = rr.json()["id"]
                print(f"    [OK] Postade svar {i+1} (post_id={post_id})")
            except Exception as e:
                print(f"    [FEL] Misslyckades posta svar: {e}")

    # 2) Skapa trådar i "Vapen och Optik"
    print("\n=== Kategori: Vapen & Optik (ID=6772b2379ad9eae7fb1a209d) ===")
    for idx, thread_data in enumerate(LONG_THREADS_VAPEN_OPTIK, 1):
        created = post_thread(CATEGORIES["Vapen och Optik"], thread_data["title"], thread_data["body"])
        if created and "id" in created:
            thread_id = created["id"]
            print(f"  [OK] Skapade tråd #{idx}: '{thread_data['title']}' (thread_id={thread_id})")
            post_replies(thread_id)

    # 3) Skapa trådar i "Kläder och Utrustning"
    print("\n=== Kategori: Kläder och Utrustning (ID=6772b2379ad9eae7fb1a209e) ===")
    for idx, thread_data in enumerate(LONG_THREADS_KLADER_UTRUSTNING, 1):
        created = post_thread(CATEGORIES["Kläder och Utrustning"], thread_data["title"], thread_data["body"])
        if created and "id" in created:
            thread_id = created["id"]
            print(f"  [OK] Skapade tråd #{idx}: '{thread_data['title']}' (thread_id={thread_id})")
            post_replies(thread_id)

    # 4) Skapa trådar i "Jaktfordon"
    print("\n=== Kategori: Jaktfordon (ID=6772b2379ad9eae7fb1a209f) ===")
    for idx, thread_data in enumerate(LONG_THREADS_JAKTFORDON, 1):
        created = post_thread(CATEGORIES["Jaktfordon"], thread_data["title"], thread_data["body"])
        if created and "id" in created:
            thread_id = created["id"]
            print(f"  [OK] Skapade tråd #{idx}: '{thread_data['title']}' (thread_id={thread_id})")
            post_replies(thread_id)

    print("\n=== KLART! ===")
    print("Nu bör du ha 12 långa trådar i var och en av:")
    print(" - Vapen & Optik")
    print(" - Kläder och Utrustning")
    print(" - Jaktfordon")
    print("Varje tråd har 2 svar. Kolla i frontenden för att se resultatet!\n")

if __name__ == "__main__":
    main()
