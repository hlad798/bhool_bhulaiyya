"""
levels.py - Difficulty design, Manjulika's whispers and scoring.

Every level:
  * the maze grows bigger
  * Manjulika moves faster
  * she wakes up sooner
  * your lantern gets dimmer
  * the riddles get harder (you always get 10 seconds to answer)
"""

MAX_LEVEL = 5

LEVEL_NAMES = {
    1: 'The Moonlit Courtyard',
    2: 'The Hall of Broken Mirrors',
    3: 'The Locked East Wing',
    4: 'The Forbidden Third Floor',
    5: 'The Chamber of Manjulika',
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
    size = 9 + 2 * step                      # 9x9, 11x11, 13x13, 15x15, 17x17
    if level <= 2:
        tiers = [1]
    elif level == 3:
        tiers = [1, 2]
    else:
        tiers = [2]
    return {
        'level': level,
        'name': LEVEL_NAMES[level],
        'rows': size,
        'cols': size,
        'player_speed': 6.5,                              # cells per second
        'ghost_speed': round(2.0 + 0.55 * step, 2),       # 2.0 -> 4.2 cells per second
        'wake_delay': round(max(2.0, 9.0 - 1.75 * step), 2),  # 9s -> 2s head start
        'question_time': 10,                              # 10 seconds to answer, every level
        'light_radius': round(3.4 - 0.3 * step, 2),       # lantern radius in cells
        'braid': round(0.10 - 0.015 * step, 3),           # fewer escape loops later
        'tiers': tiers,
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
    if total_points >= 5000:
        return 'Ghost Dodger'
    if total_points >= 2500:
        return 'Brave Wanderer'
    if total_points >= 800:
        return 'Nervous Visitor'
    return 'Manjulika\'s Dinner'
