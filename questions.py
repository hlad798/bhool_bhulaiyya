"""
questions.py - The riddles that guard every dead end of the haveli.

Two kinds of questions:
  1. A fixed bank (general knowledge, riddles, logic) with ids like 'b07'.
  2. Freshly generated maths questions with ids like 'gen:mul:7:8'.
     The id itself carries the numbers, so the server can re-check the
     answer later without storing anything (Vercel functions are stateless).

The correct answer is NEVER sent to the browser until the player answers.
"""

import random

# tier 1 = easy, tier 2 = medium (riddles/logic), tier 3 = hard
BANK = [
    # ---------------- tier 1
    {'id': 'b01', 'tier': 1, 'text': 'Which planet is known as the Red Planet?',
     'options': ['Mars', 'Venus', 'Jupiter', 'Saturn'], 'answer': 0},
    {'id': 'b02', 'tier': 1, 'text': 'How many days are there in a leap year?',
     'options': ['364', '365', '366', '367'], 'answer': 2},
    {'id': 'b03', 'tier': 1, 'text': 'What is the national animal of India?',
     'options': ['Lion', 'Bengal Tiger', 'Elephant', 'Peacock'], 'answer': 1},
    {'id': 'b04', 'tier': 1, 'text': 'Which gas do plants absorb from the air to make food?',
     'options': ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 'answer': 2},
    {'id': 'b05', 'tier': 1, 'text': 'Which is the largest ocean on Earth?',
     'options': ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 'answer': 3},
    {'id': 'b06', 'tier': 1, 'text': 'At sea level, water boils at how many degrees Celsius?',
     'options': ['90', '100', '110', '120'], 'answer': 1},
    {'id': 'b07', 'tier': 1, 'text': 'How many sides does a hexagon have?',
     'options': ['5', '6', '7', '8'], 'answer': 1},
    {'id': 'b08', 'tier': 1, 'text': 'Which festival is known as the festival of lights?',
     'options': ['Holi', 'Diwali', 'Onam', 'Lohri'], 'answer': 1},
    {'id': 'b09', 'tier': 1, 'text': 'Which is the fastest land animal?',
     'options': ['Horse', 'Lion', 'Cheetah', 'Leopard'], 'answer': 2},
    {'id': 'b10', 'tier': 1, 'text': 'Which Indian city is called the Pink City?',
     'options': ['Udaipur', 'Jodhpur', 'Jaipur', 'Bikaner'], 'answer': 2},
    {'id': 'b11', 'tier': 1, 'text': 'Kolkata is the capital of which state?',
     'options': ['Odisha', 'West Bengal', 'Assam', 'Bihar'], 'answer': 1},
    {'id': 'b12', 'tier': 1, 'text': 'How many colours are there in a rainbow?',
     'options': ['5', '6', '7', '8'], 'answer': 2},

    # ---------------- tier 2
    {'id': 'b21', 'tier': 2, 'text': 'What has keys but cannot open a single lock?',
     'options': ['A piano', 'A map', 'A diary', 'A prison'], 'answer': 0},
    {'id': 'b22', 'tier': 2, 'text': 'The more of them you take, the more you leave behind. What are they?',
     'options': ['Breaths', 'Footsteps', 'Photos', 'Coins'], 'answer': 1},
    {'id': 'b23', 'tier': 2, 'text': 'What comes once in a minute, twice in a moment, but never in a thousand years?',
     'options': ['The letter M', 'A heartbeat', 'A blink', 'The letter E'], 'answer': 0},
    {'id': 'b24', 'tier': 2, 'text': 'A man has 3 daughters. Each daughter has exactly one brother. How many children does he have?',
     'options': ['3', '4', '6', '7'], 'answer': 1},
    {'id': 'b25', 'tier': 2, 'text': 'What has hands but cannot clap?',
     'options': ['A statue', 'A clock', 'A glove', 'A ghost'], 'answer': 1},
    {'id': 'b26', 'tier': 2, 'text': 'What comes next: 2, 4, 8, 16, ...?',
     'options': ['18', '24', '32', '64'], 'answer': 2},
    {'id': 'b27', 'tier': 2, 'text': 'What comes next: 1, 1, 2, 3, 5, 8, ...?',
     'options': ['11', '12', '13', '15'], 'answer': 2},
    {'id': 'b28', 'tier': 2, 'text': 'What gets wetter the more it dries?',
     'options': ['A sponge', 'A towel', 'Rain', 'Soap'], 'answer': 1},
    {'id': 'b29', 'tier': 2, 'text': 'If you share me, you no longer have me. What am I?',
     'options': ['A secret', 'Money', 'Food', 'A shadow'], 'answer': 0},
    {'id': 'b30', 'tier': 2, 'text': 'Which month has 28 days?',
     'options': ['Only February', 'None', 'All of them', 'February and March'], 'answer': 2},
    {'id': 'b31', 'tier': 2, 'text': 'What can you catch but never throw?',
     'options': ['A ball', 'A cold', 'A fish', 'A bus'], 'answer': 1},
    {'id': 'b32', 'tier': 2, 'text': 'If there are 6 apples and you take away 4, how many do YOU have?',
     'options': ['2', '4', '6', '0'], 'answer': 1},

    # ---------------- tier 3
    {'id': 'b41', 'tier': 3, 'text': 'Who wrote India\'s national anthem, Jana Gana Mana?',
     'options': ['Bankim Chandra Chattopadhyay', 'Rabindranath Tagore', 'Sarojini Naidu', 'Subramania Bharati'], 'answer': 1},
    {'id': 'b42', 'tier': 3, 'text': 'What is the square root of 196?',
     'options': ['12', '13', '14', '16'], 'answer': 2},
    {'id': 'b43', 'tier': 3, 'text': 'What is the chemical symbol for gold?',
     'options': ['Go', 'Gd', 'Ag', 'Au'], 'answer': 3},
    {'id': 'b44', 'tier': 3, 'text': 'How many bones are there in an adult human body?',
     'options': ['196', '206', '216', '226'], 'answer': 1},
    {'id': 'b45', 'tier': 3, 'text': 'Which is the smallest prime number?',
     'options': ['0', '1', '2', '3'], 'answer': 2},
    {'id': 'b46', 'tier': 3, 'text': 'Kathakali is a classical dance form from which state?',
     'options': ['Kerala', 'Odisha', 'Manipur', 'Gujarat'], 'answer': 0},
    {'id': 'b47', 'tier': 3, 'text': 'Bharatanatyam originated in which state?',
     'options': ['Karnataka', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala'], 'answer': 2},
    {'id': 'b48', 'tier': 3, 'text': 'What does a light-year measure?',
     'options': ['Time', 'Distance', 'Brightness', 'Speed'], 'answer': 1},
    {'id': 'b49', 'tier': 3, 'text': 'When a clock shows 3:15, what is the angle between the hour and minute hands?',
     'options': ['0 degrees', '7.5 degrees', '15 degrees', '30 degrees'], 'answer': 1},
    {'id': 'b50', 'tier': 3, 'text': 'What is the hardest natural substance?',
     'options': ['Iron', 'Quartz', 'Diamond', 'Granite'], 'answer': 2},
    {'id': 'b51', 'tier': 3, 'text': 'A bat and a ball cost Rs 110 together. The bat costs Rs 100 more than the ball. How much is the ball?',
     'options': ['Rs 5', 'Rs 10', 'Rs 15', 'Rs 20'], 'answer': 0},
    {'id': 'b52', 'tier': 3, 'text': 'Which planet has the most well-known ring system?',
     'options': ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], 'answer': 1},
]

BANK_BY_ID = {q['id']: q for q in BANK}


# ------------------------------------------------------------ generated maths
def _solve_generated(qid):
    """Turn an id like 'gen:mix:7:8:5' back into (question text, correct answer)."""
    parts = qid.split(':')
    kind = parts[1]
    nums = [int(x) for x in parts[2:]]
    if kind == 'add':
        a, b = nums
        return 'Quick! What is {} + {}?'.format(a, b), a + b
    if kind == 'sub':
        a, b = nums
        return 'Quick! What is {} - {}?'.format(a, b), a - b
    if kind == 'mul':
        a, b = nums
        return 'What is {} x {}?'.format(a, b), a * b
    if kind == 'mix':
        a, b, c = nums
        return 'What is {} x {} + {}?'.format(a, b, c), a * b + c
    raise ValueError('unknown generated question')


def _make_generated(tier, rng):
    if tier == 1:
        if rng.random() < 0.5:
            qid = 'gen:add:{}:{}'.format(rng.randint(12, 59), rng.randint(11, 48))
        else:
            a = rng.randint(40, 99)
            qid = 'gen:sub:{}:{}'.format(a, rng.randint(11, a - 5))
    elif tier == 2:
        qid = 'gen:mul:{}:{}'.format(rng.randint(4, 12), rng.randint(6, 15))
    else:
        qid = 'gen:mix:{}:{}:{}'.format(rng.randint(6, 13), rng.randint(6, 14), rng.randint(3, 29))

    text, answer = _solve_generated(qid)
    options = {answer}
    for offset in rng.sample([-11, -10, -2, -1, 1, 2, 9, 10, 12], 9):
        if len(options) == 4:
            break
        if answer + offset >= 0:
            options.add(answer + offset)
    options = [str(x) for x in options]
    rng.shuffle(options)
    return {'id': qid, 'text': text, 'options': options}


def _public_bank_question(q, rng):
    options = list(q['options'])
    rng.shuffle(options)
    return {'id': q['id'], 'text': q['text'], 'options': options}


# ------------------------------------------------------------------ public api
def select_questions(count, tiers, rng):
    """Pick `count` questions for one level. About half are generated maths."""
    pool = [q for q in BANK if q['tier'] in tiers]
    rng.shuffle(pool)
    chosen = []
    for _ in range(count):
        if pool and rng.random() < 0.55:
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
