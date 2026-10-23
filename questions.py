"""
questions.py - The riddles that guard every dead end of the haveli.

Nothing academic and no calculations: just riddles, ghost jokes, trick
questions, Gen Z slang, pop culture and silly fun. Each question has an
id like 'z07'. The correct answer is NEVER sent to the browser until the
player answers. In the bank, the correct option is always written first;
the server shuffles the options before sending them.

Tier 1 = easier (early levels), tier 2 = trickier (later levels).
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


def check_answer(qid, choice):
    """Return (is_correct, correct_answer_text). Raises ValueError for unknown ids."""
    q = BANK_BY_ID.get(str(qid))
    if q is None:
        raise ValueError('unknown question id')
    correct = q['options'][q['answer']]
    return str(choice).strip() == correct, correct
