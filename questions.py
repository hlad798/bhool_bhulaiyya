"""
questions.py - The riddles that guard every dead end of the haveli.

Two kinds of questions:
  1. A fixed bank across subjects (science, history, geography, English,
     computers, civics, maths, logic) with ids like 'p07'.
  2. Freshly generated maths questions with ids like 'gen:lin:7:5:61'.
     The id itself carries the numbers, so the server can re-check the
     answer later without storing anything (Vercel functions are stateless).

The correct answer is NEVER sent to the browser until the player answers.

Tier 1 = moderate (levels 1-3), tier 2 = hard (levels 3-5).
"""

import math


def Q(qid, tier, subject, text, options, answer_index):
    return {'id': qid, 'tier': tier, 'subject': subject, 'text': text,
            'options': options, 'answer': answer_index}


BANK = [
    # ============================================================ TIER 1
    # ---- Science
    Q('s01', 1, 'Physics', 'What is the SI unit of force?',
      ['Newton', 'Joule', 'Pascal', 'Watt'], 0),
    Q('s02', 1, 'Biology', 'Which organelle is called the powerhouse of the cell?',
      ['Mitochondria', 'Ribosome', 'Nucleus', 'Golgi body'], 0),
    Q('s03', 1, 'Chemistry', 'What is the chemical formula of common salt?',
      ['NaCl', 'KCl', 'Na2CO3', 'CaCl2'], 0),
    Q('s04', 1, 'Biology', 'Which blood cells help the blood to clot?',
      ['Platelets', 'Red blood cells', 'White blood cells', 'Plasma cells'], 0),
    Q('s05', 1, 'Chemistry', 'What is the pH of pure water at 25 degrees Celsius?',
      ['7', '0', '1', '14'], 0),
    Q('s06', 1, 'Physics', 'Sound CANNOT travel through which of these?',
      ['Vacuum', 'Water', 'Steel', 'Air'], 0),
    Q('s07', 1, 'Biology', 'Which vitamin does your skin make in sunlight?',
      ['Vitamin D', 'Vitamin A', 'Vitamin C', 'Vitamin K'], 0),
    Q('s08', 1, 'Science', 'Which gas makes up most of Earth\'s atmosphere?',
      ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'], 0),
    Q('s09', 1, 'Astronomy', 'Which planet takes the shortest time to orbit the Sun?',
      ['Mercury', 'Venus', 'Mars', 'Earth'], 0),
    # ---- History & civics
    Q('h01', 1, 'History', 'Who was the first President of India?',
      ['Dr. Rajendra Prasad', 'Jawaharlal Nehru', 'Dr. S. Radhakrishnan', 'Dr. Zakir Husain'], 0),
    Q('h02', 1, 'History', 'The Constitution of India came into force on 26 January of which year?',
      ['1950', '1947', '1949', '1952'], 0),
    Q('h03', 1, 'History', 'Who led the Dandi Salt March in 1930?',
      ['Mahatma Gandhi', 'Subhas Chandra Bose', 'Bhagat Singh', 'Sardar Patel'], 0),
    Q('h04', 1, 'History', 'Which Mughal emperor built the Taj Mahal?',
      ['Shah Jahan', 'Akbar', 'Aurangzeb', 'Humayun'], 0),
    Q('c01', 1, 'Civics', 'In which city is the Reserve Bank of India headquartered?',
      ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], 0),
    # ---- Geography
    Q('g01', 1, 'Geography', 'Which is the largest state of India by area?',
      ['Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh'], 0),
    Q('g02', 1, 'Geography', 'What is the capital of Australia?',
      ['Canberra', 'Sydney', 'Melbourne', 'Perth'], 0),
    Q('g03', 1, 'Geography', 'Which river is called the "Dakshin Ganga"?',
      ['Godavari', 'Krishna', 'Kaveri', 'Narmada'], 0),
    # ---- English
    Q('e01', 1, 'English', 'Which word means the same as "eerie"?',
      ['Creepy', 'Joyful', 'Bright', 'Noisy'], 0),
    Q('e02', 1, 'English', 'What is the plural of "phenomenon"?',
      ['Phenomena', 'Phenomenons', 'Phenomenae', 'Phenomenon'], 0),
    Q('e03', 1, 'English', 'Which spelling is correct?',
      ['Necessary', 'Neccessary', 'Necesary', 'Neccesary'], 0),
    # ---- Computers
    Q('p01', 1, 'Python', 'In Python, what does len(\'haveli\') return?',
      ['6', '5', '7', 'Error'], 0),
    Q('p02', 1, 'Python', 'In Python, what is the value of 7 // 2?',
      ['3', '3.5', '4', '1'], 0),
    Q('p03', 1, 'Computers', 'Which HTML tag creates a hyperlink?',
      ['<a>', '<link>', '<href>', '<url>'], 0),
    Q('p04', 1, 'Computers', 'The binary number 1010 equals what in decimal?',
      ['10', '8', '12', '5'], 0),
    # ---- Maths & logic
    Q('m01', 1, 'Maths', 'What is the next prime number after 31?',
      ['37', '33', '35', '39'], 0),
    Q('m02', 1, 'Maths', 'What is the sum of the interior angles of a hexagon?',
      ['720 degrees', '540 degrees', '360 degrees', '900 degrees'], 0),
    Q('l01', 1, 'Logic', 'A man has 3 daughters, and each daughter has exactly one brother. How many children does he have?',
      ['4', '3', '6', '7'], 0),
    Q('l02', 1, 'Logic', 'What comes next: 1, 1, 2, 3, 5, 8, 13, ...?',
      ['21', '18', '20', '26'], 0),

    # ============================================================ TIER 2
    # ---- Science
    Q('s21', 2, 'Chemistry', 'What is the atomic number of carbon?',
      ['6', '12', '8', '14'], 0),
    Q('s22', 2, 'Chemistry', 'Which law says pressure x volume stays constant at a fixed temperature?',
      ['Boyle\'s law', 'Charles\'s law', 'Ohm\'s law', 'Hooke\'s law'], 0),
    Q('s23', 2, 'Biology', 'Which part of the brain mainly controls balance and posture?',
      ['Cerebellum', 'Cerebrum', 'Medulla oblongata', 'Hypothalamus'], 0),
    Q('s24', 2, 'Physics', 'Roughly how fast does light travel in a vacuum?',
      ['3 x 10^8 m/s', '3 x 10^6 m/s', '3 x 10^5 m/s', '3 x 10^10 m/s'], 0),
    Q('s25', 2, 'Chemistry', 'Which element has the symbol K?',
      ['Potassium', 'Krypton', 'Phosphorus', 'Calcium'], 0),
    Q('s26', 2, 'Biology', 'Which acid is found in the human stomach?',
      ['Hydrochloric acid', 'Sulphuric acid', 'Nitric acid', 'Acetic acid'], 0),
    Q('s27', 2, 'Science', 'Who discovered penicillin?',
      ['Alexander Fleming', 'Louis Pasteur', 'Edward Jenner', 'Joseph Lister'], 0),
    Q('s28', 2, 'Physics', 'In which year did C. V. Raman win the Nobel Prize in Physics?',
      ['1930', '1913', '1928', '1947'], 0),
    Q('s29', 2, 'Physics', 'Ohm\'s law links voltage and current with which quantity?',
      ['Resistance', 'Power', 'Charge', 'Frequency'], 0),
    # ---- History & civics
    Q('h21', 2, 'History', 'In which year was the Battle of Plassey fought?',
      ['1757', '1764', '1857', '1761'], 0),
    Q('h22', 2, 'History', 'Who founded the Maurya Empire?',
      ['Chandragupta Maurya', 'Ashoka', 'Bindusara', 'Bimbisara'], 0),
    Q('h23', 2, 'History', 'In which city did the Jallianwala Bagh massacre take place?',
      ['Amritsar', 'Lahore', 'Delhi', 'Lucknow'], 0),
    Q('h24', 2, 'History', 'Who wrote "The Discovery of India"?',
      ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Rabindranath Tagore', 'B. R. Ambedkar'], 0),
    Q('h25', 2, 'History', 'Who chaired the Drafting Committee of the Indian Constitution?',
      ['B. R. Ambedkar', 'Rajendra Prasad', 'Jawaharlal Nehru', 'Sardar Patel'], 0),
    Q('h26', 2, 'History', 'Babur defeated whom in the First Battle of Panipat (1526)?',
      ['Ibrahim Lodi', 'Hemu', 'Rana Sanga', 'Sher Shah Suri'], 0),
    Q('c21', 2, 'Civics', 'Who appoints the Governor of an Indian state?',
      ['The President', 'The Prime Minister', 'The Chief Minister', 'The Chief Justice'], 0),
    # ---- Geography
    Q('g21', 2, 'Geography', 'The Tropic of Cancer does NOT pass through which state?',
      ['Odisha', 'Gujarat', 'Jharkhand', 'Mizoram'], 0),
    Q('g22', 2, 'Geography', 'Which Indian state has the longest coastline?',
      ['Gujarat', 'Tamil Nadu', 'Andhra Pradesh', 'Maharashtra'], 0),
    Q('g23', 2, 'Geography', 'Which is the highest mountain peak located in India?',
      ['Kangchenjunga', 'Nanda Devi', 'Kamet', 'Anamudi'], 0),
    Q('g24', 2, 'Geography', 'Which strait separates India and Sri Lanka?',
      ['Palk Strait', 'Strait of Malacca', 'Bering Strait', 'Strait of Hormuz'], 0),
    # ---- English
    Q('e21', 2, 'English', 'What does "ephemeral" mean?',
      ['Short-lived', 'Eternal', 'Ghostly', 'Enormous'], 0),
    Q('e22', 2, 'English', 'Which of these words is a palindrome?',
      ['Malayalam', 'Haveli', 'Manjulika', 'Ghungroo'], 0),
    Q('e23', 2, 'English', 'Fill in the blank: "Neither of the doors ___ open."',
      ['was', 'were', 'are', 'have been'], 0),
    Q('e24', 2, 'English', 'Which word is the opposite of "benevolent"?',
      ['Malevolent', 'Generous', 'Kind', 'Gentle'], 0),
    # ---- Computers
    Q('p21', 2, 'Python', 'In Python, what is [1, 2, 3][-1]?',
      ['3', '1', '-1', 'Error'], 0),
    Q('p22', 2, 'Python', 'In Python, what does print(2 ** 5) show?',
      ['32', '10', '25', '7'], 0),
    Q('p23', 2, 'Computers', 'Which data structure works on Last In, First Out?',
      ['Stack', 'Queue', 'Array', 'Tree'], 0),
    Q('p24', 2, 'Python', 'In Python, what does bool(\'\') return?',
      ['False', 'True', 'None', 'Error'], 0),
    Q('p25', 2, 'Computers', 'What is 0b1101 in decimal?',
      ['13', '11', '9', '15'], 0),
    Q('p26', 2, 'Computers', 'What does HTTP stand for?',
      ['HyperText Transfer Protocol', 'High Transfer Text Process', 'HyperText Transmission Program', 'Host Transfer Text Protocol'], 0),
    # ---- Maths & logic
    Q('m21', 2, 'Maths', 'What is log base 10 of 1000?',
      ['3', '10', '100', '30'], 0),
    Q('m22', 2, 'Maths', 'How many diagonals does a hexagon have?',
      ['9', '6', '12', '8'], 0),
    Q('m23', 2, 'Maths', 'A triangle has sides 6, 8 and 10. What type of triangle is it?',
      ['Right-angled', 'Equilateral', 'Isosceles', 'Obtuse-angled'], 0),
    Q('m24', 2, 'Maths', 'What is the value of 0! (zero factorial)?',
      ['1', '0', 'Undefined', 'Infinity'], 0),
    Q('m25', 2, 'Maths', 'What is the angle between the clock hands at 3:15?',
      ['7.5 degrees', '0 degrees', '15 degrees', '30 degrees'], 0),
    Q('l21', 2, 'Logic', 'A bat and a ball cost Rs 110. The bat costs Rs 100 more than the ball. What does the ball cost?',
      ['Rs 5', 'Rs 10', 'Rs 15', 'Rs 20'], 0),
]

BANK_BY_ID = {q['id']: q for q in BANK}


# ------------------------------------------------------------ generated maths
GEN_KINDS = {
    1: ['lin', 'pct', 'sq'],
    2: ['lin', 'pct', 'hcf', 'lcm', 'cube'],
}


def _solve_generated(qid):
    """Turn an id like 'gen:lin:7:5:61' back into (question text, correct answer)."""
    parts = qid.split(':')
    kind = parts[1]
    nums = [int(x) for x in parts[2:]]
    if kind == 'lin':
        a, b, c = nums
        if (c - b) % a != 0:
            raise ValueError('bad generated question')
        return 'Maths: If {}x + {} = {}, what is x?'.format(a, b, c), (c - b) // a
    if kind == 'pct':
        p, n = nums
        return 'Maths: What is {}% of {}?'.format(p, n), p * n // 100
    if kind == 'sq':
        (n,) = nums
        return 'Maths: What is {} squared?'.format(n), n * n
    if kind == 'cube':
        (n,) = nums
        return 'Maths: What is {} cubed?'.format(n), n ** 3
    if kind == 'hcf':
        a, b = nums
        return 'Maths: What is the HCF of {} and {}?'.format(a, b), math.gcd(a, b)
    if kind == 'lcm':
        a, b = nums
        return 'Maths: What is the LCM of {} and {}?'.format(a, b), a * b // math.gcd(a, b)
    raise ValueError('unknown generated question')


def _make_generated(tier, rng):
    kind = rng.choice(GEN_KINDS[tier])
    if kind == 'lin':
        a = rng.randint(3, 9 if tier == 1 else 13)
        x = rng.randint(3, 12 if tier == 1 else 19)
        b = rng.randint(2, 25)
        qid = 'gen:lin:{}:{}:{}'.format(a, b, a * x + b)
    elif kind == 'pct':
        p = rng.choice([15, 25, 35, 45, 75] if tier == 1 else [12, 15, 35, 45, 65, 85])
        n = 20 * rng.randint(3, 20) if tier == 1 else 25 * rng.randint(4, 24)
        if p * n % 100 != 0:
            n = 100 * rng.randint(2, 9)
        qid = 'gen:pct:{}:{}'.format(p, n)
    elif kind == 'sq':
        qid = 'gen:sq:{}'.format(rng.randint(13, 29))
    elif kind == 'cube':
        qid = 'gen:cube:{}'.format(rng.randint(6, 13))
    elif kind == 'hcf':
        g = rng.randint(4, 15)
        m, n = rng.sample([2, 3, 5, 7, 11], 2)
        qid = 'gen:hcf:{}:{}'.format(g * m, g * n)
    else:
        a, b = rng.sample([4, 6, 8, 9, 10, 12, 14, 15, 16, 18], 2)
        qid = 'gen:lcm:{}:{}'.format(a, b)

    text, answer = _solve_generated(qid)
    options = {answer}
    offsets = [-11, -10, -3, -2, -1, 1, 2, 3, 9, 10, 12, answer // 2 or 4]
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
    return {'id': q['id'], 'text': q['subject'] + ': ' + q['text'], 'options': options}


# ------------------------------------------------------------------ public api
def select_questions(count, tiers, rng):
    """Pick `count` questions for one level. About a third are generated maths."""
    pool = [q for q in BANK if q['tier'] in tiers]
    rng.shuffle(pool)
    chosen = []
    for _ in range(count):
        if not pool:
            pool = [q for q in BANK if q['tier'] in tiers]
            rng.shuffle(pool)
        if rng.random() < 0.68:
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
