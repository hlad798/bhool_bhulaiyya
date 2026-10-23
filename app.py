"""
app.py - Flask server for Bhool Bhulaiyya: The Escape Hunt.

Python is the brain of the game:
  * builds every maze           (maze.py)
  * finds the dead ends and decides which wall breaks on a correct answer
  * scales difficulty per level (levels.py)
  * chooses and GRADES questions (questions.py) - answers never reach the browser early
  * calculates the score and rank

The browser (public/js/game.js) only draws the haveli, plays sounds and
moves the characters.
"""

import random

from flask import Flask, jsonify, render_template, request

from levels import MAX_LEVEL, WHISPERS, level_config, rank_title, score_level
from maze import DIR_NAME, Maze
from questions import check_answer, pick_question, select_questions

# static_folder is only used for local runs; on Vercel the public/ folder is served by the CDN.
app = Flask(__name__, static_folder='public', static_url_path='')


@app.route('/')
def home():
    return render_template('index.html', max_level=MAX_LEVEL)


@app.route('/api/health')
def health():
    return jsonify(status='alive', message='Manjulika is waiting.')


@app.route('/api/level/<int:level>')
def get_level(level):
    if level < 1 or level > MAX_LEVEL:
        return jsonify(error='No such level in this haveli.'), 404

    cfg = level_config(level)
    seed = random.randrange(1, 10 ** 9)
    rng = random.Random(seed)

    maze = Maze(cfg['rows'], cfg['cols'], rng, braid=cfg['braid'],
                shape=cfg['shape'], algorithm=cfg['algorithm'])
    dist_to_exit = maze.distances(maze.exit)
    dead = maze.dead_ends()

    # The riddle for each dead end is chosen when the player reaches it (see
    # /api/question), so no riddle repeats during a session. A fallback riddle
    # is still included for any browser still running an older copy of the game.
    fallback = select_questions(len(dead), cfg['tiers'], rng)
    dead_ends = []
    for (r, c), q in zip(dead, fallback):
        wall = maze.breakable_wall(r, c, dist_to_exit)
        if wall is None:
            continue
        dead_ends.append({'r': r, 'c': c, 'breakWall': wall, 'breakDir': DIR_NAME[wall], 'question': q})

    return jsonify({
        'seed': seed,
        'config': cfg,
        'maxLevel': MAX_LEVEL,
        'grid': maze.grid,
        'start': list(maze.start),
        'exit': list(maze.exit),
        'exitWall': maze.exit_wall,
        'spawn2': list(maze.far_spawn()) if cfg['second_ghost'] else None,
        'blocked': maze.blocked_rows(),
        'parSteps': maze.shortest_path_length(),
        'deadEnds': dead_ends,
        'whispers': WHISPERS,
    })


@app.route('/api/question', methods=['POST'])
def question():
    """A riddle for the dead end the player just reached. The browser sends the ids
    it has already been asked this session; none of those comes back until the whole
    bank has been used (then 'reset' tells the browser to start its list again)."""
    data = request.get_json(silent=True) or {}
    try:
        level = int(data.get('level', 1))
    except (TypeError, ValueError):
        level = 1
    seen = data.get('seen') or []
    if not isinstance(seen, list):
        seen = []
    cfg = level_config(level)
    q, reset = pick_question(cfg['tiers'], seen[:500], random.Random())
    return jsonify({'question': q, 'reset': reset})


@app.route('/api/answer', methods=['POST'])
def answer():
    data = request.get_json(silent=True) or {}
    qid = str(data.get('id', ''))
    choice = data.get('choice', '')
    try:
        correct, correct_text = check_answer(qid, choice)
    except (ValueError, IndexError):
        return jsonify(error='That question does not exist in this haveli.'), 400
    return jsonify({
        'correct': correct,
        'answer': correct_text,
        'message': 'The wall crumbles! Run!' if correct else 'Wrong... Manjulika is right behind you.',
    })


@app.route('/api/score', methods=['POST'])
def score():
    data = request.get_json(silent=True) or {}
    try:
        level = int(data.get('level', 1))
        seconds = float(data.get('seconds', 0))
        correct = int(data.get('correct', 0))
        par_steps = int(data.get('parSteps', 20))
        previous = int(data.get('total', 0))
    except (TypeError, ValueError):
        return jsonify(error='Bad score data.'), 400

    points = score_level(level, seconds, correct, par_steps)
    total = previous + points
    return jsonify({
        'points': points,
        'total': total,
        'title': rank_title(total, level),
        'finished': level >= MAX_LEVEL,
    })


@app.route('/api/rank', methods=['POST'])
def rank():
    data = request.get_json(silent=True) or {}
    try:
        total = int(data.get('total', 0))
        cleared = int(data.get('cleared', 0))
    except (TypeError, ValueError):
        total, cleared = 0, 0
    return jsonify({'title': rank_title(total, cleared)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
