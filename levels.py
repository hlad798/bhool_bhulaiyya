"""
levels.py - The 20 chambers of the haveli: layouts, difficulty, whispers and scoring.

As you go deeper:
  * the maze grows bigger and changes shape
  * Manjulika moves faster (slowly at first, then steadily)
  * she wakes up sooner
  * your lantern gets dimmer
  * the riddles get trickier (you always get 10 seconds to answer)
  * the stone changes colour
"""

MAX_LEVEL = 20

# name, shape, carving algorithm, how many extra loops (braid)
# 'dfs' and 'growing' carve long, twisting corridors with lots of tempting
# side branches, so the way out is hard to spot. Only a few loops are added.
LEVELS = [
    ('The Moonlit Courtyard',        'full',      'dfs',     0.06),
    ('The Servants\' Passage',       'full',      'growing', 0.05),
    ('The Tulsi Courtyard',          'courtyard', 'dfs',     0.05),
    ('The Hall of Broken Mirrors',   'full',      'growing', 0.05),
    ('The Crossroads of Whispers',   'cross',     'dfs',     0.05),
    ('The Diamond Durbar',           'diamond',   'dfs',     0.05),
    ('The Hall of Pillars',          'pillared',  'growing', 0.04),
    ('The Zenana Wing',              'courtyard', 'dfs',     0.04),
    ('The Round Baoli',              'circle',    'dfs',     0.04),
    ('The Twin Courtyards',          'twin',      'growing', 0.04),
    ('The Locked East Wing',         'cross',     'dfs',     0.04),
    ('The Dancing Hall',             'pillared',  'dfs',     0.04),
    ('The Mirror Diamond',           'diamond',   'growing', 0.03),
    ('The Haunted Jharokhas',        'courtyard', 'dfs',     0.03),
    ('The Well of Echoes',           'circle',    'growing', 0.03),
    ('The Forbidden Third Floor',    'twin',      'dfs',     0.03),
    ('The Burnt Library',            'cross',     'dfs',     0.03),
    ('The Altar of Ghungroos',       'diamond',   'dfs',     0.03),
    ('The Sealed Chambers',          'courtyard', 'growing', 0.02),
    ('The Chamber of Manjulika',     'full',      'dfs',     0.02),
]

# A different colour for the stone every level (the browser knows how to paint each one)
THEMES = ['sandstone', 'jade', 'lapis', 'ash', 'amethyst', 'ember', 'abyss', 'gilded', 'blood', 'frost']

SHAPE_LABELS = {
    'full': 'a great hall',
    'courtyard': 'corridors around a courtyard',
    'cross': 'a cross-shaped wing',
    'diamond': 'a diamond-shaped durbar',
    'circle': 'a round stepwell',
    'pillared': 'a hall full of pillars',
    'twin': 'twin courtyards',
}

# Original lines - shown on screen while she hunts you.
WHISPERS = {
    'sleeping': [
        'Shhh... the haveli is asleep. For now.',
        'A ghungroo rings somewhere upstairs...',
        'Do not wake her. Walk softly.',
    ],
    'awake': [
        'Kahan ja rahe ho...? (Where are you going...?)',
        'Is haveli se koi bachkar nahi jaata... (No one escapes this haveli...)',
        'Main aa rahi hoon... (I am coming...)',
        'Tum bhaag nahi sakte... (You cannot run...)',
        'Ruk jao... (Stop...)',
    ],
    'near': [
        'Peeche mudke dekho... (Look behind you...)',
        'Mil gaye... (Found you...)',
        'Ab kahan jaoge? (Where will you go now?)',
    ],
}


def level_config(level):
    level = max(1, min(MAX_LEVEL, int(level)))
    step = level - 1
    name, shape, algorithm, braid = LEVELS[step]

    rows = 11 + round(step * 14 / 19)         # 11 rows -> 25 rows
    if shape in ('full', 'courtyard', 'twin', 'pillared'):
        cols = rows + 4 + (step // 4) * 2      # wider halls as you go deeper
    else:
        cols = rows

    if level <= 6:
        tiers = [1]
    elif level <= 10:
        tiers = [1, 2]
    else:
        tiers = [2]

    return {
        'level': level,
        'name': name,
        'shape': shape,
        'layout': SHAPE_LABELS[shape],
        'algorithm': algorithm,
        'rows': rows,
        'cols': cols,
        'player_speed': 6.5,                                     # cells per second
        'ghost_speed': round(1.4 + step * 0.17, 2),              # 1.4 -> 4.6 cells per second
        'wake_delay': round(max(1.0, 5.0 - step * 0.21), 2),     # 5 s -> 1 s head start
        'question_time': 10,                                     # 10 seconds to answer, every level
        'light_radius': round(3.6 - step * 0.065, 2),            # lantern radius in cells
        'braid': braid,
        'tiers': tiers,
        'theme': THEMES[step % len(THEMES)],
    }


def score_level(level, seconds, correct_answers, par_steps):
    """Points for clearing a level. Faster than 'par' time earns a bonus."""
    cfg = level_config(level)
    par_seconds = par_steps / cfg['player_speed'] * 3.0 + 10
    time_bonus = max(0, int((par_seconds - float(seconds)) * 15))
    return 500 * cfg['level'] + 200 * int(correct_answers) + time_bonus


def rank_title(total_points, levels_cleared):
    if levels_cleared >= MAX_LEVEL:
        return 'Haveli Conqueror - Manjulika fears YOU now'
    if total_points >= 60000:
        return 'Ghost Dodger'
    if total_points >= 25000:
        return 'Brave Wanderer'
    if total_points >= 5000:
        return 'Nervous Visitor'
    return 'Manjulika\'s Dinner'
