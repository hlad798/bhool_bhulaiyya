"""
maze.py - Maze generation and analysis for Bhool Bhulaiyya: The Escape Hunt.

Each cell stores its walls as a bitmask:
    N = 1, E = 2, S = 4, W = 8
A set bit means the wall is standing.

Every level combines:
  * a SHAPE  - which cells of the rectangle belong to the haveli
               (full hall, courtyard, cross, diamond, circle, pillared hall, twin courtyards)
  * an ALGORITHM - how the corridors are carved
               (depth-first: long winding corridors, Prim: many short branches,
                Kruskal: even and patchy, growing tree: a mix of both)
Cells outside the shape are 'blocked': solid stone that nobody can enter.
"""

import random
from collections import deque

N, E, S, W = 1, 2, 4, 8
ALL_WALLS = N | E | S | W
DELTA = {N: (-1, 0), E: (0, 1), S: (1, 0), W: (0, -1)}
OPPOSITE = {N: S, S: N, E: W, W: E}
DIR_NAME = {N: 'N', E: 'E', S: 'S', W: 'W'}

SHAPES = ['full', 'courtyard', 'cross', 'diamond', 'circle', 'pillared', 'twin']
ALGORITHMS = ['dfs', 'prim', 'kruskal', 'growing']


# ------------------------------------------------------------------ shapes
def shape_mask(shape, rows, cols):
    """Return a rows x cols grid of booleans: True = part of the haveli."""
    cr, cc = (rows - 1) / 2.0, (cols - 1) / 2.0
    mask = [[True] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            dr, dc = abs(r - cr), abs(c - cc)
            if shape == 'courtyard':
                # an open-air courtyard (solid block) in the middle
                if dr <= rows / 6.0 and dc <= cols / 6.0:
                    mask[r][c] = False
            elif shape == 'cross':
                # the four corners are walled off
                if dr > rows * 0.2 and dc > cols * 0.2:
                    mask[r][c] = False
            elif shape == 'diamond':
                if dr / (rows / 2.0) + dc / (cols / 2.0) > 1.08:
                    mask[r][c] = False
            elif shape == 'circle':
                if (dr / (rows / 2.0)) ** 2 + (dc / (cols / 2.0)) ** 2 > 1.05:
                    mask[r][c] = False
            elif shape == 'pillared':
                # a hall of thick 2x2 stone pillars
                if r % 4 in (1, 2) and c % 4 in (1, 2) and 0 < r < rows - 1 and 0 < c < cols - 1 \
                        and (r // 4 + c // 4) % 2 == 0:
                    mask[r][c] = False
            elif shape == 'twin':
                # two courtyards side by side
                if dr <= rows / 7.0 and (abs(c - cols / 4.0) <= cols / 9.0 or abs(c - 3 * cols / 4.0) <= cols / 9.0):
                    mask[r][c] = False
    return _largest_region(mask, rows, cols)


def _largest_region(mask, rows, cols):
    """Keep only the biggest connected group of cells, so every open cell is reachable."""
    seen = [[False] * cols for _ in range(rows)]
    best = []
    for r in range(rows):
        for c in range(cols):
            if not mask[r][c] or seen[r][c]:
                continue
            region = []
            queue = deque([(r, c)])
            seen[r][c] = True
            while queue:
                y, x = queue.popleft()
                region.append((y, x))
                for dy, dx in DELTA.values():
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < rows and 0 <= nx < cols and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        queue.append((ny, nx))
            if len(region) > len(best):
                best = region
    keep = [[False] * cols for _ in range(rows)]
    for r, c in best:
        keep[r][c] = True
    return keep


# ------------------------------------------------------------------ maze
class Maze:
    def __init__(self, rows, cols, rng=None, braid=0.0, shape='full', algorithm='dfs'):
        self.rows = rows
        self.cols = cols
        self.rng = rng or random.Random()
        self.shape = shape
        self.algorithm = algorithm
        self.open = shape_mask(shape, rows, cols)
        self.grid = [[ALL_WALLS for _ in range(cols)] for _ in range(rows)]
        cells = self.open_cells()
        carve = {'dfs': self._carve_dfs, 'prim': self._carve_prim,
                 'kruskal': self._carve_kruskal, 'growing': self._carve_growing}[algorithm]
        carve(cells)
        if braid > 0:
            self._braid(braid)
        self.start = min(cells, key=lambda rc: (rc[0] + rc[1], rc[0]))
        self.exit, self.exit_wall = self._choose_exit()

    # ------------------------------------------------------------ basics
    def in_bounds(self, r, c):
        return 0 <= r < self.rows and 0 <= c < self.cols

    def is_open(self, r, c):
        return self.in_bounds(r, c) and self.open[r][c]

    def open_cells(self):
        return [(r, c) for r in range(self.rows) for c in range(self.cols) if self.open[r][c]]

    def has_wall(self, r, c, d):
        return bool(self.grid[r][c] & d)

    def remove_wall(self, r, c, d):
        dr, dc = DELTA[d]
        self.grid[r][c] &= ~d
        self.grid[r + dr][c + dc] &= ~OPPOSITE[d]

    def open_directions(self, r, c):
        return [d for d in (N, E, S, W) if not self.has_wall(r, c, d)]

    def wall_count(self, r, c):
        return 4 - len(self.open_directions(r, c))

    def neighbours(self, r, c):
        result = []
        for d, (dr, dc) in DELTA.items():
            if self.is_open(r + dr, c + dc):
                result.append((d, r + dr, c + dc))
        return result

    # ------------------------------------------------------------ carving
    def _carve_dfs(self, cells):
        """Depth-first search: long, winding corridors."""
        visited = set()
        start = self.rng.choice(cells)
        stack = [start]
        visited.add(start)
        while stack:
            r, c = stack[-1]
            choices = [(d, nr, nc) for d, nr, nc in self.neighbours(r, c) if (nr, nc) not in visited]
            if not choices:
                stack.pop()
                continue
            d, nr, nc = self.rng.choice(choices)
            self.remove_wall(r, c, d)
            visited.add((nr, nc))
            stack.append((nr, nc))

    def _carve_prim(self, cells):
        """Randomised Prim: lots of short side branches and dead ends."""
        start = self.rng.choice(cells)
        inside = {start}
        frontier = [(start, d, nr, nc) for d, nr, nc in self.neighbours(*start)]
        while frontier:
            i = self.rng.randrange(len(frontier))
            frontier[i], frontier[-1] = frontier[-1], frontier[i]
            (r, c), d, nr, nc = frontier.pop()
            if (nr, nc) in inside:
                continue
            self.remove_wall(r, c, d)
            inside.add((nr, nc))
            for d2, r2, c2 in self.neighbours(nr, nc):
                if (r2, c2) not in inside:
                    frontier.append(((nr, nc), d2, r2, c2))

    def _carve_kruskal(self, cells):
        """Randomised Kruskal: joins random walls, giving an even, patchy maze."""
        parent = {cell: cell for cell in cells}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        edges = []
        for r, c in cells:
            for d in (E, S):
                dr, dc = DELTA[d]
                if self.is_open(r + dr, c + dc):
                    edges.append((r, c, d))
        self.rng.shuffle(edges)
        for r, c, d in edges:
            dr, dc = DELTA[d]
            a, b = find((r, c)), find((r + dr, c + dc))
            if a != b:
                parent[a] = b
                self.remove_wall(r, c, d)

    def _carve_growing(self, cells):
        """Growing tree: mostly newest-cell (long corridors), sometimes random (decoy branches)."""
        start = self.rng.choice(cells)
        active = [start]
        visited = {start}
        while active:
            i = len(active) - 1 if self.rng.random() < 0.75 else self.rng.randrange(len(active))
            r, c = active[i]
            choices = [(d, nr, nc) for d, nr, nc in self.neighbours(r, c) if (nr, nc) not in visited]
            if not choices:
                active.pop(i)
                continue
            d, nr, nc = self.rng.choice(choices)
            self.remove_wall(r, c, d)
            visited.add((nr, nc))
            active.append((nr, nc))

    def _braid(self, fraction):
        """Knock out a few extra walls to create loops, so the player can dodge Manjulika.
        Walls touching a dead end are left alone so the dead ends survive."""
        candidates = []
        for r, c in self.open_cells():
            for d in (E, S):
                dr, dc = DELTA[d]
                nr, nc = r + dr, c + dc
                if not self.is_open(nr, nc) or not self.has_wall(r, c, d):
                    continue
                if self.wall_count(r, c) >= 3 or self.wall_count(nr, nc) >= 3:
                    continue
                candidates.append((r, c, d))
        self.rng.shuffle(candidates)
        for r, c, d in candidates[: int(len(candidates) * fraction)]:
            self.remove_wall(r, c, d)

    # ------------------------------------------------------------ analysis
    def distances(self, source):
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

    def _choose_exit(self):
        """The exit is the cell on the outer edge of the haveli that is farthest from the start."""
        dist = self.distances(self.start)
        best, best_wall, best_d = None, None, -1
        for r, c in self.open_cells():
            for d in (S, E, N, W):
                dr, dc = DELTA[d]
                if not self.is_open(r + dr, c + dc) and dist[r][c] > best_d:
                    best, best_wall, best_d = (r, c), d, dist[r][c]
        return best, best_wall

    def dead_ends(self):
        result = []
        for r, c in self.open_cells():
            if (r, c) in (self.start, self.exit):
                continue
            if self.wall_count(r, c) == 3:
                result.append((r, c))
        return result

    def breakable_wall(self, r, c, dist_to_exit):
        """The wall that crumbles after a correct answer: the one leading closest to the exit."""
        best, best_dist = [], None
        for d in (N, E, S, W):
            if not self.has_wall(r, c, d):
                continue
            dr, dc = DELTA[d]
            nr, nc = r + dr, c + dc
            if not self.is_open(nr, nc):
                continue
            nd = dist_to_exit[nr][nc]
            if best_dist is None or nd < best_dist:
                best, best_dist = [d], nd
            elif nd == best_dist:
                best.append(d)
        return self.rng.choice(best) if best else None

    def shortest_path_length(self):
        return self.distances(self.start)[self.exit[0]][self.exit[1]]

    def blocked_rows(self):
        """The shape as strings, one per row: '#' = solid stone, '.' = haveli floor."""
        return [''.join('.' if self.open[r][c] else '#' for c in range(self.cols)) for r in range(self.rows)]
