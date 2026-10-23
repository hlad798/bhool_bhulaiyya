"""
questions.py - The riddles that guard every dead end of the haveli.

Nothing academic and no calculations: just riddles, ghost jokes, trick
questions, Gen Z slang, pop culture and silly fun. Each question has an
id like 'z07'. The correct answer is NEVER sent to the browser until the
player answers. In the bank, the correct option is always written first;
the server shuffles the options before sending them.

Tier 1 = easier (early levels), tier 2 = trickier (later levels).

The browser remembers which questions it has been asked this session and the
server never hands out one of those again until every question has been seen.
"""


def Q(qid, tier, kind, text, options):
    return {'id': qid, 'tier': tier, 'kind': kind, 'text': text, 'options': options, 'answer': 0}


BANK = [
    # ============================================================ TIER 1
    # ---- Gen Z slang
    Q('z01', 1, 'Gen Z check', 'If your friend says "no cap", what do they mean?',
      ['No lie, for real', 'They lost their hat', 'There is no limit', 'Stop talking']),
    Q('z02', 1, 'Gen Z check', 'Someone has "rizz". What do they have?',
      ['Charm - they can flirt well', 'A cold', 'A new phone', 'Too much homework']),
    Q('z03', 1, 'Gen Z check', 'If a song "slaps", it is...',
      ['Really, really good', 'Very loud', 'Rude', 'Too short']),
    Q('z04', 1, 'Gen Z check', 'What does it mean to "ghost" someone?',
      ['Suddenly stop replying to them', 'Scare them at night', 'Dress up as a ghost', 'Follow them everywhere']),
    Q('z05', 1, 'Gen Z check', 'If something is "mid", it is...',
      ['Average, nothing special', 'In the middle of the room', 'Amazing', 'Midnight-themed']),
    Q('z06', 1, 'Gen Z check', '"Sus" is short for...',
      ['Suspicious', 'Super', 'Sushi', 'Sustainable']),
    Q('z07', 1, 'Gen Z check', 'Your friend replies "bet". What do they mean?',
      ['Okay, deal', 'Let\'s gamble', 'You\'re wrong', 'Goodbye forever']),
    Q('z08', 1, 'Gen Z check', 'What does FOMO stand for?',
      ['Fear Of Missing Out', 'Friends Only, Move On', 'Free Online Movie Offer', 'Find Our Missing Owl']),
    Q('z09', 1, 'Gen Z check', 'When someone says "she ate", they mean she...',
      ['Did amazingly well', 'Was very hungry', 'Finished the food', 'Left early']),
    Q('z10', 1, 'Gen Z check', 'Someone tells you to "touch grass". What should you do?',
      ['Go outside and get off the internet', 'Start gardening', 'Mow the lawn', 'Eat a salad']),
    # ---- pop culture
    Q('p01', 1, 'Pop culture', 'Which superhero is called the "web-slinger"?',
      ['Spider-Man', 'Batman', 'Iron Man', 'Shaktimaan']),
    Q('p02', 1, 'Pop culture', 'In Among Us, what are the bad guys called?',
      ['Impostors', 'Zombies', 'Aliens', 'Ninjas']),
    Q('p03', 1, 'Pop culture', 'What colour is a Minecraft Creeper?',
      ['Green', 'Purple', 'Red', 'Blue']),
    Q('p04', 1, 'Pop culture', 'Which school does Harry Potter go to?',
      ['Hogwarts', 'Doon School', 'Xavier\'s', 'Narnia High']),
    Q('p05', 1, 'Pop culture', 'Which Bollywood star is often called "King Khan"?',
      ['Shah Rukh Khan', 'Salman Khan', 'Aamir Khan', 'Saif Ali Khan']),
    Q('p06', 1, 'Pop culture', 'What gives Chhota Bheem his super strength?',
      ['Laddoos', 'Spinach', 'Samosas', 'Mango juice']),
    Q('p07', 1, 'Pop culture', 'SpongeBob SquarePants lives in a...',
      ['Pineapple', 'Coconut', 'Shell', 'Treasure chest']),
    Q('p08', 1, 'Pop culture', 'What colour are the Smurfs?',
      ['Blue', 'Green', 'Yellow', 'Pink']),
    Q('p09', 1, 'Pop culture', 'Which Doraemon gadget takes you anywhere instantly?',
      ['The Anywhere Door', 'The Bamboo-Copter', 'The Time Machine', 'Memory Bread']),
    Q('p10', 1, 'Pop culture', 'In gaming, what does "AFK" mean?',
      ['Away From Keyboard', 'Always Fighting Knights', 'A Fast Kill', 'Attack From Kitchen']),
    # ---- riddles and jokes
    Q('r01', 1, 'Ghost joke', 'What do ghosts spread on their toast?',
      ['Scream cheese', 'Peanut butter', 'Honey', 'Mango jam']),
    Q('r02', 1, 'Ghost joke', 'What is a ghost\'s favourite dessert?',
      ['I-scream', 'Gulab jamun', 'Rasgulla', 'Kulfi']),
    Q('r03', 1, 'Ghost joke', 'Which room do ghosts always avoid?',
      ['The living room', 'The kitchen', 'The bathroom', 'The terrace']),
    Q('r04', 1, 'Riddle', 'What has to be broken before you can use it?',
      ['An egg', 'A promise', 'A phone', 'A haveli wall']),
    Q('r05', 1, 'Riddle', 'What gets BIGGER the more you take away from it?',
      ['A hole', 'Your phone bill', 'A samosa', 'Your patience']),
    Q('r06', 1, 'Trick question', 'Which word is always spelled wrong in the dictionary?',
      ['Wrong', 'Haveli', 'Rhythm', 'Ghost']),
    Q('r07', 1, 'Riddle', 'What has lots of teeth but can never bite?',
      ['A comb', 'A crocodile', 'A dentist', 'A shark']),
    Q('r08', 1, 'Riddle', 'Which room has no doors and no windows?',
      ['A mushroom', 'A bathroom', 'A classroom', 'A storeroom']),
    Q('r09', 1, 'Silly joke', 'What do you call cheese that isn\'t yours?',
      ['Nacho cheese', 'Paneer', 'Stolen cheese', 'Mozzarella']),
    Q('r10', 1, 'Silly joke', 'What do you call a sleeping dinosaur?',
      ['A dino-snore', 'A fossil', 'A lizard', 'Extinct']),
    Q('r11', 1, 'Horror logic', 'In a horror movie, what is the WORST idea?',
      ['Splitting up to check the strange noise', 'Turning on all the lights', 'Leaving the haunted house', 'Calling for help']),
    Q('r12', 1, 'Desi life', 'What does every Indian mom say when you can\'t find something?',
      ['"If I come and find it, then what?"', '"Let\'s buy a new one"', '"It\'s lost forever"', '"Ask your father"']),

    # ============================================================ TIER 2
    # ---- Gen Z slang
    Q('z21', 2, 'Gen Z check', '"It\'s giving..." is used to say something...',
      ['Has a certain vibe', 'Is a free gift', 'Is donating money', 'Is too expensive']),
    Q('z22', 2, 'Gen Z check', 'What does "lowkey" mean?',
      ['Kind of, or secretly', 'Very loudly', 'A cheap key', 'Low battery']),
    Q('z23', 2, 'Gen Z check', 'Someone who is "delulu" is...',
      ['Delusional, living in a fantasy', 'Very tired', 'A great dancer', 'Always late']),
    Q('z24', 2, 'Gen Z check', 'Calling someone an "NPC" means they act like...',
      ['A boring background game character', 'A national police chief', 'A new phone', 'A nice person']),
    Q('z25', 2, 'Gen Z check', 'What is "main character energy"?',
      ['Acting like the star of the story', 'Having the most battery', 'Being the class monitor', 'Eating the main course']),
    Q('z26', 2, 'Gen Z check', 'A "situationship" is...',
      ['A relationship with no clear label', 'A boat trip', 'A group project', 'A business deal']),
    Q('z27', 2, 'Gen Z check', 'If someone is "cooked", they are...',
      ['In big trouble, it\'s over for them', 'A great chef', 'Very warm', 'Ready for dinner']),
    Q('z28', 2, 'Gen Z check', 'What is an "ick"?',
      ['A small thing that suddenly puts you off someone', 'A type of insect', 'A sneeze', 'A dance move']),
    # ---- pop culture
    Q('p21', 2, 'Pop culture', 'What is the name of Thor\'s hammer?',
      ['Mjolnir', 'Stormbreaker', 'Excalibur', 'Gada']),
    Q('p22', 2, 'Pop culture', 'Which cricketer do fans lovingly call "Thala"?',
      ['MS Dhoni', 'Virat Kohli', 'Rohit Sharma', 'Sachin Tendulkar']),
    Q('p23', 2, 'Pop culture', 'In Squid Game, which children\'s game is played first?',
      ['Red Light, Green Light', 'Tug of war', 'Marbles', 'Hide and seek']),
    Q('p24', 2, 'Pop culture', 'In BGMI and PUBG, "Winner Winner..." what?',
      ['Chicken Dinner', 'Paneer Dinner', 'Pizza Party', 'Victory Royale']),
    Q('p25', 2, 'Pop culture', 'Which superstar is known as "Thalaivar"?',
      ['Rajinikanth', 'Kamal Haasan', 'Mohanlal', 'Prabhas']),
    Q('p26', 2, 'Pop culture', 'What is the Upside Down in Stranger Things?',
      ['A dark, monster-filled mirror world', 'A rollercoaster', 'A school club', 'A secret pizza shop']),
    Q('p27', 2, 'Pop culture', 'What is the name of Pikachu\'s trainer in the Pokemon cartoon?',
      ['Ash', 'Brock', 'Gary', 'Nobita']),
    Q('p28', 2, 'Pop culture', 'Which app made "streaks" with friends famous?',
      ['Snapchat', 'LinkedIn', 'Google Maps', 'Calculator']),
    Q('p29', 2, 'Pop culture', 'What does "GOAT" mean when fans call a player that?',
      ['Greatest Of All Time', 'Got Out At Toss', 'Good Old Average Team', 'An actual goat']),
    Q('p30', 2, 'Pop culture', 'What are short looping videos on Instagram called?',
      ['Reels', 'Shorts', 'Tiktoks', 'Clips']),
    # ---- riddles and tricks
    Q('t01', 2, 'Trick question', 'A rooster lays an egg on a sloping roof. Which way does the egg roll?',
      ['Roosters don\'t lay eggs', 'Left', 'Right', 'Straight down']),
    Q('t02', 2, 'Trick question', 'Which word becomes SHORTER when you add two letters to it?',
      ['Short', 'Long', 'Small', 'Tiny']),
    Q('t03', 2, 'Trick question', 'Mary\'s father has five daughters: Nana, Nene, Nini, Nono... What is the fifth one called?',
      ['Mary', 'Nunu', 'Nanu', 'Manjulika']),
    Q('t04', 2, 'Riddle', 'What can you catch but never throw?',
      ['A cold', 'A ball', 'A fish', 'A bus']),
    Q('t05', 2, 'Riddle', 'If you have me, you want to share me. If you share me, I\'m gone. What am I?',
      ['A secret', 'Money', 'Biryani', 'A shadow']),
    Q('t06', 2, 'Riddle', 'What breaks as soon as you say its name?',
      ['Silence', 'A mirror', 'A promise', 'A heart']),
    Q('t07', 2, 'Riddle', 'I\'m tall when I\'m young and short when I\'m old. What am I?',
      ['A candle', 'A tree', 'A pencil', 'Your grandpa']),
    Q('t08', 2, 'Ghost joke', 'Why did the ghost go into the lift?',
      ['To lift its spirits', 'It was tired', 'To scare people', 'The stairs were haunted']),
    Q('t09', 2, 'Silly joke', 'Why can\'t a bicycle stand up on its own?',
      ['It\'s two-tired', 'It has no legs', 'It\'s lazy', 'Nobody parked it']),
    Q('t10', 2, 'Trick question', 'A man was out in heavy rain with no umbrella and no hat, but not one hair got wet. How?',
      ['He was bald', 'He ran fast', 'It was ghost rain', 'He held his breath']),
    Q('t11', 2, 'Riddle', 'What is always in front of you but can never be seen?',
      ['The future', 'Your nose', 'A mirror', 'Manjulika']),
    Q('t12', 2, 'Trick question', 'Where does Friday come before Thursday?',
      ['In the dictionary', 'In Australia', 'Nowhere', 'In a leap year']),
    Q('t13', 2, 'Horror logic', 'You hear your name whispered from a dark, locked room. What do you do?',
      ['Run the other way', 'Open it and say "hello?"', 'Go in without a torch', 'Whisper back']),
    Q('t14', 2, 'Desi life', 'What does "5 minutes" mean when an Indian friend says "I\'m 5 minutes away"?',
      ['They haven\'t even left home', 'Exactly 5 minutes', 'They are outside your door', '5 seconds']),

    # ============================================================ MORE - TIER 1
    # ---- Gen Z slang
    Q('z11', 1, 'Gen Z check', 'Your friend says "that\'s a W". What do they mean?',
      ['That\'s a win', 'That\'s a warning', 'That\'s weird', 'It\'s Wednesday']),
    Q('z12', 1, 'Gen Z check', 'If someone is "taking an L", they are...',
      ['Taking a loss', 'Taking a lunch break', 'Taking a long nap', 'Taking a left turn']),
    Q('z13', 1, 'Gen Z check', 'Someone replies "I\'m dead" to your joke. What do they mean?',
      ['It was extremely funny', 'They feel unwell', 'They turned into a ghost', 'They want to sleep']),
    Q('z14', 1, 'Gen Z check', 'What is a "vibe check"?',
      ['Checking someone\'s mood or energy', 'Testing your phone\'s vibration', 'A dance contest', 'A school inspection']),
    Q('z15', 1, 'Gen Z check', 'If someone "slayed" their outfit, they...',
      ['Looked amazing', 'Ripped it', 'Wore it backwards', 'Borrowed it']),
    Q('z16', 1, 'Gen Z check', 'What does "IYKYK" stand for?',
      ['If You Know, You Know', 'I Yell, You Keep Yelling', 'In Your Kitchen, Yesterday\'s Kebab', 'I\'m Young, Keep Your Keys']),
    Q('z17', 1, 'Gen Z check', '"Spill the tea" means...',
      ['Share the gossip', 'Make some chai', 'Clean the table', 'Stop talking']),
    Q('z18', 1, 'Gen Z check', 'Someone who is "extra" is...',
      ['Over the top and dramatic', 'A spare player', 'Very quiet', 'Always on time']),
    Q('z19', 1, 'Gen Z check', 'A party that was "lit" was...',
      ['Exciting and fun', 'Boring', 'Too dark', 'Cancelled']),
    Q('z20', 1, 'Gen Z check', 'To "stan" someone means to be their...',
      ['Huge, devoted fan', 'Strict teacher', 'Bodyguard', 'Neighbour']),
    # ---- pop culture
    Q('p11', 1, 'Pop culture', 'Who is Doraemon\'s best friend?',
      ['Nobita', 'Shinchan', 'Pikachu', 'Chhota Bheem']),
    Q('p12', 1, 'Pop culture', 'In Minecraft, which block do you need to build a Nether portal?',
      ['Obsidian', 'Diamond', 'Gold', 'Sand']),
    Q('p13', 1, 'Pop culture', 'Which superhero famously says "I am Iron Man"?',
      ['Tony Stark', 'Bruce Wayne', 'Peter Parker', 'Steve Rogers']),
    Q('p14', 1, 'Pop culture', 'Which animated film has the song "Let It Go"?',
      ['Frozen', 'Moana', 'Tangled', 'Coco']),
    Q('p15', 1, 'Pop culture', 'In Super Mario, what does a Super Mushroom do?',
      ['Makes Mario bigger', 'Makes him invisible', 'Makes him fly', 'Ends the game']),
    Q('p16', 1, 'Pop culture', 'Which Indian cricketer is nicknamed "Hitman"?',
      ['Rohit Sharma', 'Virat Kohli', 'MS Dhoni', 'Hardik Pandya']),
    Q('p17', 1, 'Pop culture', 'In which game do you say "checkmate"?',
      ['Chess', 'Kabaddi', 'Ludo', 'Carrom']),
    Q('p18', 1, 'Pop culture', 'Which app has a green owl that won\'t let you skip your lessons?',
      ['Duolingo', 'WhatsApp', 'Spotify', 'Snapchat']),
    Q('p19', 1, 'Pop culture', 'Which superhero protects Gotham City?',
      ['Batman', 'Superman', 'Spider-Man', 'Thor']),
    Q('p20', 1, 'Pop culture', 'Which villain says "Mogambo khush hua"?',
      ['Mogambo in Mr. India', 'Gabbar in Sholay', 'Shakaal in Shaan', 'Kancha in Agneepath']),
    Q('p41', 1, 'Pop culture', 'What is the name of the dacoit villain in Sholay?',
      ['Gabbar Singh', 'Mogambo', 'Shakaal', 'Crime Master Gogo']),
    Q('p42', 1, 'Pop culture', 'Which mobile game is all about matching colourful sweets?',
      ['Candy Crush', 'Subway Surfers', 'Temple Run', 'Ludo King']),
    Q('p43', 1, 'Pop culture', 'In Subway Surfers, who chases you along the tracks?',
      ['An inspector and his dog', 'A ghost', 'A dinosaur', 'Your mom']),
    Q('p44', 1, 'Pop culture', 'What are the little yellow helpers in Despicable Me called?',
      ['Minions', 'Smurfs', 'Oompa-Loompas', 'Gremlins']),
    # ---- riddles and jokes
    Q('r13', 1, 'Riddle', 'What has one head, one foot and four legs?',
      ['A bed', 'A table', 'A ghost', 'A dog']),
    Q('r14', 1, 'Riddle', 'What has lots of words but never speaks?',
      ['A book', 'A parrot', 'A phone', 'A ghost']),
    Q('r15', 1, 'Riddle', 'What goes up when the rain comes down?',
      ['An umbrella', 'A kite', 'A rooftop', 'A balloon']),
    Q('r16', 1, 'Riddle', 'What has a neck but no head?',
      ['A bottle', 'A pillow', 'A chair', 'A spoon']),
    Q('r17', 1, 'Riddle', 'What has hands but can\'t clap?',
      ['A clock', 'A statue', 'A glove', 'A ghost']),
    Q('r18', 1, 'Riddle', 'What runs but never walks, and has a mouth but never talks?',
      ['A river', 'A ghost', 'A clock', 'A car']),
    Q('r19', 1, 'Riddle', 'The more of them you take, the more you leave behind. What are they?',
      ['Footsteps', 'Selfies', 'Breaths', 'Coins']),
    Q('r20', 1, 'Riddle', 'What kind of tree can you carry in your hand?',
      ['A palm', 'A banyan', 'A mango tree', 'A neem tree']),
    Q('r21', 1, 'Riddle', 'What is full of holes but still holds water?',
      ['A sponge', 'A bucket', 'A net', 'A glass']),
    Q('r22', 1, 'Riddle', 'What has keys but can\'t open a single lock?',
      ['A keyboard', 'A haveli', 'A locksmith', 'A diary']),
    Q('r23', 1, 'Silly joke', 'What did the zero say to the eight?',
      ['Nice belt!', 'You look tired', 'Move aside', 'Happy birthday']),
    Q('r24', 1, 'Silly joke', 'Why did the scarecrow win an award?',
      ['He was outstanding in his field', 'He scared away Manjulika', 'He was the tallest', 'He bribed the judges']),
    Q('r25', 1, 'Silly joke', 'What do you call a fish with no eyes?',
      ['A fsh', 'A blind fish', 'Nemo', 'A ghost fish']),
    Q('r26', 1, 'Trick question', 'Which is heavier: a kilo of feathers or a kilo of bricks?',
      ['They weigh the same', 'The bricks', 'The feathers', 'Depends on the bricks']),
    Q('r27', 1, 'Riddle', 'What goes up but never comes down?',
      ['Your age', 'A kite', 'A ball', 'A lift']),
    Q('r28', 1, 'Riddle', 'What can you hold in your right hand but never in your left hand?',
      ['Your left elbow', 'A cup of chai', 'A phone', 'A pen']),
    Q('r29', 1, 'Trick question', 'How many months have 28 days?',
      ['All of them', 'Only February', 'None', 'Just two']),
    Q('r30', 1, 'Ghost joke', 'What do you call a ghost\'s mum and dad?',
      ['Transparents', 'Uncle and aunty', 'The elders', 'Grandparents']),
    Q('r31', 1, 'Ghost joke', 'Why don\'t skeletons ever fight each other?',
      ['They don\'t have the guts', 'They are best friends', 'They are scared of Manjulika', 'They are on leave']),
    Q('r32', 1, 'Ghost joke', 'What is a ghost\'s favourite fruit?',
      ['Boo-berries', 'Mangoes', 'Bananas', 'Grapes']),
    Q('r33', 1, 'Riddle', 'What gets wetter the more it dries?',
      ['A towel', 'A sponge', 'Rain', 'Soap']),
    Q('r34', 1, 'Ghost joke', 'Where do ghosts like to go swimming?',
      ['In the Dead Sea', 'In a pool', 'In the bathtub', 'In the river Ganga']),
    # ---- desi life and horror logic
    Q('d01', 1, 'Desi life', 'In an Indian home, what is inside the big blue cookie tin?',
      ['Sewing stuff, never cookies', 'Fresh cookies', 'Money', 'Nothing']),
    Q('d02', 1, 'Desi life', 'According to Indian relatives, what cures every illness?',
      ['Haldi doodh', 'Cold drink', 'Ice cream', 'Chips']),
    Q('d03', 1, 'Desi life', 'You ask your parents for money. What do they say?',
      ['"Do you think money grows on trees?"', '"Sure, take more"', '"Here is my card"', '"Spend it all"']),
    Q('d04', 1, 'Desi life', 'At a desi wedding, which dance move do uncles never skip?',
      ['The naagin dance', 'The moonwalk', 'Ballet', 'The robot']),
    Q('h01', 1, 'Horror logic', 'The lights flicker and a door creaks open by itself. Best plan?',
      ['Leave the house right now', 'Investigate alone', 'Say "who\'s there?" and wait', 'Go down to the basement']),
    Q('h02', 1, 'Horror logic', 'In horror films, who usually survives till the end?',
      ['The one who listens to the warnings', 'The one who wanders off alone', 'The one who reads the cursed book aloud', 'The one who says "I\'ll be right back"']),

    # ============================================================ MORE - TIER 2
    # ---- Gen Z slang
    Q('z29', 2, 'Gen Z check', 'What are "aura points"?',
      ['Imaginary points for being cool', 'Gym rewards', 'Exam grades', 'Phone battery']),
    Q('z30', 2, 'Gen Z check', 'What is a "glow up"?',
      ['A big improvement in looks or confidence', 'Turning on the lights', 'A fever', 'A firework show']),
    Q('z31', 2, 'Gen Z check', 'If a song lives "rent free" in your head, it...',
      ['Keeps playing in your head nonstop', 'Is a free download', 'Is about a house', 'Is very short']),
    Q('z32', 2, 'Gen Z check', 'What does "ate and left no crumbs" mean?',
      ['Did something perfectly', 'Cleaned the plate', 'Was very hungry', 'Left the party early']),
    Q('z33', 2, 'Gen Z check', 'Food that is "bussin" is...',
      ['Really tasty', 'Cold', 'Too spicy', 'Gone bad']),
    Q('z34', 2, 'Gen Z check', 'If you got "caught in 4K", you were...',
      ['Caught red-handed with clear proof', 'Buying a new TV', 'Taking a great photo', 'Winning a prize']),
    Q('z35', 2, 'Gen Z check', 'What is a "red flag" in a person?',
      ['A warning sign about how they behave', 'A cricket fan', 'A traffic signal', 'A lucky charm']),
    Q('z36', 2, 'Gen Z check', 'If a meme is "sending me", it is...',
      ['Making me laugh a lot', 'Being posted to me', 'Sending me home', 'Making me angry']),
    # ---- pop culture
    Q('p31', 2, 'Pop culture', 'Which anime is about a boy who wants to become King of the Pirates?',
      ['One Piece', 'Naruto', 'Dragon Ball', 'Death Note']),
    Q('p32', 2, 'Pop culture', 'What is the name of Naruto\'s home village?',
      ['The Hidden Leaf Village', 'The Hidden Sand Village', 'The Hidden Mist Village', 'The Hidden Cloud Village']),
    Q('p33', 2, 'Pop culture', 'In Stranger Things, which girl with powers loves Eggo waffles?',
      ['Eleven', 'Max', 'Nancy', 'Robin']),
    Q('p34', 2, 'Pop culture', '"Rishte mein toh hum tumhare baap lagte hai" is from which film?',
      ['Shahenshah', 'Deewaar', 'Sholay', 'Agneepath']),
    Q('p35', 2, 'Pop culture', 'Who plays the title role in Pushpa?',
      ['Allu Arjun', 'Prabhas', 'Yash', 'Ram Charan']),
    Q('p36', 2, 'Pop culture', 'Which actor played Rocky Bhai in the KGF films?',
      ['Yash', 'Allu Arjun', 'Prabhas', 'Vijay']),
    Q('p37', 2, 'Pop culture', 'Which video game is set in the city of Los Santos?',
      ['GTA V', 'Minecraft', 'Fortnite', 'Free Fire']),
    Q('p38', 2, 'Pop culture', 'In Pokemon, what type is Charmander?',
      ['Fire', 'Water', 'Grass', 'Electric']),
    Q('p39', 2, 'Pop culture', 'Which Marvel villain snapped away half of all life?',
      ['Thanos', 'Loki', 'Ultron', 'Venom']),
    Q('p45', 2, 'Pop culture', 'In Money Heist, whose face is on the robbers\' masks?',
      ['Salvador Dali', 'Albert Einstein', 'Charlie Chaplin', 'Pablo Picasso']),
    Q('p46', 2, 'Pop culture', 'The song "Naatu Naatu" is from which film?',
      ['RRR', 'Baahubali', 'Pushpa', 'Jawan']),
    Q('p47', 2, 'Pop culture', 'What does "GG" mean at the end of an online game?',
      ['Good game', 'Go go', 'Get going', 'Great goal']),
    Q('p48', 2, 'Pop culture', 'In Baahubali 2, everyone wanted to know why Kattappa...',
      ['Killed Baahubali', 'Left the kingdom', 'Became king', 'Married Devasena']),
    # ---- riddles, tricks and ghost jokes
    Q('t15', 2, 'Riddle', 'I have cities but no houses, forests but no trees, and water but no fish. What am I?',
      ['A map', 'A dream', 'A painting', 'A haveli']),
    Q('t16', 2, 'Riddle', 'What has a head and a tail but no body?',
      ['A coin', 'A snake', 'A comet', 'A ghost']),
    Q('t17', 2, 'Riddle', 'What goes through cities and fields but never moves?',
      ['A road', 'A train', 'The wind', 'A river']),
    Q('t18', 2, 'Riddle', 'Forward I\'m heavy, but backward I\'m NOT. What am I?',
      ['A ton', 'A brick', 'An elephant', 'A truck']),
    Q('t19', 2, 'Riddle', 'What has four wheels and flies?',
      ['A garbage truck', 'An aeroplane', 'A haunted car', 'A dragon']),
    Q('t20', 2, 'Riddle', 'What can you break without ever touching it?',
      ['A promise', 'A glass', 'A wall', 'A bone']),
    Q('t21', 2, 'Riddle', 'I\'m black when you buy me, red when you use me, and grey when you throw me away. What am I?',
      ['Charcoal', 'A tomato', 'A phone', 'Hair dye']),
    Q('t22', 2, 'Riddle', 'What has one eye but cannot see?',
      ['A needle', 'A pirate', 'A chapati', 'A spoon']),
    Q('t23', 2, 'Riddle', 'What comes down but never goes up?',
      ['Rain', 'A lift', 'A kite', 'Smoke']),
    Q('t24', 2, 'Trick question', 'A plane crashes exactly on the border of two countries. Where do they bury the survivors?',
      ['You don\'t bury survivors', 'In the first country', 'In the second country', 'On the border']),
    Q('t25', 2, 'Riddle', 'What can fill a whole room but takes up no space?',
      ['Light', 'Furniture', 'Water', 'Boxes']),
    Q('t26', 2, 'Trick question', 'If you drop a yellow hat into the Red Sea, what does it become?',
      ['Wet', 'Red', 'Orange', 'Lost']),
    Q('t27', 2, 'Riddle', 'What do you throw out when you want to use it, and pull in when you don\'t?',
      ['An anchor', 'A ball', 'A net', 'A coin']),
    Q('t28', 2, 'Riddle', 'What belongs to you, but other people use it more than you do?',
      ['Your name', 'Your phone', 'Your bed', 'Your shoes']),
    Q('t29', 2, 'Ghost joke', 'Why are ghosts such bad liars?',
      ['You can see right through them', 'They forget the story', 'They stutter', 'They talk too slowly']),
    Q('t30', 2, 'Ghost joke', 'What kind of street does a ghost live on?',
      ['A dead end', 'A one-way street', 'A highway', 'A busy market']),
    Q('t31', 2, 'Ghost joke', 'What do ghosts wear in the rain?',
      ['Boo-ts', 'Raincoats', 'Sandals', 'Hats']),
    Q('t32', 2, 'Silly joke', 'Why did the cookie go to the doctor?',
      ['It was feeling crummy', 'It broke a leg', 'It had a fever', 'It was too sweet']),
    Q('t33', 2, 'Riddle', 'What has legs but doesn\'t walk?',
      ['A table', 'A spider', 'A ghost', 'A cat']),
    # ---- horror logic and desi life
    Q('h11', 2, 'Horror logic', 'Your phone torch dies in a haunted maze. The smart move is...',
      ['Stay calm and follow the wall', 'Scream as loud as you can', 'Run in circles', 'Call out to the ghost']),
    Q('h12', 2, 'Horror logic', 'A creepy old doll slowly turns its head towards you. What do you do?',
      ['Leave it and get out', 'Hug it', 'Take a selfie with it', 'Give it a name']),
    Q('h13', 2, 'Horror logic', 'A mirror shows a woman standing behind you. You turn - nobody is there. Now what?',
      ['Do NOT look back at the mirror, just leave', 'Look again, closer', 'Wave at her', 'Fix your hair']),
    Q('d11', 2, 'Desi life', 'What happens if you say "I\'m bored" in front of an Indian parent?',
      ['You get a list of chores', 'You get money', 'You get a holiday', 'You get a new phone']),
    Q('d12', 2, 'Desi life', 'At a family function, which question will an aunty definitely ask?',
      ['"Beta, what are your marks?"', '"What is your favourite colour?"', '"Do you believe in ghosts?"', '"Can I help clean up?"']),
    Q('d13', 2, 'Desi life', 'What does an Indian dad say about the AC?',
      ['"Keep it at 24, electricity isn\'t free!"', '"Make it colder!"', '"Leave it on all day"', '"Buy another one"']),
    Q('d14', 2, 'Desi life', 'What is the legendary weapon of every desi mom?',
      ['The chappal', 'A sword', 'A water gun', 'A pillow']),
    Q('d15', 2, 'Desi life', 'You come home late. What is waiting for you?',
      ['Mom, at the door, with "the look"', 'A party', 'Free pizza', 'A new bike']),
]

BANK_BY_ID = {q['id']: q for q in BANK}


def _public_question(q, rng):
    options = list(q['options'])
    rng.shuffle(options)
    return {'id': q['id'], 'text': q['kind'] + ': ' + q['text'], 'options': options}


def select_questions(count, tiers, rng):
    """Pick `count` questions for one level, cycling through the pool without repeats where possible."""
    pool = []
    chosen = []
    for _ in range(count):
        if not pool:
            pool = [q for q in BANK if q['tier'] in tiers]
            rng.shuffle(pool)
        chosen.append(_public_question(pool.pop(), rng))
    return chosen


def pick_question(tiers, seen, rng):
    """One question for a dead end, never one the player has already seen this session.
    Prefers this level's difficulty; if those are all used up, takes any unseen one;
    only when the whole bank has been seen does it start over (reset=True)."""
    seen = set(str(x) for x in (seen or []))
    pool = [q for q in BANK if q['tier'] in tiers and q['id'] not in seen]
    if not pool:
        pool = [q for q in BANK if q['id'] not in seen]
    reset = False
    if not pool:
        pool = [q for q in BANK if q['tier'] in tiers]
        reset = True
    return _public_question(rng.choice(pool), rng), reset


def check_answer(qid, choice):
    """Return (is_correct, correct_answer_text). Raises ValueError for unknown ids."""
    q = BANK_BY_ID.get(str(qid))
    if q is None:
        raise ValueError('unknown question id')
    correct = q['options'][q['answer']]
    return str(choice).strip() == correct, correct
