import { hex, type HashState, type HTable } from "../topics/hashSet";

function Table({ t, hb, he, title, faded }: { t: HTable; hb: number | null; he: Record<number, string>; title: string; faded?: boolean }) {
  return (
    <div className={faded ? "ht faded" : "ht"}>
      <div className="ht-title">
        {title} <span className="muted mono">array @ {hex(t.addr)}, {t.buckets.length} slots x 8 bytes</span>
      </div>
      <div className="ht-rows">
        {t.buckets.map((chain, i) => (
          <div key={i} className={i === hb ? "ht-row on" : "ht-row"}>
            <div className="ht-slot">
              <span className="ht-i">[{i}]</span>
              <span className="ht-a">{hex(t.addr + i * 8)}</span>
              <span className="ht-p mono">{chain.length ? "→ " + hex(chain[0].addr) : "null"}</span>
            </div>
            <div className="ht-chain">
              {chain.map((e, j) => (
                <div key={e.addr} className={`ht-node ${he[e.addr] ?? ""}`}>
                  <b>{e.key}</b>
                  <small>{hex(e.addr)}</small>
                  <small className="mono">next {chain[j + 1] ? hex(chain[j + 1].addr) : "null"}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HashViz({ s }: { s: HashState }) {
  const cap = s.table.buckets.length;
  return (
    <div className="stagecol hv">
      <div className="hv-stats mono">
        <span>size {s.count}</span>
        <span>capacity {cap}</span>
        <span>load {(s.count / cap).toFixed(2)}</span>
        <span>allocated {s.bytes} B</span>
        {s.calc && <span className="calc">{s.calc}</span>}
      </div>
      <Table t={s.table} hb={s.hb} he={s.he} title={s.old ? "New table" : "Table"} />
      {s.old && <Table t={s.old} hb={s.ob} he={s.he} title="Old table (being drained)" faded />}
    </div>
  );
}
