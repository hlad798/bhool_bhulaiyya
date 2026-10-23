"""
questions.py - The silly riddles that guard every dead end of the haveli.

Two kinds of questions:
  1. A fixed bank of riddles, ghost jokes and trick questions, ids like 'r07'.
  2. Freshly generated silly maths, ids like 'gen:samosa:4:7'.
     The id itself carries the numbers, so the server can re-check the
     answer later without storing anything (Vercel functions are stateless).

The correct answer is NEVER sent to the browser until the player answers.
In the bank, the correct option is always written first; the server
shuffles the options before sending them.

Tier 1 = easy (levels 1-6), tier 2 = trickier (levels 5 onwards).
"""


def Q(qid, tier, kind, text, options):
    return {'id': qid, 'tier': tier, 'kind': kind, 'text': text, 'options': options, 'answer': 0}


BANK = [
    # ============================================================ TIER 1
    Q('r01', 1, 'Ghost joke', 'What do ghosts spread on their toast?',
      ['Scream cheese', 'Peanut butter', 'Honey', 'Mango jam']),
    Q('r02', 1, 'Ghost joke', 'What is a ghost\'s favourite dessert?',
      ['I-scream', 'Gulab jamun', 'Rasgulla', 'Kulfi']),
    Q('r03', 1, 'Ghost joke', 'What do you call a ghost\'s mummy and papa?',
      ['Transparents', 'Uncle and aunty', 'The elders', 'Grandparents']),
    Q('r04', 1, 'Ghost joke', 'Which room do ghosts always avoid?',
      ['The living room', 'The kitchen', 'The bathroom', 'The terrace']),
    Q('r05', 1, 'Ghost joke', 'Why don\'t skeletons ever fight each other?',
      ['They don\'t have the guts', 'They are best friends', 'They are scared of Manjulika', 'They are on leave']),
    Q('r06', 1, 'Riddle', 'What has to be broken before you can use it?',
      ['An egg', 'A promise', 'A phone', 'A haveli wall']),
    Q('r07', 1, 'Riddle', 'What gets BIGGER the more you take away from it?',
      ['A hole', 'Your exam marks', 'A samosa', 'Your patience']),
    Q('r08', 1, 'Riddle', 'What has a neck but no head?',
      ['A bottle', 'A pillow', 'A chair', 'A spoon']),
    Q('r09', 1, 'Trick question', 'Which word is always spelled wrong in the dictionary?',
      ['Wrong', 'Haveli', 'Rhythm', 'Ghost']),
    Q('r10', 1, 'Trick question', 'How many months have 28 days?',
      ['All 12', 'Only February', 'None', '2']),
    Q('r11', 1, 'Trick question', 'In a race, you overtake the person in 2nd place. What place are you in now?',
      ['2nd', '1st', '3rd', 'Disqualified']),
    Q('r12', 1, 'Riddle', 'What goes up but never ever comes down?',
      ['Your age', 'A kite', 'A ball', 'A lift']),
    Q('r13', 1, 'Riddle', 'What can you hold in your right hand but never in your left hand?',
      ['Your left elbow', 'A cup of chai', 'A phone', 'A pen']),
    Q('r14', 1, 'Riddle', 'What has lots of teeth but can never bite?',
      ['A comb', 'A crocodile', 'A dentist', 'A shark']),
    Q('r15', 1, 'Riddle', 'Which room has no doors and no windows?',
      ['A mushroom', 'A bathroom', 'A classroom', 'A storeroom']),
    Q('r16', 1, 'Riddle', 'What travels all around the world but stays in one corner?',
      ['A stamp', 'Wi-Fi', 'A cockroach', 'A tourist']),
    Q('r17', 1, 'Riddle', 'What is full of holes but still holds water?',
      ['A sponge', 'A bucket', 'A net', 'A glass']),
    Q('r18', 1, 'Silly joke', 'What do you call a sleeping dinosaur?',
      ['A dino-snore', 'A fossil', 'A lizard', 'Extinct']),
    Q('r19', 1, 'Silly joke', 'What do you call cheese that isn\'t yours?',
      ['Nacho cheese', 'Paneer', 'Stolen cheese', 'Mozzarella']),
    Q('r20', 1, 'Silly joke', 'Why did the scarecrow win an award?',
      ['He was outstanding in his field', 'He scared away Manjulika', 'He was the tallest', 'He bribed the judges']),
    Q('r21', 1, 'Silly joke', 'What did the zero say to the eight?',
      ['Nice belt!', 'You look tired', 'Move aside', 'Happy birthday']),
    Q('r22', 1, 'Riddle', 'What has hands but cannot clap?',
      ['A clock', 'A statue', 'A glove', 'A ghost']),
    Q('r23', 1, 'Riddle', 'What runs but never walks, and has a mouth but never talks?',
      ['A river', 'A ghost', 'A clock', 'A car']),
    Q('r24', 1, 'Riddle', 'The more of them you take, the more you leave behind. What are they?',
      ['Footsteps', 'Selfies', 'Breaths', 'Coins']),
    Q('r25', 1, 'Silly joke', 'Why was the maths book so sad?',
      ['It had too many problems', 'Nobody opened it', 'It lost its cover', 'It failed the exam']),
    Q('r26', 1, 'Riddle', 'What kind of tree can you hold in your hand?',
      ['A palm tree', 'A banyan tree', 'A family tree', 'A Christmas tree']),
    Q('r27', 1, 'Riddle', 'What has keys but cannot open a single lock?',
      ['A keyboard', 'A haveli', 'A locksmith', 'A diary']),
    Q('r28', 1, 'Trick question', 'Which is heavier: a kilo of feathers or a kilo of bricks?',
      ['They weigh the same', 'The bricks', 'The feathers', 'Depends on the bricks']),

    # ============================================================ TIER 2
    Q('t01', 2, 'Trick question', 'A rooster lays an egg on a sloping roof. Which way does the egg roll?',
      ['Roosters don\'t lay eggs', 'Left', 'Right', 'Straight down']),
    Q('t02', 2, 'Trick question', 'Which word becomes SHORTER when you add two letters to it?',
      ['Short', 'Long', 'Small', 'Tiny']),
    Q('t03', 2, 'Trick question', 'Mary\'s father has five daughters: Nana, Nene, Nini, Nono... What is the fifth one called?',
      ['Mary', 'Nunu', 'Nanu', 'Manjulika']),
    Q('t04', 2, 'Riddle', 'What can you catch but never throw?',
      ['A cold', 'A ball', 'A fish', 'A bus']),
    Q('t05', 2, 'Trick question', 'How many times can you subtract 5 from 25?',
      ['Once', '5 times', '4 times', 'Forever']),
    Q('t06', 2, 'Riddle', 'What has one eye but cannot see?',
      ['A needle', 'A pirate', 'A chapati', 'A spoon']),
    Q('t07', 2, 'Riddle', 'If you have me, you want to share me. If you share me, I\'m gone. What am I?',
      ['A secret', 'Money', 'Biryani', 'A shadow']),
    Q('t08', 2, 'Riddle', 'I\'m black when you buy me, red when you use me, and grey when you throw me away. What am I?',
      ['Charcoal', 'A tomato', 'A phone', 'Hair dye']),
    Q('t09', 2, 'Riddle', 'What starts with T, ends with T, and has T in it?',
      ['A teapot', 'A tent', 'A toilet', 'A ticket']),
    Q('t10', 2, 'Riddle', 'What has four wheels and flies?',
      ['A garbage truck', 'An aeroplane', 'A haunted car', 'A dragon']),
    Q('t11', 2, 'Riddle', 'What breaks as soon as you say its name?',
      ['Silence', 'A mirror', 'A promise', 'A heart']),
    Q('t12', 2, 'Riddle', 'I\'m tall when I\'m young and short when I\'m old. What am I?',
      ['A candle', 'A tree', 'A pencil sharpener', 'Your grandpa']),
    Q('t13', 2, 'Silly joke', 'What do you call a fish with no eyes?',
      ['A fsh', 'A blind fish', 'Nemo', 'A ghost fish']),
    Q('t14', 2, 'Ghost joke', 'What do ghosts use to wash their hair?',
      ['Sham-boo', 'Reetha', 'Soap', 'Coconut oil']),
    Q('t15', 2, 'Silly joke', 'What did one wall say to the other wall?',
      ['I\'ll meet you at the corner', 'You\'re cracked', 'Stop leaning on me', 'Good night']),
    Q('t16', 2, 'Riddle', 'What has a head and a tail but no body?',
      ['A coin', 'A snake', 'A comet', 'A ghost']),
    Q('t17', 2, 'Riddle', 'What goes through cities and fields but never moves?',
      ['A road', 'A train', 'The wind', 'A river']),
    Q('t18', 2, 'Riddle', 'Forward I\'m heavy, but backward I\'m NOT. What am I?',
      ['A ton', 'A brick', 'An elephant', 'A truck']),
    Q('t19', 2, 'Silly joke', 'Why did the student eat his homework?',
      ['The teacher said it was a piece of cake', 'He was very hungry', 'The dog refused', 'It was written on a samosa']),
    Q('t20', 2, 'Riddle', 'What is always in front of you but can never be seen?',
      ['The future', 'Your nose', 'A mirror', 'Manjulika']),
    Q('t21', 2, 'Trick question', 'Where does Friday come before Thursday?',
      ['In the dictionary', 'In Australia', 'Nowhere', 'In a leap year']),
    Q('t22', 2, 'Riddle', 'What can you break without ever touching it?',
      ['A promise', 'A glass', 'A wall', 'A bone']),
    Q('t23', 2, 'Trick question', 'A plane crashes exactly on the border of two countries. Where do they bury the survivors?',
      ['You don\'t bury survivors', 'In the first country', 'In the second country', 'On the border']),
    Q('t25', 2, 'Ghost joke', 'Why did the ghost go into the lift?',
      ['To lift its spirits', 'It was tired', 'To scare people', 'The stairs were haunted']),
    Q('t26', 2, 'Silly joke', 'Why can\'t a bicycle stand up on its own?',
      ['It\'s two-tired', 'It has no legs', 'It\'s lazy', 'Nobody parked it']),
    Q('t27', 2, 'Riddle', 'What comes once in a minute, twice in a moment, but never in a thousand years?',
      ['The letter M', 'A blink', 'A heartbeat', 'Manjulika']),
    Q('t28', 2, 'Trick question', 'A man was out in the pouring rain with no umbrella and no hat, but not a single hair got wet. How?',
      ['He was bald', 'He ran fast', 'It was ghost rain', 'He held his breath']),
]

BANK_BY_ID = {q['id']: q for q in BANK}


# ------------------------------------------------------------ generated silly maths
GEN_KINDS = {
    1: ['samosa', 'chai'],
    2: ['ghungroo', 'selfie'],
}


def _solve_generated(qid):
    """Turn an id like 'gen:samosa:4:7' back into (question text, correct answer)."""
    parts = qid.split(':')
    kind = parts[1]
    a, b = int(parts[2]), int(parts[3])
    if kind == 'samosa':
        return ('Silly maths: Manjulika eats {} samosas every night. How many samosas does she eat in {} nights?'
                .format(a, b), a * b)
    if kind == 'chai':
        return ('Silly maths: You had Rs {} and spent Rs {} on chai to calm your nerves. How much is left?'
                .format(a, b), a - b)
    if kind == 'ghungroo':
        return ('Silly maths: Manjulika has {} bells on EACH ankle and {} spare bells in her pocket. How many bells in total?'
                .format(a, b), 2 * a + b)
    if kind == 'selfie':
        return ('Silly maths: You take {} selfies in every room. The haveli has {} rooms. How many selfies before she catches you?'
                .format(a, b), a * b)
    raise ValueError('unknown generated question')


def _make_generated(tier, rng):
    kind = rng.choice(GEN_KINDS[tier])
    if kind == 'samosa':
        a, b = rng.randint(2, 9), rng.randint(3, 9)
    elif kind == 'chai':
        a = rng.randint(4, 9) * 10
        b = rng.randint(12, a - 5)
    elif kind == 'ghungroo':
        a, b = rng.randint(11, 25), rng.randint(3, 15)
    else:
        a, b = rng.randint(3, 9), rng.randint(6, 12)
    qid = 'gen:{}:{}:{}'.format(kind, a, b)
    text, answer = _solve_generated(qid)
    options = {answer}
    offsets = [-10, -2, -1, 1, 2, 3, 10, a, -a]
    rng.shuffle(offsets)
    for off in offsets:
        if len(options) == 4:
            break
        if off != 0 and answer + off > 0:
            options.add(answer + off)
    options = [str(x) for x in options]
    rng.shuffle(options)
    return {'id': qid, 'text': text, 'options': options}


def _public_bank_question(q, rng):
    options = list(q['options'])
    rng.shuffle(options)
    return {'id': q['id'], 'text': q['kind'] + ': ' + q['text'], 'options': options}


# ------------------------------------------------------------------ public api
def select_questions(count, tiers, rng):
    """Pick `count` questions for one level. About one in five is silly maths."""
    pool = [q for q in BANK if q['tier'] in tiers]
    rng.shuffle(pool)
    chosen = []
    for _ in range(count):
        if not pool:
            pool = [q for q in BANK if q['tier'] in tiers]
            rng.shuffle(pool)
        if rng.random() < 0.8:
            chosen.append(_public_bank_question(pool.pop(), rng))
        else:
            chosen.append(_make_generated(rng.choice(tiers), rng))
    return chosen


def check_answer(qid, choice):
    """Return (is_correct, correct_answer_text). Raises ValueError for unknown ids."""
    choice = str(choice).strip()
    if qid.startswith('gen:'):
        _, answer = _solve_generated(qid)
        correct = str(answer)
    else:
        q = BANK_BY_ID.get(qid)
        if q is None:
            raise ValueError('unknown question id')
        correct = q['options'][q['answer']]
    return choice == correct, correct
