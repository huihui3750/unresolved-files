"""CASE 001 輕量檢索：只讀角色可說的安全資料，不載入案件最終真相。"""
import json
import re
from pathlib import Path

_KNOWLEDGE = json.loads((Path(__file__).resolve().parent / 'data' / 'case001_public_knowledge.json').read_text(encoding='utf-8'))

def knowledge_priority(entry):
    """同樣相關的知識，以已解鎖的較後階段回答優先。"""
    return (3 if entry.get('requires_ending') else
            2 if entry.get('requires_rebuttals') else
            1 if entry.get('requires_evidence') else 0)

def retrieve(character, question, limit=2, evidence=None, rebuttals=None, ending_unlocked=False):
    """僅檢索目前受訪角色的白名單知識，依命中的關鍵字排序。"""
    if not isinstance(question, str) or character not in _KNOWLEDGE:
        return []
    text = re.sub(r'\s+', '', question.casefold())
    unlocked = set(evidence or ())
    refuted = set(rebuttals or ())
    scored = []
    topic = question_topic(question)
    for entry in _KNOWLEDGE[character]:
        if character == "mio" and any(x in text for x in ("最後一次", "最後見", "上次見")) and entry.get("id") != "last_seen":
            continue
        if topic == "letter" and entry.get("id") not in ("letter", "ledger_letter", "sou_ledger", "letter_contents", "letter_access", "ledger", "ledger_rebutted"):
            continue
        if topic == "diary" and entry.get("id") not in ("diary", "sound", "pipes", "sound_detail"):
            continue
        if not set(entry.get("requires_evidence", ())).issubset(unlocked):
            continue
        if not set(entry.get("requires_rebuttals", ())).issubset(refuted):
            continue
        if entry.get("requires_ending") and not ending_unlocked:
            continue
        hits = [word for word in entry['keywords'] if word.casefold() in text]
        if hits:
            scored.append((len(hits), max(map(len, hits)), knowledge_priority(entry), entry))
    scored.sort(key=lambda item: (-item[1], -item[0], -item[2], item[3]['id']))
    return [entry for _, _, _, entry in scored[:limit]]


# 非案件問題在呼叫 Gemini 之前拒絕；不能只靠模型提示詞判斷。
OFF_TOPIC_REPLY = '這件事與案件無關，我拒絕回答。'
CASE_TERMS = (
    '案件', '案發', '事故', '死亡', '死者', '兇手', '凶手', '殺人', '謀殺', '調查', '證據', '證物',
    '證詞', '證言', '線索', '推理', '真相', '嫌疑', '目擊', '不在場', '當晚', '那晚', '七年前',
    '山莊', '藤原', '凜', '澪', '靜江', '直人', '宗一郎', '松本', '相馬', '東側', '客房',
    '書房', '維修', '管線', '暖氣', '入口', '通道', '夾層', '門框', '封門', '封板', '圖面',
    '施工', '建築', '敲擊', '第三聲', '聲音', '異響', '日記', '帳冊', '帳務', '律師',
    '信件', '補充信', '出入', '行蹤', '紀錄', '照片', '布料', '現場', '房門', '房間',
    '姊姊', '姐姐', '妹妹', '管家', '技師', '管理者', '目睹', '發現', '遺留',
)
# 防止「幫我寫 Python」「你喜歡吃什麼」等包含零星案件詞彙的非調查要求繞過。
UNRELATED_REQUESTS = (
    r'(?:寫|產生|生成|教我|幫我|推薦|介紹|解釋).{0,15}(?:程式|代碼|python|javascript|食譜|作業|數學|英文|翻譯|笑話|歌曲|電影|遊戲攻略)',
    r'(?:天氣|股價|股票|星座|運勢|政治|選舉|新聞|美食|午餐|晚餐|早餐|約會|唱歌|跳舞|自我介紹|幾歲|生日|喜歡吃|興趣|愛好)',
)

def is_case_related(question):
    if not isinstance(question, str):
        return False
    normalized = re.sub(r'\s+', '', question).casefold()
    if any(re.search(pattern, normalized, re.I) for pattern in UNRELATED_REQUESTS):
        return False
    return any(term.casefold() in normalized for term in CASE_TERMS)


# 僅將短追問視為上下文延續；長篇新問題仍需自行包含案件線索。
FOLLOWUP_PATTERN = re.compile(r'^(?:那|然後|後來|所以|可是|但是|接著|之後|當時|為什麼|怎麼|如何|真的|確定|你說的|你剛說的|剛才|還有|詳細|再說|繼續|他|她|那個|這個|那件事|這件事|那裡|那時).{0,24}[？?。！!]?$')
def resolve_question(question, history):
    """只採用同一角色最近一則已確認與案件相關的玩家問題。"""
    if is_case_related(question):
        return question, False
    if not isinstance(question, str) or len(question.strip()) > 28 or not FOLLOWUP_PATTERN.fullmatch(question.strip()):
        return question, False
    if not isinstance(history, list):
        return question, False
    for entry in reversed(history[-8:]):
        if not isinstance(entry, dict) or entry.get('role') != 'user':
            continue
        prior = entry.get('text')
        if isinstance(prior, str) and 1 <= len(prior) <= 400 and is_case_related(prior):
            return prior + '；追問：' + question.strip(), True
        # 最近一次玩家提問離題時，不跨越該提問恢復更舊的上下文。
        break
    return question, False

# 客戶端的蒐證進度只用來縮小可檢索資料，不作為安全授權或結案依據。
KNOWN_EVIDENCE = frozenset({
    'ev_old_photo','ev_blueprint','ev_inspection_permit','ev_fabric',
    'ev_accident_report','ev_sealing_order','ev_entry_log',
    'ev_shizue_diary','ev_rin_diary','ev_lawyer_letter'
})
def validated_evidence(raw):
    if not isinstance(raw, list):
        return []
    return [item for item in raw[:30] if isinstance(item,str) and item in KNOWN_EVIDENCE]

# 角色反駁標記來自遊戲既有 state.rebuttals；僅控制敘事檢索，不作安全授權。
KNOWN_REBUTTALS = frozenset({'sou_entrance', 'sou_seal', 'sou_log', 'sou_ledger'})
def validated_rebuttals(raw):
    if not isinstance(raw, list):
        return []
    return [x for x in raw[:20] if isinstance(x, str) and x in KNOWN_REBUTTALS]

def knowledge_stage(entry):
    if entry.get('requires_ending'):
        return '結案後'
    if entry.get('requires_rebuttals'):
        return '反駁後'
    if entry.get('requires_evidence'):
        return '蒐證後'
    return '初始'


def precise_character_reply(character, question):
    """對時間型的具體問題，避免通用 RAG 答案取代真正回答。
    劇本尚未記錄確切時間時，明確承認未知，不能編造。
    """
    if character != 'mio' or not isinstance(question, str):
        return None
    q = re.sub(r'\s+', '', question)
    last_seen = ('最後一次', '最後見', '最後看', '上次見', '上次看')
    person = ('姊姊', '姐姐', '藤原凜', '凜')
    time = ('什麼時候', '何時', '時間', '幾點', '哪天', '何日', '見到', '看到', '看見')
    if any(t in q for t in last_seen) and any(p in q for p in person) and any(t in q for t in time):
        return '關於最後一次見到姊姊的確切時間，我現在無法確認。我不想把記不清楚的事說成事實。'
    return None


def question_topic(question):
    """以具體證物主題優先，避免『凜』這類人名跨文件誤命中。"""
    if not isinstance(question, str):
        return None
    q = re.sub(r'\s+', '', question)
    if any(x in q for x in ('律師', '補充信', '信件', '寄信', '寄給', '那封信', '封信', '信寫')):
        return 'letter'
    if any(x in q for x in ('日記', '筆記本', '敲擊', '第三聲')):
        return 'diary'
    return None

def topic_safe_reply(character, question, evidence=None):
    """僅回覆可由劇本證實的信件摘要；未取得證物前不洩漏。"""
    if question_topic(question) != 'letter' or character != 'mio':
        return None
    q = re.sub(r'\s+', '', question)
    asks_content = any(t in q for t in ('寫了什麼', '寫什麼', '內容', '提到什麼', '說了什麼', '記載', '信裡', '信中'))
    if not asks_content:
        return None
    if 'ev_lawyer_letter' not in set(evidence or ()):
        return '我聯絡過當年收信的律師，但還沒有拿到能核對的補充信副本，現在不能確定信中寫了什麼。'
    return '姊姊在補充信中寫到，叔父曾由維修區接近客房，並要求她交出帳務文件。但那是姊姊的陳述，仍需要其他證據佐證。'
