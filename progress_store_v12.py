"""CASE001 SQLite progression persistence; integrate only after trusted server event handlers exist."""
import json
import sqlite3
from pathlib import Path
from progress_v11 import Progress

class ProgressStore:
    def __init__(self, database_path):
        target = Path(database_path).expanduser()
        target.parent.mkdir(parents=True, exist_ok=True)
        self.database_path = str(target)
        with self._connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS case_progress (player_id TEXT PRIMARY KEY, state TEXT NOT NULL)')

    def _connect(self):
        return sqlite3.connect(self.database_path, timeout=10)

    def load(self, player_id):
        self._validate_player(player_id)
        with self._connect() as db:
            row = db.execute('SELECT state FROM case_progress WHERE player_id=?', (player_id,)).fetchone()
        if not row:
            return Progress()
        state = json.loads(row[0])
        return Progress(set(state['evidence']), set(state['rebuttals']), bool(state['endingUnlocked']))

    def apply_trusted_event(self, player_id, kind, item):
        """Only call from server-verified actions, NEVER directly from arbitrary client JSON."""
        self._validate_player(player_id)
        with self._connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT state FROM case_progress WHERE player_id=?', (player_id,)).fetchone()
            if row:
                state = json.loads(row[0]); progress = Progress(set(state['evidence']), set(state['rebuttals']), bool(state['endingUnlocked']))
            else:
                progress = Progress()
            if not progress.apply(kind, item):
                return False, progress.export()
            state = progress.export()
            db.execute('INSERT INTO case_progress(player_id,state) VALUES(?,?) ON CONFLICT(player_id) DO UPDATE SET state=excluded.state', (player_id, json.dumps(state, ensure_ascii=False)))
            return True, state

    def reset(self, player_id):
        self._validate_player(player_id)
        with self._connect() as db:
            db.execute('DELETE FROM case_progress WHERE player_id=?', (player_id,))
        return Progress().export()

    @staticmethod
    def _validate_player(player_id):
        if not isinstance(player_id, str) or not 1 <= len(player_id) <= 128:
            raise ValueError('Invalid server-issued player id')
