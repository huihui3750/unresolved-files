"""CASE 001 V5 approved-topic dialogue adapter.
V5 is a review draft: only uses approved narrative statements, with explicit progression gates.
"""
import json
import re
from pathlib import Path

_RECORDS = json.loads((Path(__file__).parent / 'data' / 'case001_dialogue_v5.json').read_text(encoding='utf-8'))['records']
EVIDENCE_MAP = {'ev_original_plan': 'ev_blueprint'}
REBUTTAL_MAP = {
    'entrance_rebutted': 'sou_entrance',
    'sealing_rebutted': 'sou_seal',
    'whereabouts_rebutted': 'sou_log',
    'ledger_rebutted': 'sou_ledger',
}
TOPICS = {
    'last_seen_rin': ('最後一次見', '最後見', '最後看見', '上次見', '何時見', '什麼時候見', '見過死者', '見過凜', '見到死者', '見到凜'),
    'rin_diary': ('日記', '敲擊', '第三聲'),
    'lawyer_letter_contents': ('律師', '補充信', '信件', '寄信', '那封信', '信裡', '信中'),
    'second_entrance': ('第二入口', '另一個入口', '維修通道', '維修門', '暗門', '原始圖面', '建築圖面'),
    'door_sealing_date': ('封門', '封閉時間', '何時封', '什麼時候封', '施工單', '封板'),
    'soichiro_whereabouts': ('行蹤', '不在場', '書房', '出入紀錄', '去過維修區', '當晚在哪'),
    'ledger_dispute': ('帳冊', '帳務文件', '帳務', '帳本'),
    'strange_sound': ('聲響', '異響', '金屬聲', '暖氣', '管線', '敲擊', '第三聲'),
    'responsibility': ('兇手', '凶手', '殺了', '殺害', '害死', '誰殺', '有罪', '誰負責', '誰該負責'),
    'case_aftermath': ('結案後', '真相揭開後', '現在有什麼感想', '調查結束後'),
}

def identify_topic(question, character):
    """Conservative, evidence-aware topic classification for scripted dialogue.

    Return None rather than choosing a loosely related script. Generic questions
    should be handled by the existing RAG/Gemini pathway.
    """
    if not isinstance(question, str):
        return None
    q = re.sub(r"[\s，。！？、,.!?：:「」『』]", "", question).lower()
    if not q:
        return None

    # Strong intent signals precede broad entity words. '信' alone is too broad;
    # '凜' alone must never select diary or letter content.
    if any(x in q for x in ('最後一次見', '最後見', '最後看見', '最後碰面', '上次見',
                            '何時見到', '何時見過', '什麼時候見到', '什麼時候見過',
                            '最後和凜見面', '最後和死者見面', '最後和姊姊見面',
                            '上回見到', '最後見面', '最後碰到',
                            '案發前見過', '出事前見過', '死前見過', '最後一次碰面', '最後一次遇到', '最後遇到', '最後一次碰到死者', '最後遇見', '上次遇到')):
        return 'last_seen_rin'
    if any(x in q for x in ('律師', '補充信', '那封信', '信件', '信裡', '信中', '寄信', '寄給律師', '律師函')):
        return 'lawyer_letter_contents'
    if any(x in q for x in ('封門', '封板', '封閉時間', '何時封', '什麼時候封', '施工單', '封死', '封起來', '封住門')):
        return 'door_sealing_date'
    if any(x in q for x in ('帳冊', '帳本', '帳務', '帳目', '賬本', '帳簿', '會計紀錄', '財務文件')):
        return 'ledger_dispute'
    if any(x in q for x in ('行蹤', '不在場', '書房', '出入紀錄', '當晚在哪', '那晚在哪', '去哪裡了', '去過維修區', '案發時在哪', '案發當晚在哪')):
        return 'soichiro_whereabouts'
    if any(x in q for x in ('第二入口', '另一個入口', '維修通道', '維修門', '暗門', '原始圖面', '建築圖面', '第二條路', '秘密通道', '側門')):
        return 'second_entrance'
    if any(x in q for x in ('兇手', '凶手', '殺了', '殺害', '害死', '誰殺', '有罪', '誰負責', '誰該負責')):
        return 'responsibility'
    if any(x in q for x in ('結案後', '真相揭開後', '現在有什麼感想', '調查結束後')):
        return 'case_aftermath'
    if any(x in q for x in ('日記', '手記', '筆記本')):
        return 'rin_diary' if character == 'mio' else None
    if any(x in q for x in ('敲擊', '第三聲', '異響', '金屬聲', '暖氣', '管線', '聲響')):
        return 'strange_sound' if character in ('shizue', 'naoto') else 'rin_diary' if character == 'mio' else None
    return None

def scripted_reply(character, question, evidence=None, rebuttals=None, ending_unlocked=False):
    topic = identify_topic(question, character)
    if not topic:
        return None
    if character not in ('mio', 'shizue', 'naoto', 'soichiro'):
        return None
    owned, refuted = set(evidence or ()), set(rebuttals or ())
    candidates = []
    for record in _RECORDS:
        if record['character_id'] != character or record['topic_id'] != topic:
            continue
        required_evidence = {EVIDENCE_MAP.get(x, x) for x in record.get('requires_evidence', ())}
        required_rebuttals = {REBUTTAL_MAP.get(x, x) for x in record.get('requires_rebuttal', ())}
        if not required_evidence.issubset(owned) or not required_rebuttals.issubset(refuted):
            continue
        if record.get('requires_ending') and not ending_unlocked:
            continue
        rank = (3 if record.get('requires_ending') else 0) + (2 if required_rebuttals else 0) + (1 if required_evidence else 0)
        candidates.append((rank, record['reply']))
    if not candidates:
        return None
    return max(candidates, key=lambda x: x[0])[1]


# V8: follow-up answers are scoped to the previous question of the SAME character.
# Do not repeat the previous generic answer or invent details absent from canon.
def contextual_reply(character, question, history=None, evidence=None, rebuttals=None, ending_unlocked=False):
    if character not in ('mio', 'shizue', 'naoto', 'soichiro') or not isinstance(question, str):
        return None
    q = re.sub(r"[\s，。！？、,.!?：:「」『』]", "", question)
    # Explicit new topics always take precedence over dialogue history.
    if identify_topic(question, character):
        return None
    if not isinstance(history, list) or not history:
        return None
    # Only a narrow class of short follow-ups can inherit context.
    followup = any(x in q for x in ('那時候', '當時', '她說了什麼', '他說了什麼', '在哪裡', '在哪', '哪一天', '幾點', '確切時間', '你確定嗎'))
    if not followup or len(q) > 28:
        return None
    previous = None
    for item in reversed(history[-8:]):
        if not isinstance(item, dict) or item.get('role') != 'user':
            continue
        previous = item.get('text')
        break  # do not skip an unrelated user turn
    if not isinstance(previous, str) or len(previous) > 400:
        return None
    if identify_topic(previous, character) != 'last_seen_rin':
        return None
    if any(x in q for x in ('說了什麼', '講了什麼', '說什麼')):
        return {
            'mio': '我記不得最後那次見面，姊姊說過的每一句話。我不想把猜測當成她的原話。',
            'shizue': '我不能確定那是否是最後一次見面，也不能憑印象編出凜小姐當時說的話。',
            'naoto': '我七年前不在山莊，沒有和凜小姐見過面，自然不知道她當時說了什麼。',
            'soichiro': '你問得太細了。七年前的談話，我不打算憑記憶替你重述。',
        }[character]
    if any(x in q for x in ('哪一天', '幾點', '確切時間', '那時候', '當時', '在哪裡', '在哪')):
        return {
            'mio': '最後見面的確切日期、時間與地點，我現在無法確認。',
            'shizue': '我不能確定最後見到凜小姐的準確時間與地點，也不能說自己是最後目擊者。',
            'naoto': '七年前我不在山莊，無法提供見面時間或地點。',
            'soichiro': '我不接受你把不確定的時間當成證據。請先提出能核對的紀錄。',
        }[character]
    if '你確定嗎' in q:
        return {
            'mio': '我能確定的是自己的記憶有限，不能把不確定的細節說成事實。',
            'shizue': '我只能確認親眼見到的部分，其他事情不敢保證。',
            'naoto': '我沒有親眼見到七年前的情況，不能確認。',
            'soichiro': '我已經回答過了；你若有相反的證據，可以拿出來。',
        }[character]
    return None
