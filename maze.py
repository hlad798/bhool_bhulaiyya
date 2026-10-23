"""
maze.py - Maze generation and analysis for Bhool Bhulaiyya: The Escape Hunt.

Each cell stores its walls as a bitmask:
    N = 1, E = 2, S = 4, W = 8
A set bit means the wall is standing.
"""

import random
from collections import deque

N, E, S, W = 1, 2, 4, 8
ALL_WALLS = N | E | S | W
DELTA = {N: (-1, 0), E: (0, 1), S: (1, 0), W: (0, -1)}
OPPOSITE = {N: S, S: N, E: W, W: E}
DIR_NAME = {N: 'N', E: 'E', S: 'S', W: 'W'}


class Maze:
    """A rectangular haveli maze carved with a randomized depth-first search."""

    def __init__(self, rows, cols, rng=None, braid=0.0):
        self.rows = rows
        self.cols = cols
        self.rng = rng or random.Random()
        self.grid = [[ALL_WALLS for _ in range(cols)] for _ in range(rows)]
        self.start = (0, 0)
        self.exit = (rows - 1, cols - 1)
        self._carve()
        if braid > 0:
            self._braid(braid)

    # ------------------------------------------------------------------ basics
    def in_bounds(self, r, c):
        return 0 <= r < self.rows and 0 <= c < self.cols

    def has_wall(self, r, c, d):
        return bool(self.grid[r][c] & d)

    def remove_wall(self, r, c, d):
        dr, dc = DELTA[d]
        nr, nc = r + dr, c + dc
        self.grid[r][c] &= ~d
        self.grid[nr][nc] &= ~OPPOSITE[d]

    def open_directions(self, r, c):
        return [d for d in (N, E, S, W) if not self.has_wall(r, c, d)]

    def wall_count(self, r, c):
        return 4 - len(self.open_directions(r, c))

    # --------------------------------------------------------------- carving
    def _carve(self):
        """Iterative depth-first search: produces a 'perfect' maze (one path between any two cells)."""
        visited = [[False] * self.cols for _ in range(self.rows)]
        sr, sc = self.start
        visited[sr][sc] = True
        stack = [self.start]
        while stack:
            r, c = stack[-1]
            choices = []
            for d, (dr, dc) in DELTA.items():
                nr, nc = r + dr, c + dc
                if self.in_bounds(nr, nc) and not visited[nr][nc]:
                    choices.append(d)
            if not choices:
                stack.pop()
                continue
            d = self.rng.choice(choices)
            self.remove_wall(r, c, d)
            dr, dc = DELTA[d]
            visited[r + dr][c + dc] = True
            stack.append((r + dr, c + dc))

    def _braid(self, fraction):
        """Knock out a few extra walls to create loops, so the player can dodge Manjulika.
        Walls touching a dead end are left alone so the dead ends survive."""
        candidates = []
        for r in range(self.rows):
            for c in range(self.cols):
                for d in (E, S):
                    dr, dc = DELTA[d]
                    nr, nc = r + dr, c + dc
                    if not self.in_bounds(nr, nc) or not self.has_wall(r, c, d):
                        continue
                    if self.wall_count(r, c) >= 3 or self.wall_count(nr, nc) >= 3:
                        continue
                    candidates.append((r, c, d))
        self.rng.shuffle(candidates)
        for r, c, d in candidates[: int(len(candidates) * fraction)]:
            self.remove_wall(r, c, d)

    # -------------------------------------------------------------- analysis
    def distances(self, source):
        """Breadth-first search distance (in steps) from source to every cell."""
        dist = [[-1] * self.cols for _ in range(self.rows)]
        sr, sc = source
        dist[sr][sc] = 0
        queue = deque([source])
        while queue:
            r, c = queue.popleft()
            for d in self.open_directions(r, c):
                dr, dc = DELTA[d]
                nr, nc = r + dr, c + dc
                if dist[nr][nc] == -1:
                    dist[nr][nc] = dist[r][c] + 1
                    queue.append((nr, nc))
        return dist

    def dead_ends(self):
        """Cells with exactly one opening, ignoring the start and exit cells."""
        result = []
        for r in range(self.rows):
            for c in range(self.cols):
                if (r, c) in (self.start, self.exit):
                    continue
                if self.wall_count(r, c) == 3:
                    result.append((r, c))
        return result

    def breakable_wall(self, r, c, dist_to_exit):
        """Pick which wall of a dead end crumbles after a correct answer.
        We choose the wall whose neighbour is closest to the exit - a reward shortcut."""
        best = []
        best_dist = None
        for d in (N, E, S, W):
            if not self.has_wall(r, c, d):
                continue
            dr, dc = DELTA[d]
            nr, nc = r + dr, c + dc
            if not self.in_bounds(nr, nc):
                continue
            nd = dist_to_exit[nr][nc]
            if best_dist is None or nd < best_dist:
                best, best_dist = [d], nd
            elif nd == best_dist:
                best.append(d)
        return self.rng.choice(best) if best else None

    def shortest_path_length(self):
        return self.distances(self.start)[self.exit[0]][self.exit[1]]
