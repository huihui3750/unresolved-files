"""CASE001 V11: server-side progression state machine (not an anti-cheat attestation)."""
from dataclasses import dataclass, field

EVIDENCE = {'ev_old_photo','ev_blueprint','ev_inspection_permit','ev_fabric','ev_accident_report','ev_sealing_order','ev_entry_log','ev_shizue_diary','ev_rin_diary','ev_lawyer_letter'}
REBUTTAL = {'sou_entrance':('ev_blueprint',None),'sou_seal':('ev_sealing_order','sou_entrance'),'sou_log':('ev_entry_log','sou_seal'),'sou_ledger':('ev_lawyer_letter','sou_log'),'shizue_presence':('ev_entry_log',None)}

@dataclass
class Progress:
    evidence: set = field(default_factory=set)
    rebuttals: set = field(default_factory=set)
    ending: bool = False

    def apply(self, kind, item):
        if kind == 'evidence':
            if item not in EVIDENCE: return False
            self.evidence.add(item)
            return True
        if kind == 'rebuttal':
            if item not in REBUTTAL: return False
            needed, previous = REBUTTAL[item]
            if needed not in self.evidence or (previous and previous not in self.rebuttals): return False
            self.rebuttals.add(item)
            return True
        if kind == 'ending':
            if item != 'case001' or not {'sou_entrance','sou_seal','sou_log','sou_ledger'}.issubset(self.rebuttals): return False
            self.ending = True
            return True
        return False

    def export(self):
        return {'evidence':sorted(self.evidence),'rebuttals':sorted(self.rebuttals),'endingUnlocked':self.ending}
